export type DashboardSummary = {
  totalRequests: number
  activeKeys: number
  avgLatencyMs: number
  estimatedBillCents: number
}

export type DailyRequestVolume = {
  date: string
  label: string
  count: number
}

export type RequestLogEntry = {
  id: string
  at: string
  method: string
  path: string
  status: number
  latencyMs: number
}

export type ApiKeyRow = {
  id: string
  name: string
  maskedValue: string
  status: 'active' | 'revoked'
  callCount: number
}

export type MonthlyUsageByKey = {
  month: string
  year: number
  rows: {
    keyId: string
    keyName: string
    requests: number
    costCents: number
    percentOfTotal: number
  }[]
}

export type InvoiceRow = {
  id: string
  issuedAt: string
  amountCents: number
  currency: string
  status: 'paid' | 'open' | 'void'
  periodLabel: string
}
