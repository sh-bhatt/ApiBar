import { type FormEvent, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Plus, MoreVertical, Link, Link2, Edit, RotateCw, Trash2, X, Check, Copy } from 'lucide-react'
import { PageLoader } from '../components/PageLoader'
import { SparklineChart } from '../components/SparklineChart'
import {
  useApiKeys,
  useCreateApiKey,
  useRotateApiKey,
  useUpdateApiKey,
  useBindApiKey,
  useDeleteApiKey,
  useApis,
} from '../hooks/useMeterflowApi'
import { getQueryErrorMessage } from '../lib/queryError'

export function ApiKeysPage() {
  const queryClient = useQueryClient()
  const keys = useApiKeys()
  const apis = useApis()
  const createKey = useCreateApiKey()
  const rotateKey = useRotateApiKey()
  const updateKey = useUpdateApiKey()
  const bindKey = useBindApiKey()
  const deleteKey = useDeleteApiKey()
  
  const [name, setName] = useState('')
  const [newFreeTierLimit, setNewFreeTierLimit] = useState('1000')
  const [newPricePerRequest, setNewPricePerRequest] = useState('0.005')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // Dropdown and modal states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<any>(null)
  const [linkingKeyId, setLinkingKeyId] = useState<string | null>(null)
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [editFreeTierLimit, setEditFreeTierLimit] = useState('')
  const [editPricePerRequest, setEditPricePerRequest] = useState('')
  const [selectedApiId, setSelectedApiId] = useState('')
  const [copied, setCopied] = useState(false)

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

  async function handleRotate(keyId: string) {
    setActiveDropdown(null)
    const result = await rotateKey.mutateAsync(keyId)
    setRevealedKey(result)
  }

  async function handleUnlink(keyId: string) {
    setActiveDropdown(null)
    await bindKey.mutateAsync({ keyId, apiId: null })
  }

  async function handleRevoke(keyId: string) {
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

  if (keys.isLoading) {
    return <PageLoader label="Loading API keys" />
  }

  if (keys.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {getQueryErrorMessage(keys.error)}
      </div>
    )
  }

  // Filter keys based on search query
  const filteredKeys = keys.data?.filter(key =>
    key.status === 'active' &&
    (key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.maskedKey.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create keys for your integrations, rotate them safely, and configure per-key free tier limits.
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="primary-btn flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Key</span>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search API keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
          />
        </div>
      </div>

      {/* Create Key Form */}
      {showCreateForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New API Key</h3>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="new-key-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Key name
                </label>
                <input
                  id="new-key-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production - edge"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Free tier limit
                </label>
                <input
                  type="number"
                  min={0}
                  value={newFreeTierLimit}
                  onChange={(e) => setNewFreeTierLimit(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per request (Rs)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.001}
                  value={newPricePerRequest}
                  onChange={(e) => setNewPricePerRequest(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createKey.isPending || !name.trim()}
                className="primary-btn px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {createKey.isPending ? 'Creating...' : 'Create API Key'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* API Keys List */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
          <div className="space-y-4">
            {filteredKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${key.status === 'active' ? 'status-active' : 'status-inactive'}`}></div>
                  <div>
                    <div className="font-medium text-gray-900">{key.name}</div>
                    <div className="text-sm text-gray-500">{key.maskedKey}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{key.callCount.toLocaleString()} calls</div>
                    <div className="text-xs text-gray-500">Free: {key.freeTierLimit?.toLocaleString()}</div>
                  </div>
                  <div className="w-20">
                    <SparklineChart data={Array.from({ length: 20 }, () => Math.floor(Math.random() * 100) + 50)} />
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === key.id ? null : key.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {activeDropdown === key.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          {!key.linkedApi ? (
                            <button
                              onClick={() => openLinkModal(key.id)}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                            >
                              <Link className="w-4 h-4 mr-2" />
                              Link API
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnlink(key.id)}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                            >
                              <Link2 className="w-4 h-4 mr-2" />
                              Unlink
                            </button>
                          )}
                          <button
                            onClick={() => startEditing(key.id, key.freeTierLimit, key.pricePerRequest)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </button>
                          {key.status === 'active' && (
                            <button
                              onClick={() => handleRotate(key.id)}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                            >
                              <RotateCw className="w-4 h-4 mr-2" />
                              Rotate
                            </button>
                          )}
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Revoke
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredKeys.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">No API keys found</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {createKey.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getQueryErrorMessage(createKey.error)}
        </div>
      )}
      {updateKey.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getQueryErrorMessage(updateKey.error)}
        </div>
      )}
      {rotateKey.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getQueryErrorMessage(rotateKey.error)}
        </div>
      )}
      {bindKey.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getQueryErrorMessage(bindKey.error)}
        </div>
      )}
      {deleteKey.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getQueryErrorMessage(deleteKey.error)}
        </div>
      )}

      {/* Revealed Key Modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">API Key Created</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {revealedKey.name} - This key will not be shown again
                  </p>
                </div>
                <button
                  onClick={() => setRevealedKey(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-4">
                <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm text-gray-900 break-all">
                  {revealedKey.key}
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onCopy}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copy</>
                  )}
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit API Key</h3>
                  <p className="mt-1 text-sm text-gray-500">Update free tier limit and pricing</p>
                </div>
                <button
                  onClick={() => setEditingKeyId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Free tier limit
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editFreeTierLimit}
                    onChange={(e) => setEditFreeTierLimit(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price per request (Rs)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={editPricePerRequest}
                    onChange={(e) => setEditPricePerRequest(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setEditingKeyId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={updateKey.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateKey.isPending ? 'Updating...' : 'Update'}
                </button>
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Link API</h3>
                  <p className="mt-1 text-sm text-gray-500">Select an API to link with this key</p>
                </div>
                <button
                  onClick={closeLinkModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-4">
                {!apis.data || apis.data.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No registered APIs available. Create an API first.
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedApiId}
                      onChange={(e) => setSelectedApiId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select an API</option>
                      {apis.data.map((api) => (
                        <option key={api.id} value={api.id}>
                          {api.name} - {api.baseUrl}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeLinkModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLink}
                  disabled={!selectedApiId || bindKey.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {bindKey.isPending ? 'Linking...' : 'Link API'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
