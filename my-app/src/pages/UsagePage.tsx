import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Activity, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useUsageSummary } from '../hooks/useMeterflowApi'

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

interface UsageBreakdown {
  keyId: string
  keyName: string
  requestCount: number
  freeRequests: number
  billableRequests: number
  estimatedCost: number
  sharePercentage: number
}

export function UsagePage() {
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  
  const summary = useUsageSummary()
  const breakdown = useQuery({
    queryKey: ['meterflow', 'usage', 'breakdown'],
    queryFn: async () => {
      const { data } = await api.get('/usage/breakdown')
      return data
    }
  })

  // Real chart data from API
  const chartData = useQuery({
    queryKey: ['meterflow', 'usage', 'chart', timeFilter],
    queryFn: async () => {
      const { data } = await api.get(`/usage/chart?range=${timeFilter}`)
      return data
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  if (breakdown.isLoading || summary.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading usage data...</div>
      </div>
    )
  }

  if (breakdown.error || summary.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Failed to load usage data</div>
      </div>
    )
  }

  const data = breakdown.data

  // Calculate totals for summary cards
  const totalRequests = data.breakdown?.reduce((sum: number, row: UsageBreakdown) => sum + (row.requestCount ?? 0), 0) || 0
  const totalBillable = data.breakdown?.reduce((sum: number, row: UsageBreakdown) => sum + (row.billableRequests ?? 0), 0) || 0
  const totalCost = data.breakdown?.reduce((sum: number, row: UsageBreakdown) => sum + (row.estimatedCost ?? 0), 0) || 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usage Analytics</h1>
          <p className="mt-2 text-gray-600">
            Monitor your API usage, costs, and performance metrics
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalRequests.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">This month</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Billable Requests</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalBillable.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {totalRequests > 0 ? ((totalBillable / totalRequests) * 100).toFixed(1) : '0'}% of total
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Estimated Cost</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatInr(totalCost)}
                </p>
                <p className="text-sm text-gray-500 mt-2">Current month</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Request Volume</h2>
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {(['hour', 'day', 'week', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    timeFilter === filter
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64">
            {chartData.isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-gray-500">Loading chart data...</span>
                </div>
              </div>
            ) : chartData.error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-red-500">Failed to load chart data</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="requests" 
                    fill="url(#colorGradient)"
                    radius={[4, 4, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* API Keys Usage Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">API Keys Usage</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Key Name</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Requests</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Share</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Free Used</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Billable</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown?.map((row: UsageBreakdown) => (
                    <tr key={row.keyId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{row.keyName}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {(row.requestCount ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-500"
                              style={{ width: `${Math.min(row.sharePercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {(row.sharePercentage ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {(row.freeRequests ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {(row.billableRequests ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatInr(row.estimatedCost ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
