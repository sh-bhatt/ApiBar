import { Router } from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import type { AuthedRequest } from '../middleware/auth'
import { Api } from '../models/Api'
import { ApiKey } from '../models/ApiKey'
import { User } from '../models/User'
import { ConsumerBalance } from '../models/ConsumerBalance'

const router = Router()

// GET /api/marketplace - Returns all APIs from all providers with pricing info
router.get('/', async (req, res) => {
  try {
    const apis = await Api.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean()

    const marketplaceApis = apis.map((api: any) => ({
      id: api._id.toString(),
      name: api.name,
      description: api.description,
      providerName: api.userId?.name || api.userId?.email || 'Unknown Provider',
      pricingModel: api.pricingModel || {
        type: 'per_request',
        pricePerRequest: 0.005,
        freeTierLimit: 1000,
        tiers: [],
        monthlyPrice: 0,
        includedRequests: 0,
      },
      billingConfig: api.billingConfig || {
        billingMode: 'postpaid',
        billingUnit: 'request',
        creditLimit: 500,
        minimumTopup: 100,
      },
      freeTierLimit: api.pricingModel?.freeTierLimit ?? 1000,
      pricePerRequest: api.pricingModel?.pricePerRequest ?? 0.005,
      createdAt: api.createdAt,
    }))

    res.json({ apis: marketplaceApis })
  } catch (err) {
    console.error('Marketplace fetch error:', err)
    res.status(500).json({ error: 'marketplace_fetch_failed' })
  }
})

// POST /api/marketplace/:apiId/access - Creates an API key for the consumer linked to that API
router.post('/:apiId/access', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const { apiId } = req.params

    if (!mongoose.isValidObjectId(apiId)) {
      return res.status(400).json({ error: 'invalid_api_id' })
    }

    // Find the API
    const api = await Api.findById(apiId).lean()
    if (!api) {
      return res.status(404).json({ error: 'api_not_found' })
    }

    // Get provider info
    const provider = await User.findById(api.userId).lean()

    // Generate a new API key
    const rawKey = `mf_live_${crypto.randomUUID().replace(/-/g, '')}`
    const fingerprint = rawKey.slice(8, 24) // Segment after mf_live_
    const keyHash = await bcrypt.hash(rawKey, 12)
    const maskedKey = `mf_live_${fingerprint.slice(0, 4)}****${fingerprint.slice(-4)}`

    // Create the API key linked to the API
    const apiKey = await ApiKey.create({
      userId: new mongoose.Types.ObjectId(userId),
      apiId: new mongoose.Types.ObjectId(apiId),
      name: `${api.name} Access`,
      keyFingerprint: fingerprint,
      keyHash,
      maskedKey,
      callCount: 0,
      freeTierLimit: api.pricingModel?.freeTierLimit ?? 1000,
      pricePerRequest: api.pricingModel?.pricePerRequest ?? 0.005,
      rateLimit: 1000,
      status: 'active',
    })

    // Create ConsumerBalance for postpaid APIs
    if (api.billingConfig?.billingMode === 'postpaid') {
      await ConsumerBalance.create({
        userId: new mongoose.Types.ObjectId(userId),
        apiId: new mongoose.Types.ObjectId(apiId),
        balance: 0,
        creditUsed: 0,
        creditLimit: api.billingConfig.creditLimit || 500,
        status: 'active',
      })
    }

    res.status(201).json({
      id: apiKey._id.toString(),
      name: apiKey.name,
      key: rawKey,
      maskedKey: apiKey.maskedKey,
      apiId: apiId,
      apiName: api.name,
      providerName: provider?.name || 'Unknown Provider',
      freeTierLimit: apiKey.freeTierLimit,
      pricePerRequest: apiKey.pricePerRequest,
      status: apiKey.status,
      createdAt: apiKey.createdAt,
    })
  } catch (err) {
    console.error('Marketplace access error:', err)
    res.status(500).json({ error: 'marketplace_access_failed' })
  }
})

export default router
