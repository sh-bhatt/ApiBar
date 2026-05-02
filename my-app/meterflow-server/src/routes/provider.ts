import { Router } from 'express'
import mongoose from 'mongoose'
import type { AuthedRequest } from '../middleware/auth'
import { Billing } from '../models/Billing'

const router = Router()

// GET /api/provider/earnings - returns provider earnings stats (provider only)
router.get('/earnings', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const uid = new mongoose.Types.ObjectId(userId)

    const currentMonth = new Date()
    const year = currentMonth.getUTCFullYear()
    const monthIndex = currentMonth.getUTCMonth()
    const currentMonthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`

    const [
      thisMonthEarningsAgg,
      pendingPayoutsAgg,
      payoutHistoryAgg
    ] = await Promise.all([
      Billing.aggregate([
        {
          $match: {
            providerId: uid,
            month: currentMonthStr
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$providerEarnings' },
            totalCommission: { $sum: '$platformCommission' },
            totalRequests: { $sum: '$totalRequests' }
          }
        }
      ]),
      Billing.aggregate([
        {
          $match: {
            providerId: uid,
            status: 'unpaid'
          }
        },
        {
          $group: {
            _id: null,
            pendingAmount: { $sum: '$providerEarnings' }
          }
        }
      ]),
      Billing.aggregate([
        {
          $match: {
            providerId: uid,
            status: 'paid'
          }
        },
        {
          $group: {
            _id: '$month',
            month: { $first: '$month' },
            earnings: { $sum: '$providerEarnings' },
            commission: { $sum: '$platformCommission' },
            requests: { $sum: '$totalRequests' }
          }
        },
        {
          $sort: { month: -1 }
        },
        {
          $limit: 12
        }
      ])
    ])

    const thisMonthEarnings = thisMonthEarningsAgg[0] || {
      totalEarnings: 0,
      totalCommission: 0,
      totalRequests: 0
    }
    const pendingPayouts = pendingPayoutsAgg[0]?.pendingAmount || 0

    res.json({
      thisMonth: {
        month: currentMonthStr,
        totalEarnings: thisMonthEarnings.totalEarnings,
        totalCommission: thisMonthEarnings.totalCommission,
        totalRequests: thisMonthEarnings.totalRequests
      },
      pendingPayouts,
      payoutHistory: payoutHistoryAgg.map(item => ({
        month: item.month,
        earnings: item.earnings,
        commission: item.commission,
        requests: item.requests
      }))
    })
  } catch (error) {
    console.error('Error fetching provider earnings:', error)
    res.status(500).json({ error: 'failed_to_fetch_earnings' })
  }
})

export default router
