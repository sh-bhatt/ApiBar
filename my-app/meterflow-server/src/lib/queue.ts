import { Queue } from 'bullmq'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const billingQueue = new Queue<{ userId: string; month: string }>('billingQueue', {
  connection: { url: redisUrl },
})
