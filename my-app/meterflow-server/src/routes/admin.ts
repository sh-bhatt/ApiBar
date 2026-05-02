import { Router } from 'express'
import mongoose from 'mongoose'
import { User } from '../models/User'
import { UsageLog } from '../models/UsageLog'
import { ApiKey } from '../models/ApiKey'
import { Api } from '../models/Api'
import { Billing } from '../models/Billing'
import { ConsumerBalance } from '../models/ConsumerBalance'

const router = Router()

// GET /api/admin/users - returns all users with enhanced stats (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.aggregate([
      // Lookup usage logs for request count
      {
        $lookup: {
          from: 'usagelogs',
          localField: '_id',
          foreignField: 'userId',
          as: 'logs'
        }
      },
      // Lookup APIs registered by this user (for providers)
      {
        $lookup: {
          from: 'apis',
          localField: '_id',
          foreignField: 'userId',
          as: 'apisProvided'
        }
      },
      // Lookup API keys owned by this user (for consumers)
      {
        $lookup: {
          from: 'apikeys',
          localField: '_id',
          foreignField: 'userId',
          as: 'apiKeys'
        }
      },
      // Lookup billing for total spend
      {
        $lookup: {
          from: 'billings',
          localField: '_id',
          foreignField: 'userId',
          as: 'billings'
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          name: 1,
          role: 1,
          plan: 1,
          createdAt: 1,
          totalRequests: { $size: '$logs' },
          apisProvided: { $size: '$apisProvided' },
          apisConsuming: {
            $size: {
              $filter: {
                input: '$apiKeys',
                as: 'key',
                cond: { $ne: ['$$key.apiId', null] }
              }
            }
          },
          totalSpend: {
            $sum: '$billings.amountINR'
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ])

    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'failed_to_fetch_users' })
  }
})

// GET /api/admin/stats - returns platform-wide stats (admin only)
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalConsumers,
      totalAdmins,
      totalApis,
      totalRequests,
      totalRevenueAgg
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'consumer' }),
      User.countDocuments({ role: 'admin' }),
      Api.countDocuments(),
      UsageLog.countDocuments(),
      Billing.aggregate([
        { $group: { _id: null, total: { $sum: '$amountINR' } } }
      ])
    ])

    const totalRevenue = totalRevenueAgg[0]?.total || 0

    res.json({
      totalUsers,
      totalProviders,
      totalConsumers,
      totalAdmins,
      totalApis,
      totalRequests,
      totalRevenue
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'failed_to_fetch_stats' })
  }
})

// PATCH /api/admin/users/:id/role - change a user's role (admin only)
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!['admin', 'provider', 'consumer'].includes(role)) {
      return res.status(400).json({ error: 'invalid_role' })
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    res.status(500).json({ error: 'failed_to_update_role' })
  }
})

// GET /api/admin/revenue - returns platform revenue stats (admin only)
router.get('/revenue', async (req, res) => {
  try {
    // Total GMV = all paid invoices + all prepaid topups
    const paidInvoices = await Billing.find({ status: 'paid' })
    const totalInvoiceGMV = paidInvoices.reduce((sum, b) => sum + (b.amountINR ?? 0), 0)

    // Prepaid topups from ConsumerBalance - only count where actual topup happened
    const balances = await ConsumerBalance.find({
      lastTopupAt: { $exists: true, $ne: null }
    })
    const totalTopupGMV = balances.reduce((sum, b) => {
      // balance + creditUsed = original topup amount
      return sum + b.balance + (b.creditUsed ?? 0)
    }, 0)

    const totalGMV = totalInvoiceGMV + totalTopupGMV
    const totalRevenue = totalInvoiceGMV * 0.20 + totalTopupGMV * 0.20
    const totalProviderPayouts = totalInvoiceGMV * 0.80 + totalTopupGMV * 0.80

    const thisMonth = new Date().toISOString().slice(0, 7)
    const thisMonthInvoices = paidInvoices.filter(b => b.month === thisMonth)
    const thisMonthBalances = balances.filter(b =>
      b.lastTopupAt && new Date(b.lastTopupAt).toISOString().slice(0, 7) === thisMonth
    )
    const thisMonthRevenue =
      thisMonthInvoices.reduce((sum, b) => sum + (b.amountINR ?? 0), 0) * 0.20 +
      thisMonthBalances.reduce((sum, b) => sum + b.balance, 0) * 0.20

    res.json({
      totalRevenue,
      totalGMV,
      totalProviderPayouts,
      thisMonthRevenue,
      commissionRate: 0.20,
    })
  } catch (error) {
    console.error('Error fetching revenue stats:', error)
    res.status(500).json({ error: 'failed_to_fetch_revenue' })
  }
})

export default router
