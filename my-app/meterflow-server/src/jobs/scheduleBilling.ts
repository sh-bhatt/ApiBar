import { billingQueue } from '../lib/queue'
import { User } from '../models/User'

const DAY_MS = 24 * 60 * 60 * 1000

function getCurrentMonth(now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

async function enqueueBillingForAllUsers(): Promise<void> {
  const users = await User.find({}).select('_id').lean()
  const month = getCurrentMonth()

  await Promise.all(
    users.map((user) =>
      billingQueue.add(
        'generate-billing',
        {
          userId: user._id.toString(),
          month,
        },
        {
          jobId: `billing-${user._id.toString()}-${month}`,
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      ),
    ),
  )

  console.log(`Scheduled billing jobs for ${users.length} users (${month})`)
}

let schedulerStarted = false

export async function startBillingScheduler(): Promise<void> {
  if (schedulerStarted) {
    return
  }

  schedulerStarted = true
  await enqueueBillingForAllUsers()

  setInterval(() => {
    void enqueueBillingForAllUsers().catch((err) => {
      console.error('Billing scheduler failed:', err)
    })
  }, DAY_MS)
}
