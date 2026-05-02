import { useState, useEffect } from 'react'
import { ShoppingBag, Check, Copy } from 'lucide-react'
import { useMarketplaceApis } from '../hooks/useMeterflowApi'
import { PageLoader } from '../components/PageLoader'
import { getQueryErrorMessage } from '../lib/queryError'
import { api } from '../lib/api'
import toast from 'react-hot-toast'

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 3,
  }).format(amount)
}

export function MarketplacePage() {
  const { data: apis, isLoading, error } = useMarketplaceApis()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{
    api: any,
    topupAmount: number
  }>({ api: null, topupAmount: 100 })
  const [newKeyModal, setNewKeyModal] = useState<{
    key: string
    apiName: string
  } | null>(null)
  const [loadingApiId, setLoadingApiId] = useState<string | null>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.body.appendChild(script)
  }, [])

  if (isLoading) {
    return <PageLoader label="Loading marketplace" />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {getQueryErrorMessage(error)}
      </div>
    )
  }

  const requiresUpfrontPayment = (api: any) => {
    const billingMode = api.billingConfig?.billingMode
    const pricingType = api.pricingModel?.type

    // Prepaid billing mode always requires upfront payment
    if (billingMode === 'prepaid') return true

    // Monthly flat always requires upfront payment
    if (pricingType === 'monthly_flat') return true

    return false
  }

  const handleGetAccess = async (api: any) => {
    if (requiresUpfrontPayment(api)) {
      const topupAmount = api.billingConfig?.minimumTopup
        ?? api.pricingModel?.monthlyPrice
        ?? 100
      setPaymentModal({ api, topupAmount })
      return
    }
    await grantAccess(api.id)
  }

  const grantAccess = async (apiId: string) => {
    setLoadingApiId(apiId)
    try {
      const response = await api.post(`/marketplace/${apiId}/access`)
      // Show key modal with response.data.plainTextKey
      setNewKeyModal({ key: response.data.key, apiName: response.data.apiName })
      setShowKeyModal(true)
      toast.success(`Access granted to ${response.data.apiName}!`)
    } catch (err) {
      toast.error('Failed to get API access')
    } finally {
      setLoadingApiId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(text)
    setTimeout(() => setCopiedKey(null), 2000)
    toast.success('API key copied to clipboard!')
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">API Marketplace</h1>
        <p className="mt-1 text-sm text-gray-600">
          Discover and access APIs from verified providers.
        </p>
      </header>

      {/* API Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {apis?.map((api) => (
          <div
            key={api.id}
            className="card p-6 hover:shadow-lg transition-shadow duration-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-purple-600" />
              </div>
              {api.pricingModel?.type === 'free' ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-green-500 text-white shadow-sm">
                  FREE Forever
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Available
                </span>
              )}
            </div>

            {/* API Info */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{api.name}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
              {api.description || 'No description available'}
            </p>

            {/* Provider */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <span className="font-medium">Provider:</span>
              <span>{api.providerName}</span>
            </div>

            {/* Pricing Info */}
            <div className="space-y-2 mb-6">
              {/* Billing Mode Badge */}
              {api.billingConfig && (
                <div className="flex items-center gap-2 mb-2">
                  {api.billingConfig.billingMode === 'prepaid' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Prepaid
                    </span>
                  )}
                  {api.billingConfig.billingMode === 'postpaid' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Postpaid
                    </span>
                  )}
                  {api.billingConfig.billingMode === 'pay_per_use' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Pay Per Use
                    </span>
                  )}
                </div>
              )}

              {/* Billing Unit */}
              {api.billingConfig && (
                <div className="text-sm text-gray-500 mb-2">
                  Billed per {api.billingConfig.billingUnit === 'request' ? 'request' : api.billingConfig.billingUnit}
                </div>
              )}

              {/* Prepaid: Min Topup */}
              {api.billingConfig?.billingMode === 'prepaid' && api.billingConfig.minimumTopup && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Min topup:</span>
                  <span className="font-medium text-gray-900">₹{api.billingConfig.minimumTopup}</span>
                </div>
              )}

              {/* Postpaid: Credit Limit */}
              {api.billingConfig?.billingMode === 'postpaid' && api.billingConfig.creditLimit && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Credit limit:</span>
                  <span className="font-medium text-gray-900">₹{api.billingConfig.creditLimit}</span>
                </div>
              )}

              {api.pricingModel?.type === 'free' && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Free
                  </span>
                  <span className="text-sm text-gray-500">No charges apply</span>
                </div>
              )}

              {api.pricingModel?.type === 'per_request' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Per Request
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Price per request:</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(api.pricingModel.pricePerRequest ?? api.pricePerRequest)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Free tier:</span>
                    <span className="font-medium text-green-600">
                      {(api.pricingModel.freeTierLimit ?? api.freeTierLimit).toLocaleString()} requests
                    </span>
                  </div>
                </>
              )}

              {api.pricingModel?.type === 'tiered' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Tiered Pricing
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">Volume discounts available</div>
                  {api.pricingModel.tiers && api.pricingModel.tiers.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-2 text-xs space-y-1">
                      {api.pricingModel.tiers.map((tier, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-600">Up to {tier.upTo.toLocaleString()} req:</span>
                          <span className="font-medium">{formatPrice(tier.pricePerRequest)}/req</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {api.pricingModel?.type === 'monthly_flat' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Monthly Flat
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monthly price:</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(api.pricingModel.monthlyPrice ?? 0)}/month
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Included requests:</span>
                    <span className="font-medium text-green-600">
                      {(api.pricingModel.includedRequests ?? 0).toLocaleString()} requests
                    </span>
                  </div>
                </>
              )}

              {/* Fallback for legacy APIs without pricingModel */}
              {!api.pricingModel && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Price per request:</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(api.pricePerRequest)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Free tier:</span>
                    <span className="font-medium text-green-600">
                      {api.freeTierLimit.toLocaleString()} requests
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Get Access Button */}
            <button
              onClick={() => handleGetAccess(api)}
              disabled={loadingApiId === api.id}
              className="w-full primary-btn py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingApiId === api.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  Get Access
                </>
              )}
            </button>
          </div>
        ))}

        {apis?.length === 0 && (
          <div className="col-span-full card p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No APIs Available</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              There are no APIs currently available in the marketplace. Check back later for new offerings from providers.
            </p>
          </div>
        )}
      </div>

      {/* Key Modal */}
      {showKeyModal && newKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              API Access Granted!
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              You now have access to <strong>{newKeyModal.apiName}</strong>
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                Your API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white border border-gray-200 rounded px-3 py-2 truncate">
                  {newKeyModal.key}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyModal.key)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy full key"
                >
                  {copiedKey === newKeyModal.key ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Click the copy button to copy the full API key
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowKeyModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  copyToClipboard(newKeyModal.key)
                  setShowKeyModal(false)
                }}
                className="flex-1 primary-btn py-2 flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prepaid Payment Modal */}
      {paymentModal.api && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-xl p-6 w-full max-w-md'>
            <h3 className='text-lg font-semibold mb-2'>Top Up Required</h3>
            <p className='text-gray-500 text-sm mb-4'>
              {paymentModal.api.name} requires prepaid credits.
              Minimum topup: ₹{paymentModal.api.billingConfig?.minimumTopup}
            </p>
            <div className='mb-4'>
              <label className='text-sm font-medium'>Amount (₹)</label>
              <input
                type='number'
                min={paymentModal.api.billingConfig?.minimumTopup}
                value={paymentModal.topupAmount}
                onChange={e => setPaymentModal(prev => ({ ...prev, topupAmount: Number(e.target.value) }))}
                className='w-full border rounded px-3 py-2 mt-1'
              />
            </div>
            <div className='flex gap-3'>
              <button
                onClick={() => setPaymentModal({ api: null, topupAmount: 100 })}
                className='flex-1 border rounded-lg py-2'
              >Cancel</button>
              <button
                onClick={async () => {
                  const apiId = paymentModal.api!.id
                  // Create topup order
                  const orderRes = await api.post(`/balance/${apiId}/topup`, {
                    amount: paymentModal.topupAmount
                  })
                  const { orderId, amount, keyId } = orderRes.data

                  // Open Razorpay
                  const rzp = new (window as any).Razorpay({
                    key: keyId,
                    amount: amount * 100,
                    currency: 'INR',
                    order_id: orderId,
                    name: 'MeterFlow',
                    description: `Top up for ${paymentModal.api!.name}`,
                    handler: async (response: any) => {
                      // Verify payment
                      await api.post(`/balance/${apiId}/topup/verify`, {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        amount: paymentModal.topupAmount
                      })
                      // Now grant access
                      setPaymentModal({ api: null, topupAmount: 100 })
                      await grantAccess(apiId)
                    }
                  })
                  rzp.open()
                }}
                className='flex-1 bg-purple-600 text-white rounded-lg py-2'
              >Pay ₹{paymentModal.topupAmount} & Get Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
