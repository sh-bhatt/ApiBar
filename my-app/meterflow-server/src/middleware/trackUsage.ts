import type { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import type { ApiDocument } from '../models/Api'
import { Api } from '../models/Api'
import { ApiKey } from '../models/ApiKey'
import { ConsumerBalance } from '../models/ConsumerBalance'
import { UsageLog } from '../models/UsageLog'
import { tryConsumeHourly } from './rateLimitMemory'

const FINGERPRINT_RE = /^mf_live_([a-fA-F0-9]{32})$/
const INTERNAL_PATH_PREFIXES = ['/api/usage', '/api/keys', '/api/billing', '/api/auth', '/api/apis']

function extractFingerprint(raw: string): string | null {
  const m = FINGERPRINT_RE.exec(raw.trim())
  return m ? m[1].toLowerCase() : null
}

export type MeteredGatewayRequest = Request & {
  meterflowApiKeyId?: string
  meterflowUserId?: string
  meterflowLinkedApi?: (ApiDocument & { _id: mongoose.Types.ObjectId }) | null
}

function isPopulatedApi(
  value: unknown,
): value is ApiDocument & { _id: mongoose.Types.ObjectId } {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'baseUrl' in value &&
    'name' in value
  )
}

/**
 * Validates `x-api-key`, then after the response is sent:
 * - inserts a UsageLog (apiKeyId, userId, method, path, statusCode, latencyMs, timestamp)
 * - increments ApiKey.callCount
 */
