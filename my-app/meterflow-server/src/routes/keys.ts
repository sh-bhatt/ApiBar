import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import mongoose from 'mongoose'
import { Api } from '../models/Api'
import { ApiKey } from '../models/ApiKey'
import type { AuthedRequest } from '../middleware/auth'
import { getHourlyUsageSnapshot } from '../middleware/rateLimitMemory'

const router = Router()

function isPopulatedApiRef(
  value: unknown,
): value is { _id: mongoose.Types.ObjectId; name: string } {
  return typeof value === 'object' && value !== null && '_id' in value && 'name' in value
}

function maskKey(plaintext: string): string {
  const tail = plaintext.slice(-4)
  return `mf_live_${'*'.repeat(24)}${tail}`
}

function createPlaintextKey(): string {
  return `mf_live_${randomUUID().replace(/-/g, '')}`
}

function extractFingerprint(plaintext: string): string {
  return plaintext.slice('mf_live_'.length)
}

router.get('/:id/usage', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'invalid_key_id' })
    return
  }

  const key = await ApiKey.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  })
    .select('callCount rateLimit freeTierLimit pricePerRequest')
    .lean()

  if (!key) {
    res.status(404).json({ error: 'key_not_found' })
    return
  }

  const { remaining, current, resetAt } = await getHourlyUsageSnapshot(id, key.rateLimit)

  res.json({
    callCount: key.callCount,
    rateLimit: key.rateLimit,
    freeTierLimit: key.freeTierLimit ?? 1000,
    pricePerRequest: key.pricePerRequest ?? 0.005,
    current,
    remaining,
    resetAt,
  })
})

router.get('/', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const keys = await ApiKey.find({ userId: new mongoose.Types.ObjectId(userId) })
    .select('name maskedKey callCount rateLimit freeTierLimit pricePerRequest status createdAt apiId')
    .populate('apiId', 'name pricingModel billingConfig')
    .sort({ createdAt: -1 })
    .lean()

  res.json({
    keys: keys.map((k) => ({
      id: k._id.toString(),
      name: k.name,
      maskedKey: k.maskedKey,
      callCount: k.callCount,
      rateLimit: k.rateLimit,
      freeTierLimit: k.freeTierLimit ?? 1000,
      pricePerRequest: k.pricePerRequest ?? 0.005,
      status: k.status,
      createdAt: k.createdAt,
      apiId: isPopulatedApiRef(k.apiId) ? k.apiId._id.toString() : null,
      linkedApi: isPopulatedApiRef(k.apiId)
        ? {
            id: k.apiId._id.toString(),
            name: k.apiId.name,
            pricingModel: (k.apiId as any)?.pricingModel ?? null,
            billingConfig: (k.apiId as any)?.billingConfig ?? null,
          }
        : null,
    })),
  })
})

router.post('/', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const rateLimit =
      typeof req.body?.rateLimit === 'number' && Number.isFinite(req.body.rateLimit)
        ? Math.max(1, Math.floor(req.body.rateLimit))
        : 1000
    const freeTierLimit =
      typeof req.body?.freeTierLimit === 'number' && Number.isFinite(req.body.freeTierLimit)
        ? Math.max(0, Math.floor(req.body.freeTierLimit))
        : 1000
    const pricePerRequest =
      typeof req.body?.pricePerRequest === 'number' && Number.isFinite(req.body.pricePerRequest)
        ? Math.max(0, Number(req.body.pricePerRequest.toFixed(3)))
        : 0.005

    if (!name) {
      res.status(400).json({ error: 'name_required' })
      return
    }

    const plaintext = createPlaintextKey()
    const keyHash = await bcrypt.hash(plaintext, 12)
    const keyFingerprint = extractFingerprint(plaintext)
    const maskedKey = maskKey(plaintext)

    const doc = await ApiKey.create({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      keyFingerprint,
      keyHash,
      maskedKey,
      callCount: 0,
      freeTierLimit,
      pricePerRequest,
      rateLimit,
      status: 'active',
    })

    res.status(201).json({
      id: doc._id.toString(),
      name: doc.name,
      key: plaintext,
      maskedKey: doc.maskedKey,
      callCount: doc.callCount,
      rateLimit: doc.rateLimit,
      freeTierLimit: doc.freeTierLimit ?? 1000,
      pricePerRequest: doc.pricePerRequest ?? 0.005,
      status: doc.status,
      createdAt: doc.createdAt,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'key_create_failed' })
  }
})

