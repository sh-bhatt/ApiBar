import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { connectDb } from './lib/db'
import { enforceOverduePayments } from './jobs/enforcePayments'
import { startBillingScheduler } from './jobs/scheduleBilling'
import { authMiddleware } from './middleware/auth'
import { requireRole } from './middleware/requireRole'
import { trackUsage } from './middleware/trackUsage'
import { trackUsageJwt } from './middleware/trackUsageJwt'
import adminRoutes from './routes/admin'
import apisRoutes from './routes/apis'
import authRoutes from './routes/auth'
import balanceRouter from './routes/balance'
import billingRouter from './routes/billing'
import earningsRouter from './routes/earnings'
import keysRoutes from './routes/keys'
import marketplaceRoutes from './routes/marketplace'
import notificationsRouter from './routes/notifications'
import paymentsRouter from './routes/payments'
import providerRoutes from './routes/provider'
import usageRoutes from './routes/usage'
import userRoutes from './routes/user'
import v1Routes from './routes/v1'
import { ConsumerBalance } from './models/ConsumerBalance'
import { Api } from './models/Api'
import { startBillingWorker } from './workers/billingWorker'

const app = express()
const PORT = Number(process.env.PORT) || 5000

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true)

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
    ]

    // Allow any Vercel subdomain
    if (origin.endsWith('.vercel.app')) return callback(null, true)

    // Allow specific origins
    if (allowedOrigins.includes(origin)) return callback(null, true)

    // Allow FRONTEND_URL from env
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return callback(null, true)

    callback(null, true) // Allow all for now during development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'meterflow' })
})

app.use('/api/auth', authRoutes)

app.use('/api/admin', authMiddleware, requireRole('admin'), adminRoutes)
app.use('/api/apis', authMiddleware, trackUsageJwt, apisRoutes)
app.use('/api/balance', authMiddleware, balanceRouter)
app.use('/api/billing', billingRouter)
app.use('/api/earnings', authMiddleware, earningsRouter)
app.use('/api/keys', authMiddleware, trackUsageJwt, keysRoutes)
app.use('/api/marketplace', authMiddleware, marketplaceRoutes)
app.use('/api/notifications', authMiddleware, notificationsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/provider', authMiddleware, requireRole('provider'), providerRoutes)
app.use('/api/usage', authMiddleware, trackUsageJwt, usageRoutes)
app.use('/api', userRoutes)

app.use('/api/v1', trackUsage, v1Routes)

async function main(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in environment.')
    process.exit(1)
  }
  if (!process.env.JWT_SECRET) {
    console.error('Missing JWT_SECRET in environment.')
    process.exit(1)
  }

  await connectDb(mongoUri)
  console.log('Connected to MongoDB')

  // Clean up ConsumerBalance records pointing to deleted APIs
  try {
    const allApis = await Api.find({}).select('_id')
    const validApiIds = allApis.map((a) => a._id.toString())
    const deleteResult = await ConsumerBalance.deleteMany({
      apiId: { $nin: validApiIds }
    })
    if (deleteResult.deletedCount > 0) {
      console.log(`Cleaned up ${deleteResult.deletedCount} orphaned ConsumerBalance records`)
    }
  } catch (err) {
    console.error('Error cleaning up orphaned ConsumerBalance records:', err)
  }

  startBillingWorker()
  await startBillingScheduler()

  // Run payment enforcement daily
  setInterval(enforceOverduePayments, 24 * 60 * 60 * 1000) // every 24 hours
  enforceOverduePayments() // run once on startup

  app.listen(PORT, () => {
    console.log(`MeterFlow API listening on http://localhost:${PORT}`)
  })
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
