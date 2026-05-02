import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { apiClient } from '../api/client'
import type { MonthlyUsageByKey } from '../api/types'

const qk = {
  usageSummary: ['meterflow', 'usage', 'summary'] as const,
  usageLogs: ['meterflow', 'usage', 'logs'] as const,
  keys: ['meterflow', 'keys'] as const,
  apis: ['meterflow', 'apis'] as const,
  marketplace: ['meterflow', 'marketplace'] as const,
  myApis: ['meterflow', 'my-apis'] as const,
  monthlyUsage: ['meterflow', 'usage', 'monthly'] as const,
  billingCurrent: ['meterflow', 'billing', 'current'] as const,
  invoices: ['invoices'] as const,
}

export type UsageSummaryDto = {
  totalCalls: number
  avgLatencyMs: number
  successRate: number
  errorRate: number
  estimatedBillUsd: number
  pricePer1kUsd: number
}

export type UsageLogDto = {
  id: string
  apiKeyId: string | null
  method: string
  path: string
  statusCode: number
  latencyMs: number
  timestamp: string
}

export type LinkedApiRefDto = {
  id: string
  name: string
  pricingModel?: {
    type: 'free' | 'per_request' | 'tiered' | 'monthly_flat'
    includedRequests?: number
    monthlyPrice?: number
    freeTierLimit?: number
    pricePerRequest?: number
  }
  billingConfig?: {
    billingMode: 'postpaid' | 'prepaid' | 'pay_per_use'
    billingUnit: string
    creditLimit?: number
    minimumTopup?: number
  }
}

export type ApiKeyDto = {
  id: string
  name: string
  maskedKey: string
  callCount: number
  rateLimit: number
  freeTierLimit: number
  pricePerRequest: number
  status: 'active' | 'disabled'
  createdAt: string
  apiId: string | null
  linkedApi: LinkedApiRefDto | null
}

export type CreateKeyResponseDto = {
  id: string
  name: string
  key: string
  maskedKey: string
  callCount: number
  rateLimit: number
  freeTierLimit: number
  pricePerRequest: number
  status: string
  createdAt: string
}

export type RotateKeyResponseDto = CreateKeyResponseDto

export type BindKeyResponseDto = {
  id: string
  apiId: string | null
  linkedApi: LinkedApiRefDto | null
}

export type BillingEstimateDto = {
  totalRequests: number
  freeRequests: number
  billableRequests: number
  amountINR: number
  month: string
  freeTierLimitApplied: number
}

export type BillingInvoiceDto = {
  id: string
  userId: string
  month: string
  totalRequests: number
  freeRequests: number
  billableRequests: number
  amountINR: number
  status: 'paid' | 'unpaid'
  generatedAt: string
  breakdown?: Array<{
    apiId: string
    apiName: string
    billingMode: string
    pricingType: string
    totalRequests: number
    freeRequests: number
    billableRequests: number
    amountINR: number
    platformCommission: number
    providerEarnings: number
    providerId: string | null
  }>
}

export type PaymentHistoryDto = {
  id: string
  type: 'prepaid_topup' | 'postpaid_invoice'
  apiName: string
  amount: number
  date: string | null
  status: string
  currentBalance?: number
  month?: string
}

export type CreatePaymentOrderDto = {
  orderId: string
  amount: number
  currency: 'INR'
  keyId: string
}

export type VerifyPaymentPayload = {
  billingId: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export type ApiDto = {
  id: string
  userId: string
  name: string
  baseUrl: string
  description: string
  createdAt: string
}

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

export type MarketplaceApiDto = {
  id: string
  name: string
  description: string
  providerName: string
  pricingModel?: PricingModel
  pricePerRequest: number
  freeTierLimit: number
  createdAt: string
  billingConfig?: {
    billingMode: 'postpaid' | 'prepaid' | 'pay_per_use'
    billingUnit: string
    creditLimit?: number
    minimumTopup?: number
  }
}

export type MyApiKeyDto = {
  id: string
  name: string
  maskedKey: string
  apiId: string
  apiName: string
  providerName: string
  callCount: number
  freeTierLimit: number
  pricePerRequest: number
  status: 'active' | 'disabled'
  createdAt: string
}

export function useUsageSummary() {
  return useQuery({
    queryKey: qk.usageSummary,
    queryFn: async () => {
      const { data } = await api.get<UsageSummaryDto>('/usage/summary')
      return data
    },
  })
}

export function useUsageLogs() {
  return useQuery({
    queryKey: qk.usageLogs,
    queryFn: async () => {
      const { data } = await api.get<{ logs: UsageLogDto[] }>('/usage/logs')
      return data.logs
    },
  })
}

export function useApiKeys() {
  return useQuery({
    queryKey: qk.keys,
    queryFn: async () => {
      const { data } = await api.get<{ keys: ApiKeyDto[] }>('/keys')
      return data.keys
    },
  })
}

export function useApis() {
  return useQuery({
    queryKey: qk.apis,
    queryFn: async () => {
      const { data } = await api.get<{ apis: ApiDto[] }>('/apis')
      return data.apis
    },
  })
}

export function useCreateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name,
      freeTierLimit,
      pricePerRequest,
    }: {
      name: string
      freeTierLimit?: number
      pricePerRequest?: number
    }) => {
      const { data } = await api.post<CreateKeyResponseDto>('/keys', { 
        name, 
        freeTierLimit, 
        pricePerRequest 
      })
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.keys })
      void qc.invalidateQueries({ queryKey: qk.usageSummary })
      void qc.invalidateQueries({ queryKey: qk.billingCurrent })
    },
  })
}

