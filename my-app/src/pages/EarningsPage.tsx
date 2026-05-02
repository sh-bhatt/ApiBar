import { useQuery } from '@tanstack/react-query'
import { TrendingUp, DollarSign, Calendar, Clock, Loader2, Wallet } from 'lucide-react'
import { api } from '../lib/api'

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

interface EarningsSummary {
  totalEarned: number
  thisMonthEarnings: number
  pendingPayout: number
  commissionRate: number
  totalApis: number
}

interface EarningsHistory {
  _id: string
  userId: string
  month: string
  totalRequests: number
  freeRequests: number
  billableRequests: number
  amountINR: number
  platformCommission: number
  providerEarnings: number
  status: 'unpaid' | 'paid'
  generatedAt: string
}

export function EarningsPage() {
  const summary = useQuery({
    queryKey: ['meterflow', 'earnings', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/earnings/summary')
      return data as EarningsSummary
    },
  })

  const history = useQuery({
    queryKey: ['meterflow', 'earnings', 'history'],
    queryFn: async () => {
      const { data } = await api.get('/earnings/history')
      return data as EarningsHistory[]
    },
  })

  if (summary.isLoading || history.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (summary.error || history.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Failed to load earnings data</div>
      </div>
    )
  }

  const summaryData = summary.data
  const historyData = history.data

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
          <p className="mt-2 text-gray-600">Track your API revenue and payouts</p>
        </div>

        {/* Commission Rate Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-blue-600" />
          <p className="text-sm text-blue-800">
            Platform takes <span className="font-semibold">{(summaryData?.commissionRate * 100).toFixed(0)}%</span> commission, you keep{' '}
            <span className="font-semibold">{((1 - summaryData?.commissionRate) * 100).toFixed(0)}%</span>
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatInr(summaryData?.totalEarned || 0)}</p>
                <p className="text-sm text-gray-500 mt-2">All time</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatInr(summaryData?.thisMonthEarnings || 0)}</p>
                <p className="text-sm text-gray-500 mt-2">Current month</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payout</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatInr(summaryData?.pendingPayout || 0)}</p>
                <p className="text-sm text-gray-500 mt-2">Awaiting payment</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Earnings History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Earnings History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Cut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historyData?.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.totalRequests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatInr(record.amountINR)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatInr(record.providerEarnings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatInr(record.platformCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historyData?.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No earnings yet</h3>
              <p className="text-gray-500 mt-1">Your earnings will appear here once consumers start using your APIs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
