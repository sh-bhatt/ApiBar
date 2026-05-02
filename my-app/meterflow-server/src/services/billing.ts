import mongoose from 'mongoose'
import { ApiKey } from '../models/ApiKey'
import { UsageLog } from '../models/UsageLog'
import { Api } from '../models/Api'

const DEFAULT_FREE_REQUESTS_PER_MONTH = 1_000
const PLATFORM_COMMISSION_RATE = Number(process.env.PLATFORM_COMMISSION_RATE) || 0.20

export type PricingTier = {
  upTo: number
  pricePerRequest: number
}

export type PricingModel = {
  type: 'per_request' | 'tiered' | 'monthly_flat' | 'free'
  pricePerRequest?: number
  freeTierLimit?: number
  tiers?: PricingTier[]
  monthlyPrice?: number
  includedRequests?: number
}

export type BillingEstimate = {
  totalRequests: number
  freeRequests: number
  billableRequests: number
  amountINR: number
  month: string
  freeTierLimitApplied: number
  pricingModel: string
  breakdown: Array<{
    apiId: string
    apiName: string
    totalRequests: number
    freeRequests: number
    billableRequests: number
    amountINR: number
    platformCommission: number
    providerEarnings: number
    providerId: string | null
    pricingType: string
  }>
}

function calculateTieredBill(requests: number, tiers: PricingTier[]): number {
  let total = 0
  let remaining = requests
  let previousUpTo = 0

  for (const tier of tiers) {
    if (remaining <= 0) break
    const tierSize = tier.upTo - previousUpTo
    const inThisTier = Math.min(remaining, tierSize)
    total += inThisTier * tier.pricePerRequest
    remaining -= inThisTier
    previousUpTo = tier.upTo
  }

  // Handle requests beyond the last tier
  if (remaining > 0 && tiers.length > 0) {
    const lastTier = tiers[tiers.length - 1]
    total += remaining * lastTier.pricePerRequest
  }

  return Number(total.toFixed(2))
}

function getMonthWindow(now = new Date()): { month: string; start: Date; end: Date } {
  const year = now.getUTCFullYear()
  const monthIndex = now.getUTCMonth()
  const month = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0))

  return { month, start, end }
}

async function calculateBillForApi(
  userId: string,
  apiId: string,
  month: string,
  start: Date,
  end: Date
) {
  const uid = new mongoose.Types.ObjectId(userId)
  const api = await Api.findById(apiId).lean()
  if (!api) return null

  const totalRequests = await UsageLog.countDocuments({
    userId: uid,
    apiId: new mongoose.Types.ObjectId(apiId),
    timestamp: { $gte: start, $lt: end },
  })

  const pricing = api.pricingModel as PricingModel
  let amountINR = 0
  let freeRequests = 0
  let billableRequests = 0

  switch (pricing?.type) {
    case 'free':
      amountINR = 0
      freeRequests = totalRequests
      break

    case 'per_request':
      freeRequests = Math.min(totalRequests, pricing.freeTierLimit ?? 1000)
      billableRequests = Math.max(0, totalRequests - (pricing.freeTierLimit ?? 1000))
      amountINR = billableRequests * (pricing.pricePerRequest ?? 0.005)
      break

    case 'tiered':
      billableRequests = totalRequests
      let remaining = totalRequests
      if (pricing.tiers && pricing.tiers.length > 0) {
        for (const tier of pricing.tiers) {
          if (remaining <= 0) break
          const inTier = Math.min(remaining, tier.upTo)
          amountINR += inTier * tier.pricePerRequest
          remaining -= inTier
        }
        // Handle overflow beyond last tier
        if (remaining > 0 && pricing.tiers.length > 0) {
          const lastTier = pricing.tiers[pricing.tiers.length - 1]
          amountINR += remaining * lastTier.pricePerRequest
        }
      }
      break

    case 'monthly_flat':
      amountINR = pricing.monthlyPrice ?? 0
      freeRequests = Math.min(totalRequests, pricing.includedRequests ?? 0)
      billableRequests = Math.max(0, totalRequests - (pricing.includedRequests ?? 0))
      // Extra requests above included limit charged at base rate
      if (billableRequests > 0) {
        amountINR += billableRequests * 0.005 // default overage rate
      }
      break

    default:
      // Fallback to legacy per-request pricing
      freeRequests = Math.min(totalRequests, 1000)
      billableRequests = Math.max(0, totalRequests - 1000)
      amountINR = billableRequests * 0.005
      break
  }

  const platformCommission = Number((amountINR * PLATFORM_COMMISSION_RATE).toFixed(2))
  const providerEarnings = Number((amountINR - platformCommission).toFixed(2))

  return {
    apiId: api._id.toString(),
    apiName: api.name,
    totalRequests,
    freeRequests,
    billableRequests,
    amountINR: Number(amountINR.toFixed(2)),
    platformCommission,
    providerEarnings,
    providerId: api.userId?.toString() || null,
    pricingType: pricing?.type || 'per_request',
  }
}

