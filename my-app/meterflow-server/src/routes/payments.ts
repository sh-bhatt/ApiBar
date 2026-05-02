import crypto from 'crypto'
import { Router } from 'express'
import mongoose from 'mongoose'
import { authMiddleware, type AuthedRequest } from '../middleware/auth'
import { getRazorpay } from '../lib/razorpay'
import { Billing } from '../models/Billing'

const router = Router()

router.use(authMiddleware)

router.post('/create-order', async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    const billingId =
      typeof req.body?.billingId === 'string' ? req.body.billingId.trim() : ''

    if (!mongoose.isValidObjectId(billingId)) {
      res.status(400).json({ error: 'invalid_billing_id' })
      return
    }

    const billing = await Billing.findOne({
      _id: new mongoose.Types.ObjectId(billingId),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!billing) {
      res.status(404).json({ error: 'billing_not_found' })
      return
    }

    if (billing.amountINR < 1) {
      res.status(400).json({ 
        error: 'amount_too_small', 
        message: 'Minimum payable amount is \u20b91.00' 
      })
      return
    }

    const amount = Math.round(billing.amountINR * 100)
    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: billing._id.toString(),
      notes: {
        billingId: billing._id.toString(),
        userId,
        month: billing.month,
      },
    })

    res.json({
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'payment_order_create_failed' })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    const billingId =
      typeof req.body?.billingId === 'string' ? req.body.billingId.trim() : ''
    const razorpayOrderId =
      typeof req.body?.razorpay_order_id === 'string' ? req.body.razorpay_order_id : ''
    const razorpayPaymentId =
      typeof req.body?.razorpay_payment_id === 'string' ? req.body.razorpay_payment_id : ''
    const razorpaySignature =
      typeof req.body?.razorpay_signature === 'string' ? req.body.razorpay_signature : ''

    if (!mongoose.isValidObjectId(billingId)) {
      res.status(400).json({ error: 'invalid_billing_id' })
      return
    }

    const billing = await Billing.findOne({
      _id: new mongoose.Types.ObjectId(billingId),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!billing) {
      res.status(404).json({ error: 'billing_not_found' })
      return
    }

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      res.status(500).json({ error: 'razorpay_not_configured' })
      return
    }

    getRazorpay()

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSignature !== razorpaySignature) {
      res.status(400).json({ error: 'invalid_payment_signature' })
      return
    }

    billing.status = 'paid'
    billing.paymentId = razorpayPaymentId
    await billing.save()

    res.json({
      id: billing._id.toString(),
      status: billing.status,
      paymentId: billing.paymentId,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'payment_verify_failed' })
  }
})

export default router
