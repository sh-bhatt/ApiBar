import type { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { UsageLog } from '../models/UsageLog'
import type { AuthedRequest } from './auth'

const INTERNAL_PATH_PREFIXES = ['/api/usage', '/api/keys', '/api/billing', '/api/auth', '/api/apis']

/**
 * Records method, path, status code, and latency for JWT-authenticated dashboard routes.
 */
export function trackUsageJwt(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint()
  const { userId } = req as unknown as AuthedRequest
  const path = req.originalUrl ?? req.url

  if (
    !path.startsWith('/api/v1/') ||
    INTERNAL_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    next()
    return
  }

  res.on('finish', () => {
    const end = process.hrtime.bigint()
    const latencyMs = Number((end - start) / 1_000_000n)

    const oid = new mongoose.Types.ObjectId(userId)

    void UsageLog.create({
      userId: oid,
      apiKeyId: null,
      method: req.method,
      path,
      statusCode: res.statusCode,
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : 0,
      timestamp: new Date(),
    }).catch((err: unknown) => {
      console.error('UsageLog create failed:', err)
    })
  })

  next()
}