export function trackUsage(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint()

  void (async () => {
    const requestPath = req.originalUrl ?? req.url
    if (
      !requestPath.startsWith('/api/v1/') ||
      INTERNAL_PATH_PREFIXES.some((prefix) => requestPath.startsWith(prefix))
    ) {
      next()
      return
    }

    const rawHeader = req.headers['x-api-key']
    const raw = typeof rawHeader === 'string' ? rawHeader : Array.isArray(rawHeader) ? rawHeader[0] : ''

    if (!raw?.trim()) {
      res.status(401).json({ error: 'missing_api_key' })
      return
    }

    const key = raw.trim()
    const fingerprint = extractFingerprint(key)
    if (!fingerprint) {
      res.status(401).json({ error: 'invalid_api_key' })
      return
    }

    const doc = await ApiKey.findOne({ keyFingerprint: fingerprint })
      .populate('apiId')
      .exec()
    if (!doc || doc.status !== 'active') {
      res.status(401).json({ error: 'invalid_or_disabled_api_key' })
      return
    }

    const matches = await bcrypt.compare(key, doc.keyHash)
    if (!matches) {
      res.status(401).json({ error: 'invalid_api_key' })
      return
    }

    const apiKeyIdStr = doc._id.toString()
    const rate = await tryConsumeHourly(apiKeyIdStr, doc.rateLimit)
    if (!rate.ok) {
      res.status(429).json({
        error: 'rate_limit_exceeded',
        limit: rate.limit,
        current: rate.current,
        resetAt: rate.resetAt,
      })
      return
    }

    const apiKeyId = doc._id as mongoose.Types.ObjectId
    const userId = doc.userId as mongoose.Types.ObjectId
    const meteredReq = req as MeteredGatewayRequest

    meteredReq.meterflowApiKeyId = apiKeyId.toString()
    meteredReq.meterflowUserId = userId.toString()
    meteredReq.meterflowLinkedApi = isPopulatedApi(doc.apiId) ? doc.apiId : null

    // Step 1: Get API and consumer balance
    const api = doc.apiId ? await Api.findById(doc.apiId).lean() : null
    let balance = null

    if (api) {
      balance = await ConsumerBalance.findOne({
        userId: doc.userId,
        apiId: api._id,
      })

      // Create balance record if doesn't exist
      if (!balance) {
        balance = await ConsumerBalance.create({
          userId: doc.userId,
          apiId: api._id,
          creditLimit: api.billingConfig?.creditLimit ?? 500,
        })
      }

      // Check if blocked
      if (balance.status === 'blocked') {
        res.status(402).json({
          error: 'account_blocked',
          message: 'Your account is blocked due to unpaid balance. Please pay your outstanding invoice.',
          creditUsed: balance.creditUsed,
          creditLimit: balance.creditLimit,
        })
        return
      }

      // PREPAID PER_REQUEST: Check free tier exhaustion
      if (api.billingConfig?.billingMode === 'prepaid' && api.pricingModel?.type === 'per_request') {
        const freeTierLimit = api.pricingModel?.freeTierLimit ?? 1000
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const requestsThisMonth = await UsageLog.countDocuments({
          apiKeyId: apiKeyId,
          timestamp: { $gte: startOfMonth }
        })

        if (requestsThisMonth >= freeTierLimit && balance.balance <= 0) {
          res.status(402).json({
            error: 'free_tier_exhausted',
            message: 'Free tier exhausted. Please top up your balance to continue.',
            topupUrl: '/dashboard/balance'
          })
          return
        }
      }

      // PREPAID: Check balance
      if (api.billingConfig?.billingMode === 'prepaid') {
        if (balance.balance <= 0) {
          res.status(402).json({
            error: 'insufficient_balance',
            message: 'Insufficient balance. Please top up to continue.',
            balance: balance.balance,
          })
          return
        }
      }

      // POSTPAID: Check credit limit
      if (api.billingConfig?.billingMode === 'postpaid') {
        if (balance.creditUsed >= balance.creditLimit) {
          balance.status = 'blocked'
          balance.blockedAt = new Date()
          balance.blockedReason = 'Credit limit exceeded'
          await balance.save()
          res.status(402).json({
            error: 'credit_limit_exceeded',
            message: 'Credit limit reached. Please pay your outstanding balance.',
            creditUsed: balance.creditUsed,
            creditLimit: balance.creditLimit,
          })
          return
        }
      }
    }

    res.on('finish', () => {
      const end = process.hrtime.bigint()
      const latencyMs = Number((end - start) / 1_000_000n)
      const path = req.originalUrl ?? req.url

      void (async () => {
        try {
          // Step 2: Calculate billing cost
          let billingQuantity = 1
          let billingUnit = api?.billingConfig?.billingUnit ?? 'request'
          let billingCost = 0

          // Note: For token/mb units, we'd need to parse response body
          // This is a simplified implementation
          if (billingUnit === 'token') {
            billingQuantity = 1000 // Default fallback
          } else if (billingUnit === 'mb') {
            billingQuantity = 0.001 // Default fallback
          }

          // Calculate cost based on pricing model
          if (api?.pricingModel) {
            const pm = api.pricingModel
            if (pm.type === 'per_request') {
              billingCost = billingQuantity * (pm.pricePerRequest ?? 0.005)
            } else if (pm.type === 'tiered' && pm.tiers?.length) {
              billingCost = billingQuantity * (pm.tiers[0].pricePerRequest ?? 0.005)
            } else if (pm.type === 'monthly_flat') {
              billingCost = 0 // handled at month end
            }
          }

          // Step 3: Update consumer balance
          if (api && balance) {
            if (api.billingConfig?.billingMode === 'prepaid') {
              await ConsumerBalance.updateOne(
                { userId: doc.userId, apiId: api._id },
                { $inc: { balance: -billingCost } }
              )
            } else if (api.billingConfig?.billingMode === 'postpaid') {
              await ConsumerBalance.updateOne(
                { userId: doc.userId, apiId: api._id },
                { $inc: { creditUsed: billingCost } }
              )
            }
          }

          // Save billing info to UsageLog
          await UsageLog.create({
            apiKeyId,
            apiId: doc.apiId || null,
            userId,
            method: req.method,
            path,
            statusCode: res.statusCode,
            latencyMs: Number.isFinite(latencyMs) ? latencyMs : 0,
            timestamp: new Date(),
            billingUnit,
            billingQuantity,
            billingCost,
          })
          await ApiKey.updateOne({ _id: apiKeyId }, { $inc: { callCount: 1 } })
        } catch (err: unknown) {
          console.error('trackUsage persist failed:', err)
        }
      })()
    })

    next()
  })().catch((err: unknown) => {
    console.error('trackUsage auth failed:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'internal_error' })
    }
  })
}
