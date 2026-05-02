import { Router } from 'express'
import { authMiddleware, type AuthedRequest } from '../middleware/auth'
import { Billing } from '../models/Billing'
import { ConsumerBalance } from '../models/ConsumerBalance'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const notifications = []
    const notificationIds = new Set()
    const { userId } = req as AuthedRequest

    // Check overdue invoices
    const overdueInvoices = await Billing.find({
      userId,
      status: 'unpaid',
      gracePeriodEnd: { $lt: new Date() },
      amountINR: { $gt: 0 }
    })
    overdueInvoices.forEach(inv => {
      const id = inv._id.toString()
      if (notificationIds.has(id)) return // skip duplicates
      notificationIds.add(id)
      notifications.push({
        id,
        type: 'error',
        title: 'Payment Overdue',
        message: `Invoice for ${inv.month} of ₹${inv.amountINR} is overdue`,
        createdAt: inv.gracePeriodEnd,
        read: false,
        link: '/dashboard/invoices'
      })
    })

    // Check low balance (prepaid APIs below 20% of last topup)
    const balances = await ConsumerBalance.find({ userId })
      .populate('apiId', 'name billingConfig')

    // Only process balances where API still exists
    const validBalances = balances.filter(b => b.apiId != null)

    validBalances.forEach(b => {
      const id = b._id.toString()
      if (notificationIds.has(id)) return // skip duplicates

      const apiName = (b.apiId as any)?.name ?? 'Unknown API'
      if (apiName === 'Unknown API') return // skip orphaned balances

      if (b.balance < 50 && b.balance > 0) {
        notificationIds.add(id)
        notifications.push({
          id,
          type: 'warning',
          title: 'Low Balance',
          message: `Your balance for ${apiName} is low: ₹${b.balance.toFixed(2)}`,
          createdAt: new Date(),
          read: false,
          link: '/dashboard/balance'
        })
      }
      if (b.balance <= 0 && b.status === 'active') {
        const emptyId = id + '_empty'
        if (!notificationIds.has(emptyId)) {
          notificationIds.add(emptyId)
          notifications.push({
            id: emptyId,
            type: 'error',
            title: 'Balance Empty',
            message: `Balance for ${apiName} is empty. Top up to continue.`,
            createdAt: new Date(),
            read: false,
            link: '/dashboard/balance'
          })
        }
      }
    })

    // Check upcoming invoices (postpaid - end of month approaching)
    const daysToMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
    if (daysToMonthEnd <= 3) {
      notifications.push({
        id: 'month_end',
        type: 'info',
        title: 'Month End Approaching',
        message: `${daysToMonthEnd} days until your postpaid invoice is generated`,
        createdAt: new Date(),
        read: false,
        link: '/dashboard/invoices'
      })
    }

    res.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'failed_to_fetch_notifications' })
  }
})

export default router
