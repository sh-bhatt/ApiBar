import type {
  ApiKeyRow,
  DailyRequestVolume,
  DashboardSummary,
  InvoiceRow,
  MonthlyUsageByKey,
  RequestLogEntry,
} from './types'

export const mockDashboardSummary: DashboardSummary = {
  totalRequests: 1_284_902,
  activeKeys: 12,
  avgLatencyMs: 47,
  estimatedBillCents: 428_50,
}

export const mockDailyVolume: DailyRequestVolume[] = [
  { date: '2026-04-13', label: 'Apr 13', count: 142_100 },
  { date: '2026-04-14', label: 'Apr 14', count: 156_200 },
  { date: '2026-04-15', label: 'Apr 15', count: 138_400 },
  { date: '2026-04-16', label: 'Apr 16', count: 171_800 },
  { date: '2026-04-17', label: 'Apr 17', count: 159_300 },
  { date: '2026-04-18', label: 'Apr 18', count: 148_900 },
  { date: '2026-04-19', label: 'Apr 19', count: 168_202 },
]

export const mockRecentRequests: RequestLogEntry[] = [
  {
    id: 'req_8k2m',
    at: '2026-04-19T14:32:01.442Z',
    method: 'POST',
    path: '/v1/embeddings',
    status: 200,
    latencyMs: 38,
  },
  {
    id: 'req_8k2l',
    at: '2026-04-19T14:31:58.901Z',
    method: 'GET',
    path: '/v1/usage',
    status: 200,
    latencyMs: 12,
  },
  {
    id: 'req_8k2k',
    at: '2026-04-19T14:31:55.120Z',
    method: 'POST',
    path: '/v1/chat/completions',
    status: 429,
    latencyMs: 6,
  },
  {
    id: 'req_8k2j',
    at: '2026-04-19T14:31:50.003Z',
    method: 'POST',
    path: '/v1/chat/completions',
    status: 200,
    latencyMs: 214,
  },
  {
    id: 'req_8k2i',
    at: '2026-04-19T14:31:44.771Z',
    method: 'GET',
    path: '/v1/models',
    status: 200,
    latencyMs: 19,
  },
]

export const mockApiKeys: ApiKeyRow[] = [
  {
    id: 'key_prod_01',
    name: 'Production — edge',
    maskedValue: 'mf_live_••••••••••••8f3a',
    status: 'active',
    callCount: 842_100,
  },
  {
    id: 'key_prod_02',
    name: 'Production — batch',
    maskedValue: 'mf_live_••••••••••••2c91',
    status: 'active',
    callCount: 310_400,
  },
  {
    id: 'key_stg_01',
    name: 'Staging',
    maskedValue: 'mf_test_••••••••••••9aa0',
    status: 'active',
    callCount: 98_200,
  },
  {
    id: 'key_legacy',
    name: 'Legacy (rotated)',
    maskedValue: 'mf_live_••••••••••••0000',
    status: 'revoked',
    callCount: 34_202,
  },
]

export const mockMonthlyUsage: MonthlyUsageByKey = {
  month: 'April',
  year: 2026,
  rows: [
    {
      keyId: 'key_prod_01',
      keyName: 'Production — edge',
      requests: 842_100,
      costCents: 281_200,
      percentOfTotal: 65.5,
    },
    {
      keyId: 'key_prod_02',
      keyName: 'Production — batch',
      requests: 310_400,
      costCents: 103_800,
      percentOfTotal: 24.2,
    },
    {
      keyId: 'key_stg_01',
      keyName: 'Staging',
      requests: 98_200,
      costCents: 32_800,
      percentOfTotal: 7.6,
    },
    {
      keyId: 'key_legacy',
      keyName: 'Legacy (rotated)',
      requests: 34_202,
      costCents: 11_400,
      percentOfTotal: 2.7,
    },
  ],
}

export const mockInvoices: InvoiceRow[] = [
  {
    id: 'inv_2026_04',
    issuedAt: '2026-04-01T00:00:00.000Z',
    amountCents: 412_900,
    currency: 'USD',
    status: 'paid',
    periodLabel: 'March 2026',
  },
  {
    id: 'inv_2026_03',
    issuedAt: '2026-03-01T00:00:00.000Z',
    amountCents: 389_200,
    currency: 'USD',
    status: 'paid',
    periodLabel: 'February 2026',
  },
  {
    id: 'inv_2026_02',
    issuedAt: '2026-02-01T00:00:00.000Z',
    amountCents: 401_050,
    currency: 'USD',
    status: 'paid',
    periodLabel: 'January 2026',
  },
  {
    id: 'inv_2026_01_draft',
    issuedAt: '2026-04-19T12:00:00.000Z',
    amountCents: 428_50,
    currency: 'USD',
    status: 'open',
    periodLabel: 'April 2026 (estimate)',
  },
]
