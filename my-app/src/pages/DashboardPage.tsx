import { Activity, DollarSign, Clock, KeyRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PageLoader } from '../components/PageLoader'
import { StatCard } from '../components/StatCard'
import { TrafficChart } from '../components/TrafficChart'
import { ProgressIndicator } from '../components/ProgressIndicator'
import { api } from '../lib/api'
import {
  useApiKeys,
  useCurrentBill,
  useUsageLogs,
  useUsageSummary,
} from '../hooks/useMeterflowApi'
import { getQueryErrorMessage } from '../lib/queryError'

function formatUsd(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function DashboardPage() {
  const [activeRange, setActiveRange] = useState<'hour'|'day'|'week'|'month'>('day')
  const summary = useUsageSummary()
  const logs = useUsageLogs()
  const keys = useApiKeys()
  const currentBill = useCurrentBill()

  // Real traffic data from API
  const trafficData = useQuery({
    queryKey: ['meterflow', 'usage', 'chart', activeRange],
    queryFn: async () => {
      const { data } = await api.get(`/usage/chart?range=${activeRange}`)
      return data
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const loading =
    summary.isLoading || logs.isLoading || keys.isLoading || currentBill.isLoading || trafficData.isLoading
  const err = summary.error ?? logs.error ?? keys.error ?? currentBill.error ?? trafficData.error

  if (loading) {
    return <PageLoader label="Loading dashboard" />
  }

  if (err) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {getQueryErrorMessage(err)}
      </div>
    )
  }

  const s = summary.data!
  const bill = currentBill.data!
  const activeKeys = keys.data!.filter((k) => k.status === 'active').length

  // Calculate metrics for progress indicators
  const successRate = s.successRate
  const errorRate = s.errorRate
  const avgLatency = s.avgLatencyMs

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Live metrics and recent traffic across your workspace.
        </p>
      </header>

      {/* Animated Stat Cards */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={s.totalCalls}
          icon={Activity}
          color="primary"
        />
        <StatCard
          title="Active Keys"
          value={activeKeys}
          icon={KeyRound}
          color="secondary"
        />
        <StatCard
          title="Avg Latency"
          value={`${s.avgLatencyMs}ms`}
          icon={Clock}
          color="success"
        />
        <StatCard
          title="Estimated Bill"
          value={formatInr(s.estimatedBillUsd)}
          icon={DollarSign}
          color="warning"
        />
      </section>

      {/* Live Traffic Chart */}
      <section>
        <TrafficChart data={trafficData.data || []}>
          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1">
              {[
                { value: 'hour', label: 'Hour' },
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setActiveRange(range.value as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeRange === range.value
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </TrafficChart>
      </section>

      {/* Progress Indicators */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
          <p className="mt-1 text-sm text-gray-600">
            Real-time performance indicators for your APIs.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <ProgressIndicator
            title="Success Rate"
            value={successRate}
            maxValue={100}
            color="success"
            unit="%"
          />
          <ProgressIndicator
            title="Error Rate"
            value={errorRate}
            maxValue={100}
            color="error"
            unit="%"
          />
          <ProgressIndicator
            title="Avg Latency"
            value={avgLatency}
            maxValue={2000}
            color="warning"
            unit="ms"
          />
        </div>
      </section>

      {/* Current Bill */}
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Bill</h2>
            <p className="mt-1 text-sm text-gray-600">
              Live estimate for {bill.month}.
            </p>
          </div>
          <div className="primary-btn px-4 py-2">
            {formatInr(bill.amountINR)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total requests
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {bill.totalRequests.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Free tier limit
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {bill.freeTierLimitApplied.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Free requests used
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {bill.freeRequests.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Billable requests
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {bill.billableRequests.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estimated amount
            </div>
            <div className="mt-2 text-lg font-bold text-gray-900">
              {formatInr(bill.amountINR)}
            </div>
          </div>
        </div>
      </section>

      {/* API Key Pricing */}
      <section className="card p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">API Key Pricing</h2>
          <p className="mt-1 text-sm text-gray-600">
            Price per request configuration for each active API key.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {keys.data!
            .filter((k) => k.status === 'active')
            .map((key) => (
              <div key={key.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {key.name}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${key.status === 'active' ? 'status-active' : 'status-inactive'}`}></div>
                </div>
                <div className="text-lg font-bold gradient-text">
                  {formatInr(key.pricePerRequest ?? 0.005)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  per request
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Free tier: {key.freeTierLimit?.toLocaleString() ?? '1,000'} requests
                </div>
              </div>
            ))}
          {keys.data!.filter((k) => k.status === 'active').length === 0 && (
            <div className="col-span-full card p-8 text-center">
              <div className="text-sm text-gray-500">
                No active API keys found
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
