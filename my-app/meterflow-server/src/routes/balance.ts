import { Router } from 'express'
import { ConsumerBalance } from '../models/ConsumerBalance'
import { Api } from '../models/Api'
import type { AuthedRequest } from '../middleware/auth'
import { getRazorpay } from '../lib/razorpay'
import crypto from 'crypto'

const router = Router()

// GET /api/balance — get all balances for logged-in consumer
router.get('/', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const balances = await ConsumerBalance.find({ userId })
    .populate('apiId', 'name billingConfig pricingModel')
  res.json(balances)
})

// GET /api/balance/:apiId — get balance for specific API
router.get('/:apiId', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const balance = await ConsumerBalance.findOne({
    userId,
    apiId: req.params.apiId,
  }).populate('apiId', 'name billingConfig pricingModel')
  if (!balance) return res.status(404).json({ error: 'balance_not_found' })
  res.json(balance)
})

// POST /api/balance/:apiId/topup — create Razorpay order for topup
router.post('/:apiId/topup', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const { amount } = req.body // amount in INR
  const api = await Api.findById(req.params.apiId)
  if (!api) return res.status(404).json({ error: 'api_not_found' })

  const minimumTopup = api.billingConfig?.minimumTopup ?? 100
  if (amount < minimumTopup) {
    return res.status(400).json({
      error: 'amount_too_small',
      message: `Minimum topup is ₹${minimumTopup}`,
    })
  }

  const razorpay = getRazorpay()
  const order = await razorpay.orders.create({
    amount: amount * 100, // paise
    currency: 'INR',
    notes: { userId: userId.toString(), apiId: req.params.apiId, type: 'topup' },
  })
  res.json({ orderId: order.id, amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID })
})

// POST /api/balance/:apiId/topup/verify — verify payment and add credits
router.post('/:apiId/topup/verify', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body

  const sign = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(sign)
    .digest('hex')

  if (expectedSign !== razorpay_signature) {
    return res.status(400).json({ error: 'invalid_signature' })
  }

  // Add credits to consumer balance
  await ConsumerBalance.findOneAndUpdate(
    { userId, apiId: req.params.apiId },
    {
      $inc: { balance: amount },
      lastTopupAt: new Date(),
      status: 'active', // unblock if was blocked
    },
    { upsert: true }
  )
  res.json({ success: true, message: `₹${amount} added to your balance` })
})

// POST /api/balance/:apiId/pay-outstanding — pay postpaid outstanding
router.post('/:apiId/pay-outstanding', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const balance = await ConsumerBalance.findOne({
    userId,
    apiId: req.params.apiId,
  })
  if (!balance || balance.creditUsed <= 0) {
    return res.status(400).json({ error: 'no_outstanding_balance' })
  }

  const razorpay = getRazorpay()
  const order = await razorpay.orders.create({
    amount: Math.ceil(balance.creditUsed) * 100,
    currency: 'INR',
    notes: { userId: userId.toString(), apiId: req.params.apiId, type: 'outstanding' },
  })
  res.json({ orderId: order.id, amount: balance.creditUsed, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID })
})

export default router