router.post('/:id/rotate', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: 'invalid_key_id' })
      return
    }

    const existing = await ApiKey.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!existing) {
      res.status(404).json({ error: 'key_not_found' })
      return
    }

    const plaintext = createPlaintextKey()
    existing.keyHash = await bcrypt.hash(plaintext, 12)
    existing.keyFingerprint = extractFingerprint(plaintext)
    existing.maskedKey = maskKey(plaintext)

    await existing.save()

    res.json({
      id: existing._id.toString(),
      name: existing.name,
      key: plaintext,
      maskedKey: existing.maskedKey,
      callCount: existing.callCount,
      rateLimit: existing.rateLimit,
      freeTierLimit: existing.freeTierLimit ?? 1000,
      pricePerRequest: existing.pricePerRequest ?? 0.005,
      status: existing.status,
      createdAt: existing.createdAt,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'key_rotate_failed' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: 'invalid_key_id' })
      return
    }

    const { freeTierLimit, pricePerRequest } = req.body || {}
    
    const updates: Record<string, number> = {}

    if (typeof freeTierLimit === 'number' && Number.isFinite(freeTierLimit)) {
      updates.freeTierLimit = Math.max(0, Math.floor(freeTierLimit))
    }

    if (typeof pricePerRequest === 'number' && Number.isFinite(pricePerRequest)) {
      updates.pricePerRequest = Math.max(0, Number(pricePerRequest.toFixed(3)))
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'no_updates_provided' })
      return
    }

    const doc = await ApiKey.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: updates },
      { returnDocument: 'after' },
    )

    if (!doc) {
      res.status(404).json({ error: 'key_not_found' })
      return
    }

    res.json({
      id: doc._id.toString(),
      name: doc.name,
      maskedKey: doc.maskedKey,
      callCount: doc.callCount,
      rateLimit: doc.rateLimit,
      freeTierLimit: doc.freeTierLimit ?? 1000,
      pricePerRequest: doc.pricePerRequest ?? 0.005,
      status: doc.status,
      createdAt: doc.createdAt,
      apiId: doc.apiId ? doc.apiId.toString() : null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'key_update_failed' })
  }
})

router.patch('/:id/bind', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const { id } = req.params
    const apiIdRaw = req.body?.apiId

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: 'invalid_key_id' })
      return
    }

    const apiKey = await ApiKey.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!apiKey) {
      res.status(404).json({ error: 'key_not_found' })
      return
    }

    if (apiIdRaw === null) {
      apiKey.apiId = null
      await apiKey.save()

      res.json({
        id: apiKey._id.toString(),
        apiId: null,
        linkedApi: null,
      })
      return
    }

    if (typeof apiIdRaw !== 'string' || !mongoose.isValidObjectId(apiIdRaw)) {
      res.status(400).json({ error: 'invalid_api_id' })
      return
    }

    const linkedApi = await Api.findOne({
      _id: new mongoose.Types.ObjectId(apiIdRaw),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!linkedApi) {
      res.status(404).json({ error: 'api_not_found' })
      return
    }

    apiKey.apiId = linkedApi._id
    await apiKey.save()

    res.json({
      id: apiKey._id.toString(),
      apiId: linkedApi._id.toString(),
      linkedApi: {
        id: linkedApi._id.toString(),
        name: linkedApi.name,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'key_bind_failed' })
  }
})

router.delete('/:id', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'invalid_key_id' })
    return
  }

  const result = await ApiKey.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  })

  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'key_not_found' })
    return
  }

  res.status(204).send()
})

export default router
