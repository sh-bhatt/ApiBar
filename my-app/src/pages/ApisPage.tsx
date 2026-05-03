import { type FormEvent, useMemo, useState } from 'react'
import { Search, Plus, Globe, Link2, Calendar, Trash2, X, Server, IndianRupee, PlusCircle, Tag, Wallet } from 'lucide-react'
import { PageLoader } from '../components/PageLoader'
import { useApiKeys, useApis, useCreateApi, useDeleteApi } from '../hooks/useMeterflowApi'
import { getQueryErrorMessage } from '../lib/queryError'

type PricingModelType = 'per_request' | 'tiered' | 'monthly_flat' | 'free'

interface Tier {
  upTo: number
  pricePerRequest: number
}

export function ApisPage() {
  const apis = useApis()
  const keys = useApiKeys()
  const createApi = useCreateApi()
  const deleteApi = useDeleteApi()
  
  // Form state
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [description, setDescription] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Pricing model state
  const [pricingModel, setPricingModel] = useState<PricingModelType>('per_request')
  const [pricePerRequest, setPricePerRequest] = useState(0.005)
  const [freeTierLimit, setFreeTierLimit] = useState(1000)
  const [tiers, setTiers] = useState<Tier[]>([
    { upTo: 10000, pricePerRequest: 0.005 },
    { upTo: 50000, pricePerRequest: 0.003 },
    { upTo: 100000, pricePerRequest: 0.001 },
  ])
  const [monthlyPrice, setMonthlyPrice] = useState(999)
  const [includedRequests, setIncludedRequests] = useState(10000)

  // Billing config state
  const [billingMode, setBillingMode] = useState<'postpaid' | 'prepaid' | 'pay_per_use'>('postpaid')
  const [billingUnit, setBillingUnit] = useState<'request' | 'token' | 'mb' | 'minute' | 'custom'>('request')
  const [customUnitName, setCustomUnitName] = useState('')
  const [creditLimit, setCreditLimit] = useState(500)
  const [minimumTopup, setMinimumTopup] = useState(100)

  const linkedKeysByApiId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const key of keys.data ?? []) {
      if (!key.apiId) continue
      const current = map.get(key.apiId) ?? []
      current.push(key.name)
      map.set(key.apiId, current)
    }
    return map
  }, [keys.data])

  // Filter APIs based on search query
  const filteredApis = apis.data?.filter(api => 
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.baseUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedBaseUrl = baseUrl.trim()
    if (!trimmedName || !trimmedBaseUrl) return

    const pricingModelData = {
      type: pricingModel,
      pricePerRequest: pricingModel === 'per_request' ? pricePerRequest : 0.005,
      freeTierLimit: pricingModel === 'per_request' ? freeTierLimit : 1000,
      tiers: pricingModel === 'tiered' ? tiers : [],
      monthlyPrice: pricingModel === 'monthly_flat' ? monthlyPrice : 0,
      includedRequests: pricingModel === 'monthly_flat' ? includedRequests : 0,
    }

    const billingConfigData = {
      billingMode,
      billingUnit,
      customUnitName,
      creditLimit,
      minimumTopup,
    }

    try {
      await createApi.mutateAsync({
        name: trimmedName,
        baseUrl: trimmedBaseUrl,
        description: description.trim(),
        pricingModel: pricingModelData,
        billingConfig: billingConfigData,
      })
      setName('')
      setBaseUrl('')
      setDescription('')
      setPricingModel('per_request')
      setPricePerRequest(0.005)
      setFreeTierLimit(1000)
      setTiers([
        { upTo: 10000, pricePerRequest: 0.005 },
        { upTo: 50000, pricePerRequest: 0.003 },
        { upTo: 100000, pricePerRequest: 0.001 },
      ])
      setMonthlyPrice(999)
      setIncludedRequests(10000)
      setBillingMode('postpaid')
      setBillingUnit('request')
      setCustomUnitName('')
      setCreditLimit(500)
      setMinimumTopup(100)
      setShowModal(false)
    } catch {
      /* surfaced in createApi.error */
    }
  }

  function addTier() {
    const lastTier = tiers[tiers.length - 1]
    const newUpTo = lastTier ? lastTier.upTo + 10000 : 10000
    setTiers([...tiers, { upTo: newUpTo, pricePerRequest: 0.001 }])
  }

  function removeTier(index: number) {
    setTiers(tiers.filter((_, i) => i !== index))
  }

  function updateTier(index: number, field: keyof Tier, value: number) {
    setTiers(tiers.map((tier, i) => i === index ? { ...tier, [field]: value } : tier))
  }

  if (apis.isLoading || keys.isLoading) {
    return <PageLoader label="Loading APIs" />
  }

  const queryError = apis.error ?? keys.error
  if (queryError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {getQueryErrorMessage(queryError)}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Management</h1>
            <p className="mt-2 text-gray-600">
              Register and manage your upstream APIs
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register API</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search APIs by name, URL, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Messages */}
        {createApi.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getQueryErrorMessage(createApi.error)}
          </div>
        )}
        {deleteApi.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getQueryErrorMessage(deleteApi.error)}
          </div>
        )}

        {/* API Cards */}
        {filteredApis.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Server className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No APIs found' : 'No APIs registered yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms or clear the search.'
                : 'Register your first API to get started with MeterFlow.'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Register Your First API
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApis.map((api) => {
              const linkedKeys = linkedKeysByApiId.get(api.id) ?? []
              const linkedCount = linkedKeys.length

              return (
                <div key={api.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    <button
                      onClick={() => deleteApi.mutate(api.id)}
                      disabled={deleteApi.isPending}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{api.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 break-all">{api.baseUrl}</p>
                  <p className="text-sm text-gray-500 mb-4">
                    {api.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(api.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Link2 className="w-4 h-4" />
                      <span>{linkedCount} linked</span>
                    </div>
                  </div>

                  {linkedCount > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <div className="text-xs text-gray-500 mb-2">Linked Keys</div>
                      <div className="flex flex-wrap gap-1">
                        {linkedKeys.slice(0, 3).map((keyName) => (
                          <span
                            key={`${api.id}-${keyName}`}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {keyName}
                          </span>
                        ))}
                        {linkedKeys.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            +{linkedKeys.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Register API Modal - Full screen on mobile */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-0 sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-w-xl bg-white sm:rounded-xl shadow-xl flex flex-col sm:max-h-[90vh] max-h-screen">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Register New API</h3>
                    <p className="mt-1 text-sm text-gray-500">Add an upstream API to your account</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <form id="api-registration-form" onSubmit={onSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Weather API"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base URL
                  </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.example.com"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Short description of the upstream API"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  {/* Pricing Model Section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag className="w-4 h-4 inline mr-1" />
                      Pricing Model
                    </label>
                    <select
                      value={pricingModel}
                      onChange={(e) => setPricingModel(e.target.value as PricingModelType)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="per_request">Per Request (Free tier + pay per request)</option>
                      <option value="tiered">Tiered Pricing (Volume discounts)</option>
                      <option value="monthly_flat">Monthly Flat Fee (Fixed price)</option>
                      <option value="free">Free (No charges)</option>
                    </select>

                    {/* Per Request Pricing */}
                    {pricingModel === 'per_request' && (
                      <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900">Per Request Pricing</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Free Tier Limit
                            </label>
                            <input
                              type="number"
                              value={freeTierLimit}
                              onChange={(e) => setFreeTierLimit(Number(e.target.value))}
                              min={0}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                            />
                            <span className="text-xs text-gray-500">requests/month</span>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Price Per Request
                            </label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                value={pricePerRequest}
                                onChange={(e) => setPricePerRequest(Number(e.target.value))}
                                min={0}
                                step={0.001}
                                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tiered Pricing */}
                    {pricingModel === 'tiered' && (
                      <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">Tiered Pricing</h4>
                          <button
                            type="button"
                            onClick={addTier}
                            className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Add Tier
                          </button>
                        </div>
                        <div className="space-y-2">
                          {tiers.map((tier, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-2">
                              <span className="text-xs text-gray-500">Up to</span>
                              <input
                                type="number"
                                value={tier.upTo}
                                onChange={(e) => updateTier(index, 'upTo', Number(e.target.value))}
                                className="w-24 border rounded px-2 py-1 text-sm"
                              />
                              <span className="text-xs text-gray-500">reqs @</span>
                              <div className="flex items-center border rounded px-2 py-1 bg-white flex-1">
                                <span className="text-gray-400 text-sm">₹</span>
                                <input
                                  type="number"
                                  value={tier.pricePerRequest}
                                  onChange={(e) => updateTier(index, 'pricePerRequest', Number(e.target.value))}
                                  step="0.001"
                                  className="w-full text-sm outline-none"
                                />
                              </div>
                              <span className="text-xs text-gray-500">/req</span>
                              {tiers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTier(index)}
                                  className="text-red-400 hover:text-red-600 flex-shrink-0"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monthly Flat Pricing */}
                    {pricingModel === 'monthly_flat' && (
                      <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900">Monthly Flat Fee</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Monthly Price
                            </label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                value={monthlyPrice}
                                onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                                min={0}
                                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Included Requests
                            </label>
                            <input
                              type="number"
                              value={includedRequests}
                              onChange={(e) => setIncludedRequests(Number(e.target.value))}
                              min={0}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                            />
                            <span className="text-xs text-gray-500">requests/month</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Free Pricing */}
                    {pricingModel === 'free' && (
                      <div className="mt-4 bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-700">
                          This API will be free for all users. No charges will apply.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Billing Config Section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Wallet className="w-4 h-4 inline mr-1" />
                      Billing Configuration
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Billing Mode
                        </label>
                        <select
                          value={billingMode}
                          onChange={(e) => setBillingMode(e.target.value as any)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        >
                          <option value="postpaid">Postpaid (Pay after use)</option>
                          <option value="prepaid">Prepaid (Top up first)</option>
                          <option value="pay_per_use">Pay Per Use</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Billing Unit
                        </label>
                        <select
                          value={billingUnit}
                          onChange={(e) => setBillingUnit(e.target.value as any)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        >
                          <option value="request">Per Request</option>
                          <option value="token">Per Token</option>
                          <option value="mb">Per MB</option>
                          <option value="minute">Per Minute</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    </div>

                    {billingUnit === 'custom' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Custom Unit Name
                        </label>
                        <input
                          type="text"
                          value={customUnitName}
                          onChange={(e) => setCustomUnitName(e.target.value)}
                          placeholder="e.g., API call, Query"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    )}

                    {billingMode === 'postpaid' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Credit Limit (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(Number(e.target.value))}
                            min={0}
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        <span className="text-xs text-gray-500">Maximum outstanding balance before blocking</span>
                      </div>
                    )}

                    {billingMode === 'prepaid' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Minimum Topup (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            value={minimumTopup}
                            onChange={(e) => setMinimumTopup(Number(e.target.value))}
                            min={0}
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        <span className="text-xs text-gray-500">Minimum amount per topup transaction</span>
                      </div>
                    )}
                  </div>
                </form>
              <div className="p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="api-registration-form"
                    disabled={createApi.isPending || !name.trim() || !baseUrl.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {createApi.isPending ? 'Registering...' : 'Register API'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
