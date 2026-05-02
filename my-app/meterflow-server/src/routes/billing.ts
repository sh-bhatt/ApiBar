import { Router } from 'express'
import mongoose from 'mongoose'
import { authMiddleware, type AuthedRequest } from '../middleware/auth'
import { Billing } from '../models/Billing'
import { ConsumerBalance } from '../models/ConsumerBalance'
import { calculateBill } from '../services/billing'

const router = Router()

router.use(authMiddleware)

router.get('/current', async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    const bill = await calculateBill(userId)
    res.json(bill)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'billing_estimate_failed' })
  }
})

router.post('/generate', async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    const bill = await calculateBill(userId)
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // Check if user has postpaid usage
    if (bill.amountINR === 0 && bill.totalRequests === 0) {
      return res.status(400).json({
        error: 'no_postpaid_usage',
        message: 'No postpaid API usage found for this month. Prepaid APIs are billed via topup.'
      })
    }

    const existing = await Billing.findOne({
      userId: userObjectId,
      month: bill.month,
    })

    const doc = existing
      ? await Billing.findOneAndUpdate(
          {
            _id: existing._id,
          },
          {
            $set: {
              totalRequests: bill.totalRequests,
              freeRequests: bill.freeRequests,
              billableRequests: bill.billableRequests,
              amountINR: bill.amountINR,
              breakdown: bill.breakdown,
              billingType: 'postpaid',
              generatedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        )
      : await Billing.create({
          userId: userObjectId,
          ...bill,
          status: 'unpaid',
          billingType: 'postpaid',
          generatedAt: new Date(),
        })

    if (!doc) {
      res.status(500).json({ error: 'billing_generate_failed' })
      return
    }

    res.status(201).json({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      month: doc.month,
      totalRequests: doc.totalRequests,
      freeRequests: doc.freeRequests,
      billableRequests: doc.billableRequests,
      amountINR: doc.amountINR,
      status: doc.status,
      generatedAt: doc.generatedAt,
      breakdown: doc.breakdown,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'billing_generate_failed' })
  }
})

router.get('/invoices', async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    const docs = await Billing.find({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [
        { billingType: { $exists: false } }, // old records
        { billingType: 'postpaid' }           // explicitly postpaid
      ],
      amountINR: { $gt: 0 } // hide ₹0 invoices
    })
      .sort({ generatedAt: -1 })
      .lean()

    res.json({
      invoices: docs.map((doc) => ({
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        month: doc.month,
        totalRequests: doc.totalRequests,
        freeRequests: doc.freeRequests,
        billableRequests: doc.billableRequests,
        amountINR: doc.amountINR,
        status: doc.status,
        generatedAt: doc.generatedAt,
        breakdown: doc.breakdown,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'billing_invoices_failed' })
  }
})

router.get('/payment-history', async (req, res) => {
  try {
    const { userId } = req as AuthedRequest
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // Get prepaid topup history from ConsumerBalance
    const balances = await ConsumerBalance.find({
      userId: userObjectId,
      lastTopupAt: { $exists: true }
    }).populate('apiId', 'name billingConfig pricingModel')

    const topupHistory = balances.map(b => ({
      id: b._id.toString(),
      type: 'prepaid_topup',
      apiName: (b.apiId as any)?.name ?? 'Unknown API',
      amount: b.balance + (b.creditUsed ?? 0),
      date: b.lastTopupAt,
      status: 'paid',
      currentBalance: b.balance
    }))

    // Also get paid postpaid invoices
    const paidInvoices = await Billing.find({
      userId: userObjectId,
      status: 'paid'
    })

    const invoiceHistory = paidInvoices.map(inv => ({
      id: inv._id.toString(),
      type: 'postpaid_invoice',
      apiName: 'Multiple APIs',
      amount: inv.amountINR,
      date: inv.paidAt ?? inv.generatedAt,
      status: 'paid',
      month: inv.month
    }))

    // Combine and sort by date
    const allHistory = [...topupHistory, ...invoiceHistory]
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())

    res.json(allHistory)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'payment_history_failed' })
  }
})

export default router
