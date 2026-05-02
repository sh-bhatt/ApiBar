import { redis } from '../lib/redis'

const HOUR_MS = 60 * 60 * 1000
const RATE_LIMIT_TTL_SECONDS = 60 * 60

function getCurrentHourBucket(now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hour = String(now.getUTCHours()).padStart(2, '0')
  return `${year}-${month}-${day}-${hour}`
}

function getRateLimitKey(apiKeyId: string, bucket = getCurrentHourBucket()): string {
  return `ratelimit:${apiKeyId}:${bucket}`
}

/** ISO time when the current hourly window ends (next boundary). */
export function nextHourBoundaryIso(): string {
  const next = (Math.floor(Date.now() / HOUR_MS) + 1) * HOUR_MS
  return new Date(next).toISOString()
}

export async function tryConsumeHourly(
  apiKeyId: string,
  limit: number,
):
  Promise<
    | { ok: true; current: number }
    | { ok: false; limit: number; current: number; resetAt: string }
  > {
  await redis.connect().catch((err: unknown) => {
    if (!(err instanceof Error) || err.message !== 'Redis is already connecting/connected') {
      throw err
    }
  })

  const key = getRateLimitKey(apiKeyId)
  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_TTL_SECONDS)
  }

  if (current > limit) {
    return {
      ok: false,
      limit,
      current,
      resetAt: nextHourBoundaryIso(),
    }
  }

  return { ok: true, current }
}

export async function getHourlyUsageSnapshot(
  apiKeyId: string,
  limit: number,
): Promise<{
  remaining: number
  current: number
  resetAt: string
}> {
  await redis.connect().catch((err: unknown) => {
    if (!(err instanceof Error) || err.message !== 'Redis is already connecting/connected') {
      throw err
    }
  })

  const key = getRateLimitKey(apiKeyId)
  const raw = await redis.get(key)
  const current = raw ? Number(raw) : 0

  return {
    remaining: Math.max(0, limit - current),
    current,
    resetAt: nextHourBoundaryIso(),
  }
}
