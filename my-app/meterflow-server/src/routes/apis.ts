import { Router } from 'express'
import mongoose from 'mongoose'
import type { AuthedRequest } from '../middleware/auth'
import { Api } from '../models/Api'
import { ApiKey } from '../models/ApiKey'

const router = Router()

function toResponse(doc: {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  name: string
  baseUrl: string
  description: string
  createdAt: Date
}) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    name: doc.name,
    baseUrl: doc.baseUrl,
    description: doc.description,
    createdAt: doc.createdAt,
  }
}

router.get('/', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest

  const apis = await Api.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean()

  res.json({
    apis: apis.map((api) => toResponse(api)),
  })
})

router.post('/', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const baseUrl = typeof req.body?.baseUrl === 'string' ? req.body.baseUrl.trim() : ''
    const description =
      typeof req.body?.description === 'string' ? req.body.description.trim() : ''

    if (!name) {
      res.status(400).json({ error: 'name_required' })
      return
    }

    if (!baseUrl) {
      res.status(400).json({ error: 'base_url_required' })
      return
    }

    // Extract pricing model and billing config from request
    const pricingModel = req.body?.pricingModel
    const billingConfig = req.body?.billingConfig
    const validPricingTypes = ['per_request', 'tiered', 'monthly_flat', 'free']

    console.log('Creating API with billingConfig:', billingConfig)

    const apiData: any = {
      userId: new mongoose.Types.ObjectId(userId),
      name,
      baseUrl,
      description,
    }

    // Add pricing model if provided and valid
    if (pricingModel && validPricingTypes.includes(pricingModel.type)) {
      apiData.pricingModel = {
        type: pricingModel.type,
        pricePerRequest: pricingModel.pricePerRequest ?? 0.005,
        freeTierLimit: pricingModel.freeTierLimit ?? 1000,
        tiers: pricingModel.tiers || [],
        monthlyPrice: pricingModel.monthlyPrice ?? 0,
        includedRequests: pricingModel.includedRequests ?? 0,
      }
    }

    // Add billing config if provided
    if (billingConfig) {
      apiData.billingConfig = billingConfig
    }

    const doc = await Api.create(apiData)

    res.status(201).json(toResponse(doc))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'api_create_failed' })
  }
})

router.get('/:id', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'invalid_api_id' })
    return
  }

  const doc = await Api.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean()

  if (!doc) {
    res.status(404).json({ error: 'api_not_found' })
    return
  }

  res.json(toResponse(doc))
})

router.patch('/:id', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: 'invalid_api_id' })
      return
    }

    const updates: Record<string, string> = {}

    if (typeof req.body?.name === 'string') {
      const name = req.body.name.trim()
      if (!name) {
        res.status(400).json({ error: 'name_required' })
        return
      }
      updates.name = name
    }

    if (typeof req.body?.baseUrl === 'string') {
      const baseUrl = req.body.baseUrl.trim()
      if (!baseUrl) {
        res.status(400).json({ error: 'base_url_required' })
        return
      }
      updates.baseUrl = baseUrl
    }

    if (typeof req.body?.description === 'string') {
      updates.description = req.body.description.trim()
    }

    const doc = await Api.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: updates },
      { returnDocument: 'after' },
    ).lean()

    if (!doc) {
      res.status(404).json({ error: 'api_not_found' })
      return
    }

    res.json(toResponse(doc))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'api_update_failed' })
  }
})

router.delete('/:id', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'invalid_api_id' })
    return
  }

  await ApiKey.updateMany(
    {
      apiId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    },
    { $unset: { apiId: 1 } },
  )

  const result = await Api.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  })

  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'api_not_found' })
    return
  }

  res.status(204).send()
})

export default router
