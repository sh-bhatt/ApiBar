import { type FormEvent, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Key, RefreshCw, Trash2, Copy, Check, ExternalLink, AlertCircle, Search, Plus, MoreVertical, Link, Link2, Edit, RotateCw, X } from 'lucide-react'
import {
  useApiKeys,
  useRotateApiKey,
  useDeleteApiKey,
  useCreateApiKey,
  useUpdateApiKey,
  useBindApiKey,
  useApis,
} from '../hooks/useMeterflowApi'
import { PageLoader } from '../components/PageLoader'
import { SparklineChart } from '../components/SparklineChart'
import { getQueryErrorMessage } from '../lib/queryError'
import toast from 'react-hot-toast'

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 3,
  }).format(amount)
}

export function MyApisPage() {
  const queryClient = useQueryClient()
  const { data: keys, isLoading, error } = useApiKeys()
  const rotateKey = useRotateApiKey()
  const deleteKey = useDeleteApiKey()
  const createKey = useCreateApiKey()
  const updateKey = useUpdateApiKey()
  const bindKey = useBindApiKey()
  const apis = useApis()

  // Tab state
  const [activeTab, setActiveTab] = useState<'marketplace' | 'mykeys'>('marketplace')

  // Marketplace APIs state
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null)
  const [showRevokeModal, setShowRevokeModal] = useState(false)

  // My API Keys state (from ApiKeysPage)
  const [name, setName] = useState('')
  const [newFreeTierLimit, setNewFreeTierLimit] = useState('1000')
  const [newPricePerRequest, setNewPricePerRequest] = useState('0.005')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<any>(null)
  const [linkingKeyId, setLinkingKeyId] = useState<string | null>(null)
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [editFreeTierLimit, setEditFreeTierLimit] = useState('')
  const [editPricePerRequest, setEditPricePerRequest] = useState('')
  const [selectedApiId, setSelectedApiId] = useState('')
  const [copied, setCopied] = useState(false)

  // Filter keys for each tab
  const consumerKeys = keys?.filter((key) => key.apiId && key.status === 'active') || []
  const manualKeys = keys?.filter((key) => !key.apiId && key.status === 'active') || []
  const filteredManualKeys = manualKeys.filter(key =>
    key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.maskedKey.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return <PageLoader label="Loading your APIs" />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {getQueryErrorMessage(error)}
      </div>
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(text)
    setTimeout(() => setCopiedKey(null), 2000)
    toast.success('API key copied to clipboard!')
  }

  const handleRotate = async (keyId: string) => {
    try {
      const result = await rotateKey.mutateAsync(keyId)
      toast.success('API key rotated successfully!')
      // Show the new key
      copyToClipboard(result.key)
    } catch (err) {
      toast.error('Failed to rotate API key')
    }
  }

  const handleRevoke = async () => {
    if (!keyToRevoke) return
    try {
      await deleteKey.mutateAsync(keyToRevoke)
      toast.success('API access revoked successfully')
      setShowRevokeModal(false)
      setKeyToRevoke(null)
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['myApis'] })
    } catch (err) {
      toast.error('Failed to revoke API access')
    }
  }

  const confirmRevoke = (keyId: string) => {
    setKeyToRevoke(keyId)
    setShowRevokeModal(true)
  }

  // My API Keys handlers
  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    const freeTierLimit = Math.max(0, Number(newFreeTierLimit) || 0)
    const pricePerRequest = Math.max(0, Number(newPricePerRequest) || 0.005)

    const result = await createKey.mutateAsync({
      name: trimmed,
      freeTierLimit,
      pricePerRequest,
    })

    setName('')
    setNewFreeTierLimit('1000')
    setNewPricePerRequest('0.005')
    setShowCreateForm(false)
    setRevealedKey(result)
  }

  function startEditing(keyId: string, currentFreeTierLimit: number, currentPricePerRequest: number) {
    setEditingKeyId(keyId)
    setEditFreeTierLimit(currentFreeTierLimit.toString())
    setEditPricePerRequest(currentPricePerRequest.toString())
    setActiveDropdown(null)
  }

  async function handleEdit() {
    if (!editingKeyId) return

    const freeTierLimit = Math.max(0, Number(editFreeTierLimit) || 0)
    const pricePerRequest = Math.max(0, Number(editPricePerRequest) || 0.005)

    await updateKey.mutateAsync({
      keyId: editingKeyId,
      freeTierLimit,
      pricePerRequest,
    })

    setEditingKeyId(null)
  }

  async function handleManualRotate(keyId: string) {
    setActiveDropdown(null)
    const result = await rotateKey.mutateAsync(keyId)
    setRevealedKey(result)
  }

  async function handleUnlink(keyId: string) {
    setActiveDropdown(null)
    await bindKey.mutateAsync({ keyId, apiId: null })
  }

  async function handleManualRevoke(keyId: string) {
    setActiveDropdown(null)
    await deleteKey.mutateAsync(keyId)
    queryClient.invalidateQueries({ queryKey: ['keys'] })
    queryClient.invalidateQueries({ queryKey: ['myApis'] })
  }

  function openLinkModal(keyId: string) {
    setLinkingKeyId(keyId)
    setSelectedApiId('')
    setActiveDropdown(null)
  }

  function closeLinkModal() {
    setLinkingKeyId(null)
    setSelectedApiId('')
  }

  async function handleLink() {
    if (!linkingKeyId || !selectedApiId) return
    await bindKey.mutateAsync({ keyId: linkingKeyId, apiId: selectedApiId })
    closeLinkModal()
  }

  async function onCopy() {
    if (!revealedKey?.key) return
    await navigator.clipboard.writeText(revealedKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Helper to get pricing display for manual keys
  function getPricingDisplay(key: any) {
    const linkedApi = key.linkedApi
    if (!linkedApi) {
      return {
        priceDisplay: formatPrice(key.pricePerRequest ?? 0.005),
        freeDisplay: `Free: ${key.freeTierLimit?.toLocaleString() ?? '1,000'}`,
        badge: null
      }
    }

    const pricing = linkedApi.pricingModel
    const type = pricing?.type || 'per_request'

    if (type === 'free') {
      return {
        priceDisplay: 'Free',
        freeDisplay: 'Unlimited',
        badge: <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Free</span>
      }
    } else if (type === 'monthly_flat') {
      return {
        priceDisplay: `₹${pricing?.monthlyPrice ?? 0}/mo`,
        freeDisplay: `${pricing?.includedRequests ?? 0} included`,
        badge: <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Monthly</span>
      }
    } else if (type === 'tiered') {
      return {
        priceDisplay: 'Tiered',
        freeDisplay: 'Variable pricing',
        badge: <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Tiered</span>
      }
    } else {
      // per_request
      const freeLimit = pricing?.freeTierLimit ?? key.freeTierLimit ?? 1000
      return {
        priceDisplay: formatPrice(pricing?.pricePerRequest ?? key.pricePerRequest ?? 0.005),
        freeDisplay: `Free: ${freeLimit.toLocaleString()}`,
        badge: null
      }
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">My APIs</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your API keys from the marketplace and your manually created keys.
        </p>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'marketplace'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Marketplace APIs
          </button>
          <button
            onClick={() => setActiveTab('mykeys')}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mykeys'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My API Keys
          </button>
        </nav>
      </div>

      {/* Tab 1: Marketplace APIs */}
      {activeTab === 'marketplace' && (
        <div className="space-y-4">
          {consumerKeys.map((key) => {
            const isActive = key.status === 'active'
            const pricingType = key.linkedApi?.pricingModel?.type || 'per_request'
            const pricingModel = key.linkedApi?.pricingModel

            let middleStatValue: string | number
            let middleStatLabel: string
            let pricePerRequestDisplay: string

            if (pricingType === 'free') {
              middleStatValue = 'Unlimited'
              middleStatLabel = 'Free'
              pricePerRequestDisplay = 'Free'
            } else if (pricingType === 'monthly_flat') {
              middleStatValue = pricingModel?.includedRequests || 0
              middleStatLabel = 'Included'
              pricePerRequestDisplay = formatPrice(pricingModel?.monthlyPrice || 0) + '/mo'
            } else if (pricingType === 'tiered') {
              middleStatValue = 'Tiered'
              middleStatLabel = 'Pricing'
              pricePerRequestDisplay = 'Tiered'
            } else {
              const freeTierLimit = pricingModel?.freeTierLimit ?? key.freeTierLimit
              const freeTierRemaining = Math.max(0, freeTierLimit - key.callCount)
              middleStatValue = freeTierRemaining.toLocaleString()
              middleStatLabel = 'Free Left'
              pricePerRequestDisplay = formatPrice(pricingModel?.pricePerRequest ?? key.pricePerRequest)
            }

            return (
              <div key={key.id} className={`card p-6 ${!isActive ? 'opacity-75' : ''}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Key className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{key.name}</h3>
                        <p className="text-sm text-gray-500">
                          Linked API: <span className={`font-medium ${key.linkedApi ? 'text-gray-700' : 'text-red-600'}`}>{key.linkedApi?.name || 'Deleted API'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <code className="text-sm font-mono bg-gray-100 px-3 py-1.5 rounded text-gray-600">{key.maskedKey}</code>
                      <button
                        onClick={() => copyToClipboard(key.maskedKey)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        {copiedKey === key.maskedKey ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 lg:border-l lg:border-gray-200 lg:pl-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{key.callCount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Requests</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${pricingType === 'free' ? 'text-green-600' : pricingType === 'monthly_flat' ? 'text-blue-600' : pricingType === 'tiered' ? 'text-purple-600' : typeof middleStatValue === 'number' && middleStatValue > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                        {typeof middleStatValue === 'number' ? middleStatValue.toLocaleString() : middleStatValue}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">{middleStatLabel}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{pricePerRequestDisplay}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">{pricingType === 'monthly_flat' ? 'Monthly' : 'Per Request'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <>
                        <button onClick={() => handleRotate(key.id)} disabled={rotateKey.isPending} className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                          <RefreshCw className={`w-4 h-4 ${rotateKey.isPending ? 'animate-spin' : ''}`} /> Rotate
                        </button>
                        <button onClick={() => confirmRevoke(key.id)} disabled={deleteKey.isPending} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                          <Trash2 className="w-4 h-4" /> Revoke
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 text-sm font-medium text-gray-500 bg-gray-100 rounded-full">Revoked</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {isActive ? 'Active' : 'Revoked'}
                  </span>
                  <span className="text-xs text-gray-400">Created {new Date(key.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )
          })}
          {consumerKeys.length === 0 && (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Key className="w-8 h-8 text-gray-400" /></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Marketplace APIs</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">You haven't accessed any APIs from the marketplace yet.</p>
              <a href="/dashboard/marketplace" className="inline-flex items-center gap-2 primary-btn px-4 py-2"><ExternalLink className="w-4 h-4" /> Go to Marketplace</a>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My API Keys */}
      {activeTab === 'mykeys' && (
        <div className="space-y-6">
          {/* Create Key Button */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search API keys..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
            </div>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="primary-btn flex items-center space-x-2 ml-4">
              <Plus className="w-4 h-4" /><span>Create Key</span>
            </button>
          </div>

          {/* Create Key Form */}
          {showCreateForm && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New API Key</h3>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Key name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production - edge" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Free tier limit</label>
                    <input type="number" min={0} value={newFreeTierLimit} onChange={(e) => setNewFreeTierLimit(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per request (Rs)</label>
                    <input type="number" min={0} step={0.001} value={newPricePerRequest} onChange={(e) => setNewPricePerRequest(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={createKey.isPending || !name.trim()} className="primary-btn px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50">{createKey.isPending ? 'Creating...' : 'Create API Key'}</button>
                </div>
              </form>
            </div>
          )}

          {/* My API Keys List */}
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My API Keys</h3>
              <div className="space-y-4">
                {filteredManualKeys.map((key) => {
                  const pricing = getPricingDisplay(key)
                  return (
                    <div key={key.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${key.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">{key.name} {pricing.badge}</div>
                          <div className="text-sm text-gray-500">{key.maskedKey}</div>
                          {key.linkedApi && <div className="text-xs text-green-600 mt-1">Linked to: {key.linkedApi.name}</div>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{key.callCount.toLocaleString()} calls</div>
                          <div className="text-xs text-gray-500">{pricing.freeDisplay}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{pricing.priceDisplay}</div>
                          <div className="w-16"><SparklineChart data={Array.from({ length: 20 }, () => Math.floor(Math.random() * 100) + 50)} /></div>
                        </div>
                        <div className="relative">
                          <button onClick={() => setActiveDropdown(activeDropdown === key.id ? null : key.id)} className="p-2 text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {activeDropdown === key.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <div className="py-1">
                                {!key.linkedApi ? (
                                  <button onClick={() => openLinkModal(key.id)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"><Link className="w-4 h-4 mr-2" /> Link API</button>
                                ) : (
                                  <button onClick={() => handleUnlink(key.id)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"><Link2 className="w-4 h-4 mr-2" /> Unlink</button>
                                )}
                                <button onClick={() => startEditing(key.id, key.freeTierLimit, key.pricePerRequest)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"><Edit className="w-4 h-4 mr-2" /> Edit</button>
                                {key.status === 'active' && <button onClick={() => handleManualRotate(key.id)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"><RotateCw className="w-4 h-4 mr-2" /> Rotate</button>}
                                <button onClick={() => handleManualRevoke(key.id)} className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"><Trash2 className="w-4 h-4 mr-2" /> Revoke</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredManualKeys.length === 0 && (
                  <div className="text-center py-8"><div className="text-gray-500">No API keys found</div></div>
                )}
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {createKey.isError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{getQueryErrorMessage(createKey.error)}</div>}
          {updateKey.isError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{getQueryErrorMessage(updateKey.error)}</div>}
          {rotateKey.isError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{getQueryErrorMessage(rotateKey.error)}</div>}
          {bindKey.isError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{getQueryErrorMessage(bindKey.error)}</div>}
          {deleteKey.isError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{getQueryErrorMessage(deleteKey.error)}</div>}
        </div>
      )}

      {/* Revealed Key Modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div><h3 className="text-lg font-semibold text-gray-900">API Key Created</h3><p className="mt-1 text-sm text-gray-500">{revealedKey.name} - This key will not be shown again</p></div>
                <button onClick={() => setRevealedKey(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="mt-4"><div className="p-3 bg-gray-50 rounded-lg font-mono text-sm text-gray-900 break-all">{revealedKey.key}</div></div>
              <div className="mt-4 flex justify-end">
                <button onClick={onCopy} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  {copied ? <><Check className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingKeyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div><h3 className="text-lg font-semibold text-gray-900">Edit API Key</h3><p className="mt-1 text-sm text-gray-500">Update free tier limit and pricing</p></div>
                <button onClick={() => setEditingKeyId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Free tier limit</label>
                  <input type="number" min={0} value={editFreeTierLimit} onChange={(e) => setEditFreeTierLimit(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per request (Rs)</label>
                  <input type="number" min={0} step={0.001} value={editPricePerRequest} onChange={(e) => setEditPricePerRequest(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setEditingKeyId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleEdit} disabled={updateKey.isPending} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">{updateKey.isPending ? 'Updating...' : 'Update'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link API Modal */}
      {linkingKeyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div><h3 className="text-lg font-semibold text-gray-900">Link API</h3><p className="mt-1 text-sm text-gray-500">Select an API to link with this key</p></div>
                <button onClick={closeLinkModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="mt-4">
                {!apis.data || apis.data.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No registered APIs available. Create an API first.</div>
                ) : (
                  <select value={selectedApiId} onChange={(e) => setSelectedApiId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20">
                    <option value="">Select an API</option>
                    {apis.data.map((api) => <option key={api.id} value={api.id}>{api.name} - {api.baseUrl}</option>)}
                  </select>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={closeLinkModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleLink} disabled={!selectedApiId || bindKey.isPending} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">{bindKey.isPending ? 'Linking...' : 'Link API'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-center mb-4"><div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center"><AlertCircle className="w-6 h-6 text-red-600" /></div></div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Revoke API Access?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This will permanently revoke your access to this API.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowRevokeModal(false); setKeyToRevoke(null); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleRevoke} disabled={deleteKey.isPending} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {deleteKey.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Revoking...</> : <><Trash2 className="w-4 h-4" /> Revoke Access</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
