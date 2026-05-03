import { Router } from 'express'
import mongoose from 'mongoose'
import { UsageLog } from '../models/UsageLog'
import { ApiKey } from '../models/ApiKey'
import type { AuthedRequest } from '../middleware/auth'

const router = Router()

router.get('/summary', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const uid = new mongoose.Types.ObjectId(userId)

  // Get total calls and average latency
  const [agg] = await UsageLog.aggregate<{
    totalCalls: number
    avgLatencyMs: number | null
  }>([
    { $match: { userId: uid } },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
  ])

  // Get success and error counts
  const [successErrorAgg] = await UsageLog.aggregate<{
    successCount: number
    errorCount: number
  }>([
    { $match: { userId: uid } },
    {
      $group: {
        _id: null,
        successCount: {
          $sum: {
            $cond: {
              if: { $lt: ['$statusCode', 400] },
              then: 1,
              else: 0,
            },
          },
        },
        errorCount: {
          $sum: {
            $cond: {
              if: { $gte: ['$statusCode', 400] },
              then: 1,
              else: 0,
            },
          },
        },
      },
    },
  ])

  const totalCalls = agg?.totalCalls ?? 0
  const successCount = successErrorAgg?.successCount ?? 0
  const errorCount = successErrorAgg?.errorCount ?? 0
  const avgLatencyMs = agg?.avgLatencyMs != null ? Math.round(agg.avgLatencyMs) : 0

  // Calculate rates
  const successRate = totalCalls > 0 ? (successCount / totalCalls) * 100 : 0
  const errorRate = totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0

  res.json({
    totalCalls,
    avgLatencyMs,
    successRate,
    errorRate,
  })
})

router.get('/logs', async (req, res) => {
  const { userId } = req as unknown as AuthedRequest
  const uid = new mongoose.Types.ObjectId(userId)

  const logs = await UsageLog.find({ userId: uid })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean()

  res.json({
    logs: logs.map((l) => ({
      id: l._id.toString(),
      apiKeyId: l.apiKeyId ? l.apiKeyId.toString() : null,
      method: l.method,
      path: l.path,
      statusCode: l.statusCode,
      latencyMs: l.latencyMs,
      timestamp: l.timestamp,
    })),
  })
})

router.get('/breakdown', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const uid = new mongoose.Types.ObjectId(userId)

    // Define month boundaries for current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Get current month's usage logs grouped by API key
    const usageByKey = await UsageLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(uid),
          timestamp: { $gte: startOfMonth, $lt: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$apiKeyId',
          totalRequests: { $sum: 1 }
        }
      }
    ])

    interface KeyInfo {
  name: string
  pricePerRequest: number
  freeTierLimit: number
}

// Get API keys with their pricing info
    const keys = await ApiKey.find({ userId: uid })
      .select('name pricePerRequest freeTierLimit')
      .lean()

    // Create a map for quick lookup
    const keyMap = new Map<string, KeyInfo>(
      keys.map(k => [k._id.toString(), { name: k.name, pricePerRequest: k.pricePerRequest ?? 0.005, freeTierLimit: k.freeTierLimit ?? 1000 }])
    )

    // Calculate breakdown for each key
    const breakdown = usageByKey.map(usage => {
      const key = usage._id ? keyMap.get(usage._id.toString()) : null
      if (!key) {
        return {
          keyId: usage._id?.toString() || 'unknown',
          keyName: 'Unknown Key',
          requestCount: usage.totalRequests,
          estimatedCost: 0
        }
      }

      const freeRequests = Math.min(usage.totalRequests, key.freeTierLimit)
      const billableRequests = Math.max(0, usage.totalRequests - freeRequests)
      const estimatedCost = billableRequests * (key.pricePerRequest ?? 0.005)

      return {
        keyId: usage._id?.toString() || 'unknown',
        keyName: key.name,
        requestCount: usage.totalRequests,
        freeRequests,
        billableRequests,
        estimatedCost,
        sharePercentage: usageByKey.length > 0 ? (usage.totalRequests / usageByKey.reduce((sum, u) => sum + u.totalRequests, 0)) * 100 : 0
      }
    })

    res.json({
      breakdown: breakdown.sort((a, b) => b.requestCount - a.requestCount),
      totalRequests: usageByKey.reduce((sum, u) => sum + u.totalRequests, 0),
      month: new Date().toISOString().slice(0, 7), // YYYY-MM
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'usage_breakdown_failed' })
  }
})

