import { Router } from 'express'
import { Billing } from '../models/Billing'
import { Api } from '../models/Api'
import type { AuthedRequest } from '../middleware/auth'

const router = Router()
const PLATFORM_COMMISSION = parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '0.20')

// GET /api/earnings/summary — provider's earnings summary
router.get('/summary', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const apis = await Api.find({ userId })
  const apiIds = apis.map((a) => a._id)

  const billings = await Billing.find({
    providerId: userId,
    status: 'paid',
  })

  const totalEarned = billings.reduce((sum, b) => sum + (b.providerEarnings ?? 0), 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthEarnings = billings
    .filter((b) => b.month === thisMonth)
    .reduce((sum, b) => sum + (b.providerEarnings ?? 0), 0)

  const pendingBillings = await Billing.find({
    providerId: userId,
    status: 'unpaid',
    amountINR: { $gt: 0 },
  })
  const pendingPayout = pendingBillings.reduce((sum, b) => sum + (b.providerEarnings ?? 0), 0)

  res.json({
    totalEarned,
    thisMonthEarnings,
    pendingPayout,
    commissionRate: PLATFORM_COMMISSION,
    totalApis: apis.length,
  })
})

// GET /api/earnings/history — provider's earnings history
router.get('/history', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const billings = await Billing.find({ providerId: userId }).sort({ generatedAt: -1 }).limit(50)
  res.json(billings)
})

export default router