export async function calculateBill(userId: string): Promise<BillingEstimate> {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // Get all active keys for this user
  const keys = await ApiKey.find({ userId: new mongoose.Types.ObjectId(userId) }).populate('apiId')

  let totalPostpaidAmount = 0
  let totalRequests = 0
  let freeRequests = 0
  let billableRequests = 0
  const breakdown: BillingEstimate['breakdown'] = []

  for (const key of keys) {
    const api = key.apiId as any
    if (!api) continue

    const billingMode = api.billingConfig?.billingMode ?? 'postpaid'

    // SKIP prepaid APIs — they already paid upfront via topup
    if (billingMode === 'prepaid') continue

    // SKIP free APIs
    if (api.pricingModel?.type === 'free') continue

    // Count requests for this specific API key this month
    const keyRequests = await UsageLog.countDocuments({
      apiKeyId: key._id,
      timestamp: { $gte: startOfMonth, $lt: endOfMonth }
    })

    if (keyRequests === 0) continue

    let keyAmount = 0
    let keyFreeRequests = 0
    let keyBillableRequests = 0

    const pricing = api.pricingModel

    if (pricing?.type === 'per_request') {
      keyFreeRequests = Math.min(keyRequests, pricing.freeTierLimit ?? 1000)
      keyBillableRequests = Math.max(0, keyRequests - keyFreeRequests)
      keyAmount = keyBillableRequests * (pricing.pricePerRequest ?? 0.005)
    } else if (pricing?.type === 'tiered' && pricing.tiers?.length) {
      keyBillableRequests = keyRequests
      let remaining = keyRequests
      for (const tier of pricing.tiers) {
        if (remaining <= 0) break
        const inTier = Math.min(remaining, tier.upTo)
        keyAmount += inTier * tier.pricePerRequest
        remaining -= inTier
      }
    } else if (pricing?.type === 'monthly_flat') {
      // Only charge monthly flat for postpaid monthly flat APIs
      keyAmount = pricing.monthlyPrice ?? 0
      keyFreeRequests = Math.min(keyRequests, pricing.includedRequests ?? 0)
      keyBillableRequests = Math.max(0, keyRequests - keyFreeRequests)
      if (keyBillableRequests > 0) {
        keyAmount += keyBillableRequests * 0.005 // overage rate
      }
    }

    const platformCommission = Number((keyAmount * PLATFORM_COMMISSION_RATE).toFixed(2))
    const providerEarnings = Number((keyAmount - platformCommission).toFixed(2))

    totalPostpaidAmount += keyAmount
    totalRequests += keyRequests
    freeRequests += keyFreeRequests
    billableRequests += keyBillableRequests

    breakdown.push({
      apiId: api._id.toString(),
      apiName: api.name,
      totalRequests: keyRequests,
      freeRequests: keyFreeRequests,
      billableRequests: keyBillableRequests,
      amountINR: Number(keyAmount.toFixed(2)),
      platformCommission,
      providerEarnings,
      providerId: api.userId?.toString() || null,
      pricingType: pricing?.type || 'per_request',
    })
  }

  return {
    month: currentMonth,
    totalRequests,
    freeRequests,
    billableRequests,
    amountINR: Number(totalPostpaidAmount.toFixed(2)),
    freeTierLimitApplied: freeRequests,
    pricingModel: breakdown.map(b => b.pricingType).join(', '),
    breakdown
  }
}