export function useRotateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (keyId: string) => {
      const { data } = await api.post<RotateKeyResponseDto>(
        `/keys/${encodeURIComponent(keyId)}/rotate`,
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.keys })
    },
  })
}

export function useUpdateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      keyId,
      freeTierLimit,
      pricePerRequest,
    }: {
      keyId: string
      freeTierLimit?: number
      pricePerRequest?: number
    }) => {
      const updates: any = {}
      if (freeTierLimit !== undefined) updates.freeTierLimit = freeTierLimit
      if (pricePerRequest !== undefined) updates.pricePerRequest = pricePerRequest
      
      const { data } = await api.patch<ApiKeyDto>(`/keys/${encodeURIComponent(keyId)}`, updates)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.keys })
      void qc.invalidateQueries({ queryKey: qk.billingCurrent })
    },
  })
}

export function useBindApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ keyId, apiId }: { keyId: string; apiId: string | null }) => {
      const { data } = await api.patch<BindKeyResponseDto>(
        `/keys/${encodeURIComponent(keyId)}/bind`,
        { apiId },
      )
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.keys })
      void qc.invalidateQueries({ queryKey: qk.apis })
    },
  })
}

export function useDeleteApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (keyId: string) => {
      await api.delete(`/keys/${encodeURIComponent(keyId)}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.keys })
      void qc.invalidateQueries({ queryKey: qk.usageSummary })
      void qc.invalidateQueries({ queryKey: qk.usageLogs })
      void qc.invalidateQueries({ queryKey: qk.billingCurrent })
      void qc.invalidateQueries({ queryKey: qk.invoices })
      void qc.invalidateQueries({ queryKey: qk.apis })
    },
  })
}

export type CreateApiPayload = {
  name: string
  baseUrl: string
  description: string
  pricingModel?: {
    type: 'per_request' | 'tiered' | 'monthly_flat' | 'free'
    pricePerRequest?: number
    freeTierLimit?: number
    tiers?: { upTo: number; pricePerRequest: number }[]
    monthlyPrice?: number
    includedRequests?: number
  }
  billingConfig?: {
    billingMode: 'postpaid' | 'prepaid' | 'pay_per_use'
    billingUnit: 'request' | 'token' | 'mb' | 'minute' | 'custom'
    customUnitName: string
    creditLimit: number
    minimumTopup: number
  }
}

export function useCreateApi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateApiPayload) => {
      const { data } = await api.post<ApiDto>('/apis', payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.apis })
    },
  })
}

export function useDeleteApi() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (apiId: string) => {
      await api.delete(`/apis/${encodeURIComponent(apiId)}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.apis })
      void qc.invalidateQueries({ queryKey: qk.keys })
    },
  })
}

export function useCurrentBill() {
  return useQuery({
    queryKey: qk.billingCurrent,
    queryFn: async () => {
      const { data } = await api.get<BillingEstimateDto>('/billing/current')
      return data
    },
  })
}

export function useInvoices() {
  return useQuery({
    queryKey: qk.invoices,
    queryFn: async () => {
      const { data } = await api.get<{ invoices: BillingInvoiceDto[] }>('/billing/invoices')
      return data.invoices
    },
  })
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: ['paymentHistory'],
    queryFn: async () => {
      const { data } = await api.get<PaymentHistoryDto[]>('/billing/payment-history')
      return data
    },
  })
}

export function useGenerateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<BillingInvoiceDto>('/billing/generate')
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: qk.billingCurrent })
    },
  })
}

export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: async ({ billingId }: { billingId: string }) => {
      const { data } = await api.post<CreatePaymentOrderDto>('/payments/create-order', {
        billingId,
      })
      return data
    },
  })
}

export function useVerifyPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VerifyPaymentPayload) => {
      const { data } = await api.post('/payments/verify', payload)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.invoices })
    },
  })
}

/** Mock-backed until backend routes exist. */
export function useMonthlyUsageByKey() {
  return useQuery({
    queryKey: qk.monthlyUsage,
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlyUsageByKey>('/usage/monthly')
      return data
    },
  })
}

// Marketplace hooks for consumers
export function useMarketplaceApis() {
  return useQuery({
    queryKey: qk.marketplace,
    queryFn: async () => {
      const { data } = await api.get<{ apis: MarketplaceApiDto[] }>('/marketplace')
      return data.apis
    },
  })
}

export function useGetApiAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (apiId: string) => {
      const { data } = await api.post<{ 
        id: string
        name: string
        key: string
        maskedKey: string
        apiId: string
        apiName: string
        providerName: string
        freeTierLimit: number
        pricePerRequest: number
        status: string
        createdAt: string
      }>(`/marketplace/${encodeURIComponent(apiId)}/access`)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.keys })
      void qc.invalidateQueries({ queryKey: qk.marketplace })
    },
  })
}

export function useMyApis() {
  return useQuery({
    queryKey: qk.myApis,
    queryFn: async () => {
      const { data } = await api.get<{ keys: MyApiKeyDto[] }>('/keys')
      // Filter only keys that are linked to APIs (consumer keys)
      return data.keys.filter((key: any) => key.apiId)
    },
  })
}
