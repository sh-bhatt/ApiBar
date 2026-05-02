import { Billing } from '../models/Billing'
import { ApiKey } from '../models/ApiKey'
import { ConsumerBalance } from '../models/ConsumerBalance'

export async function enforceOverduePayments() {
  const now = new Date()

  // Find all overdue unpaid invoices past grace period
  const overdueInvoices = await Billing.find({
    status: 'unpaid',
    gracePeriodEnd: { $lt: now },
    autoBlocked: false,
    amountINR: { $gt: 0 },
  })

  for (const invoice of overdueInvoices) {
    // Block all API keys for this user
    await ApiKey.updateMany({ userId: invoice.userId }, { status: 'disabled' })

    // Block all consumer balances
    await ConsumerBalance.updateMany(
      { userId: invoice.userId },
      {
        status: 'blocked',
        blockedAt: now,
        blockedReason: 'Overdue invoice - payment required',
      }
    )

    // Mark invoice as auto-blocked
    await Billing.findByIdAndUpdate(invoice._id, { autoBlocked: true })

    console.log(`Auto-blocked user ${invoice.userId} for overdue invoice ${invoice._id}`)
  }

  // Unblock users who have paid
  const paidInvoices = await Billing.find({
    status: 'paid',
    autoBlocked: true,
  })

  for (const invoice of paidInvoices) {
    // Re-enable their API keys
    await ApiKey.updateMany({ userId: invoice.userId }, { status: 'active' })

    // Unblock consumer balances
    await ConsumerBalance.updateMany({ userId: invoice.userId }, { status: 'active' })

    await Billing.findByIdAndUpdate(invoice._id, { autoBlocked: false })
    console.log(`Unblocked user ${invoice.userId} after payment`)
  }
}