router.get('/chart', async (req, res) => {
  try {
    const { userId } = req as unknown as AuthedRequest
    const { range = 'day' } = req.query as { range?: 'hour' | 'day' | 'week' | 'month' }
    
    const uid = new mongoose.Types.ObjectId(userId)
    let startTime: Date
    let buckets: Record<string, { label: string, requests: number }> = {}

    switch (range) {
      case 'hour':
        // Last 60 minutes, grouped by minute (IST)
        startTime = new Date(Date.now() - 60 * 60 * 1000)
        // Build 60 minute buckets using simple keys for matching
        for (let i = 59; i >= 0; i--) {
          const d = new Date(Date.now() - i * 60 * 1000)
          const minKey = `${d.getUTCHours()}:${d.getUTCMinutes().toString().padStart(2, '0')}`
          const fullLabel = d.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          })
          buckets[minKey] = { label: fullLabel, requests: 0 }
        }
        break

      case 'day':
        // Last 24 hours, grouped by hour (IST) - use hour-only for matching, full label for display
        startTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
        // Build 24 hourly buckets
        for (let i = 23; i >= 0; i--) {
          const d = new Date(Date.now() - i * 60 * 60 * 1000)
          const hourKey = d.toLocaleString('en-IN', { 
            hour: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
          })
          const fullLabel = d.toLocaleString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
          })
          buckets[hourKey] = { label: fullLabel, requests: 0 }
        }
        break

      case 'week':
        // Last 7 days, grouped by day (IST) - use day-only for matching, full label for display
        startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        // Build 7 daily buckets
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const dayKey = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
          const fullLabel = d.toLocaleDateString('en-IN', { 
            weekday: 'short', month: 'short', day: 'numeric',
            timeZone: 'Asia/Kolkata' 
          })
          buckets[dayKey] = { label: fullLabel, requests: 0 }
        }
        break

      case 'month':
        // Last 30 days, grouped by day (IST) - use day-only for matching, full label for display
        startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        // Build 30 daily buckets
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const dayKey = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
          const fullLabel = d.toLocaleDateString('en-IN', { 
            weekday: 'short', month: 'short', day: 'numeric',
            timeZone: 'Asia/Kolkata' 
          })
          buckets[dayKey] = { label: fullLabel, requests: 0 }
        }
        break

      default:
        return res.status(400).json({ error: 'Invalid range parameter' })
    }

    // Query all logs in the time range
    const logs = await UsageLog.find({
      userId: uid,
      timestamp: { $gte: startTime }
    }).lean()

    console.log('total logs found:', logs.length)
    console.log('time range:', { startTime, range })

    // Fill buckets with actual log counts using IST
    logs.forEach(log => {
      const logDate = new Date(log.timestamp)
      let key: string

      switch (range) {
        case 'hour':
          // Use simple UTC hour:minute format for matching
          key = `${logDate.getUTCHours()}:${logDate.getUTCMinutes().toString().padStart(2, '0')}`
          break
        case 'day':
          // Use hour-only format for matching
          key = logDate.toLocaleString('en-IN', {
            hour: '2-digit', 
            hour12: true,
            timeZone: 'Asia/Kolkata'
          })
          break
        case 'week':
        case 'month':
          // Use day-only format for matching
          key = logDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
          break
        default:
          return
      }

      if (buckets[key]) {
        buckets[key].requests++
      }
    })

    // Convert to response format
    const result = Object.values(buckets)
    
    console.log('sample result:', result.slice(0, 3))
    console.log('non-zero buckets:', result.filter(r => r.requests > 0).length)

    res.json(result)
  } catch (err) {
    console.error('Chart data error:', err)
    res.status(500).json({ error: 'chart_data_failed' })
  }
})

export default router
