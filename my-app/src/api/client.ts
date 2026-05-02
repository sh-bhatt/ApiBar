import axios, { type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import {
  mockApiKeys,
  mockDailyVolume,
  mockDashboardSummary,
  mockInvoices,
  mockMonthlyUsage,
  mockRecentRequests,
} from './mockData'
import type { ApiKeyRow } from './types'

let keysState: ApiKeyRow[] = mockApiKeys.map((k) => ({ ...k }))

function joinUrl(base: string | undefined, path: string | undefined): string {
  const b = (base ?? '').replace(/\/$/, '')
  const p = (path ?? '').replace(/^\//, '')
  if (!b) return `/${p}`
  return `${b}/${p}`
}

const mockAdapter: AxiosAdapter = async (config) => {
  await new Promise((r) => setTimeout(r, 60))
  const full = joinUrl(config.baseURL, config.url)
  const pathname = full.split('?')[0]
  const method = (config.method ?? 'get').toUpperCase()

  if (method === 'GET' && pathname.endsWith('/dashboard/summary')) {
    return buildResponse(config, mockDashboardSummary)
  }
  if (method === 'GET' && pathname.endsWith('/dashboard/requests/daily')) {
    return buildResponse(config, { days: mockDailyVolume })
  }
  if (method === 'GET' && pathname.endsWith('/dashboard/requests/recent')) {
    return buildResponse(config, { items: mockRecentRequests })
  }
  if (method === 'GET' && pathname.endsWith('/keys')) {
    return buildResponse(config, { keys: keysState })
  }
  if (method === 'POST' && /\/keys\/[^/]+\/revoke$/.test(pathname)) {
    const id = pathname.match(/\/keys\/([^/]+)\/revoke$/)?.[1]
    if (id) {
      keysState = keysState.map((k) =>
        k.id === id ? { ...k, status: 'revoked' as const } : k,
      )
    }
    return buildResponse(config, { ok: true })
  }
  if (method === 'GET' && pathname.endsWith('/usage/monthly')) {
    return buildResponse(config, mockMonthlyUsage)
  }
  if (method === 'GET' && pathname.endsWith('/invoices')) {
    return buildResponse(config, { invoices: mockInvoices })
  }

  const err = new Error(`Mock API: no handler for ${method} ${pathname}`)
  return Promise.reject(err)
}

function buildResponse<T>(config: InternalAxiosRequestConfig, data: T) {
  const response = {
    data,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
  }
  return Promise.resolve(response)
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  adapter: mockAdapter,
})
