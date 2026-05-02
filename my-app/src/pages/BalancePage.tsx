import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, CreditCard, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

interface ConsumerBalance {
  _id: string
  userId: string
  apiId: {
    _id: string
    name: string
    billingConfig: {
      billingMode: 'postpaid' | 'prepaid' | 'pay_per_use'
      billingUnit: string
      creditLimit: number
      minimumTopup: number
    }
  }
  balance: number
  creditUsed: number
  creditLimit: number
  status: 'active' | 'blocked' | 'suspended'
  lastTopupAt: string | null
  blockedAt: string | null
  blockedReason: string | null
}

export function BalancePage() {
  const [topupAmount, setTopupAmount] = useState<number>(100)
  const [showTopupModal, setShowTopupModal] = useState<string | null>(null)

  const { data: balances, isLoading, error, refetch } = useQuery({
    queryKey: ['meterflow', 'balance'],
    queryFn: async () => {
      const { data } = await api.get('/balance')
      return data as ConsumerBalance[]
    },
  })

  const handleTopup = async (apiId: string) => {
    try {
      const { data } = await api.post(`/balance/${apiId}/topup`, { amount: topupAmount })
      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: 'INR',
        name: 'MeterFlow',
        description: 'Top up balance',
        order_id: data.orderId,
        handler: async (response: any) => {
          await api.post(`/balance/${apiId}/topup/verify`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            amount: topupAmount,
          })
          setShowTopupModal(null)
          refetch()
        },
      }
      // @ts-ignore
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Topup failed:', err)
    }
  }

  const handlePayOutstanding = async (apiId: string) => {
    try {
      const { data } = await api.post(`/balance/${apiId}/pay-outstanding`)
      const options = {
        key: data.keyId,
        amount: Math.ceil(data.amount) * 100,
        currency: 'INR',
        name: 'MeterFlow',
        description: 'Pay outstanding balance',
        order_id: data.orderId,
        handler: async (response: any) => {
          await api.post(`/balance/${apiId}/topup/verify`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            amount: data.amount,
          })
          refetch()
        },
      }
      // @ts-ignore
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Payment failed:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Failed to load balance data</div>
      </div>
    )
  }

  const getBillingModeBadge = (mode: string) => {
    const colors = {
      prepaid: 'bg-orange-100 text-orange-800',
      postpaid: 'bg-blue-100 text-blue-800',
      pay_per_use: 'bg-purple-100 text-purple-800',
    }
    const labels = {
      prepaid: 'Prepaid',
      postpaid: 'Postpaid',
      pay_per_use: 'Pay Per Use',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[mode as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {labels[mode as keyof typeof labels] || mode}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      blocked: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800',
    }
    const icons = {
      active: CheckCircle,
      blocked: AlertCircle,
      suspended: Clock,
    }
    const Icon = icons[status as keyof typeof icons] || CheckCircle
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Balance Management</h1>
          <p className="mt-2 text-gray-600">Manage your API balance and payments</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {balances?.filter(b => b.apiId != null).map((balance) => {
            const api = (balance.apiId as any)
            const config = api?.billingConfig
            const isPrepaid = config?.billingMode === 'prepaid'
            const isPostpaid = config?.billingMode === 'postpaid'
            const creditUsedPercent = isPostpaid ? (balance.creditUsed / balance.creditLimit) * 100 : 0

            return (
              <div key={balance._id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="space-y-4">
                  {/* API Name and Badges */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{api?.name ?? 'Deleted API'}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        {config && getBillingModeBadge(config.billingMode)}
                        {getStatusBadge(balance.status)}
                      </div>
                    </div>
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Wallet className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>

                  {/* Billing Unit */}
                  {config && (
                    <p className="text-sm text-gray-500">
                      Billed per {config.billingUnit === 'request' ? 'request' : config.billingUnit}
                    </p>
                  )}

                  {/* Prepaid: Balance */}
                  {isPrepaid && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Current Balance</p>
                      <p className="text-2xl font-bold text-green-700">{formatInr(balance.balance)}</p>
                      <p className="text-xs text-gray-500 mt-1">Min topup: ₹{config?.minimumTopup ?? 100}</p>
                    </div>
                  )}

                  {/* Postpaid: Credit Used */}
                  {isPostpaid && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Credit Used</span>
                        <span className="font-medium">
                          {formatInr(balance.creditUsed)} / {formatInr(balance.creditLimit)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${creditUsedPercent > 80 ? 'bg-red-500' : creditUsedPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(creditUsedPercent, 100)}%` }}
                        />
                      </div>
                      {balance.status === 'blocked' && balance.blockedReason && (
                        <p className="text-xs text-red-600 mt-1">{balance.blockedReason}</p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {isPrepaid && api && (
                      <button
                        onClick={() => setShowTopupModal(api._id)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Top Up
                      </button>
                    )}
                    {isPostpaid && balance.status === 'blocked' && api && (
                      <button
                        onClick={() => handlePayOutstanding(api._id)}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Pay Outstanding
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {balances?.length === 0 && (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No balances yet</h3>
            <p className="text-gray-500 mt-1">Get access to APIs from the marketplace to see your balances here.</p>
          </div>
        )}
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Up Balance</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="100"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTopupModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTopup(showTopupModal)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Pay ₹{topupAmount}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
