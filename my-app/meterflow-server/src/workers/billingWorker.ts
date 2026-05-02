import mongoose from 'mongoose'
import { Worker } from 'bullmq'
import { billingQueue } from '../lib/queue'
import { Billing } from '../models/Billing'
import { calculateBill } from '../services/billing'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const COMMISSION = parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '0.20')

let billingWorker: Worker<{ userId: string; month: string }> | null = null

export function startBillingWorker(): Worker<{ userId: string; month: string }> {
  if (billingWorker) {
    return billingWorker
  }

  billingWorker = new Worker(
    billingQueue.name,
    async (job) => {
      const { userId, month } = job.data
      const bill = await calculateBill(userId)

      // Skip users with zero postpaid usage (only prepaid/free APIs)
      if (bill.amountINR === 0 || bill.breakdown.length === 0) {
        console.log(`Skipping invoice for user ${userId} - no postpaid usage (${month})`)
        return
      }

      // Calculate commission
      const platformCommission = Number((bill.amountINR * COMMISSION).toFixed(2))
      const providerEarnings = Number((bill.amountINR - platformCommission).toFixed(2))

      // Get first API's providerId from breakdown for simplicity
      const firstBreakdown = bill.breakdown[0]
      const apiId = firstBreakdown?.apiId ? new mongoose.Types.ObjectId(firstBreakdown.apiId) : null
      const providerId = firstBreakdown?.providerId ? new mongoose.Types.ObjectId(firstBreakdown.providerId) : null

      await Billing.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(userId),
          month,
        },
        {
          $set: {
            totalRequests: bill.totalRequests,
            freeRequests: bill.freeRequests,
            billableRequests: bill.billableRequests,
            amountINR: bill.amountINR,
            platformCommission,
            providerEarnings,
            apiId,
            providerId,
            breakdown: bill.breakdown,
            generatedAt: new Date(),
          },
          $setOnInsert: {
            status: 'unpaid',
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
        },
      )

      console.log(`Billing job completed for user ${userId} (${month})`)
    },
    {
      connection: { url: redisUrl },
    },
  )

  billingWorker.on('completed', async (job) => {
    const { userId, month } = job.data

    // Set due date 7 days from now
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const gracePeriodEnd = new Date()
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)

    // Update billing with due date
    await Billing.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), month },
      { dueDate, gracePeriodEnd }
    )
  })

  billingWorker.on('failed', (job, err) => {
    console.error(`Billing job failed for ${job?.data.userId ?? 'unknown user'}:`, err)
  })

  billingWorker.on('error', (err) => {
    console.error('Billing worker error:', err)
  })

  return billingWorker
}
