import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '../components/PageLoader'
import { Users, Mail, Shield, ChevronDown, RefreshCw, DollarSign, TrendingUp, Wallet } from 'lucide-react'
import { api } from '../lib/api'
import { getQueryErrorMessage } from '../lib/queryError'

interface User {
  _id: string
  email: string
  name: string
  role: 'admin' | 'provider' | 'consumer'
  plan: 'free' | 'pro'
  createdAt: string
  totalRequests: number
  apisProvided: number
  apisConsuming: number
  totalSpend: number
}

interface PlatformStats {
  totalUsers: number
  totalProviders: number
  totalConsumers: number
  totalAdmins: number
  totalApis: number
  totalRequests: number
  totalRevenue: number
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800 border-red-200'
    case 'provider': return 'bg-green-100 text-green-800 border-green-200'
    case 'consumer': return 'bg-blue-100 text-blue-800 border-blue-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getPlanBadgeColor(plan: string) {
  switch (plan) {
    case 'pro': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'free': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function RoleDropdown({ user, onRoleChange }: { user: User; onRoleChange: (userId: string, role: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const roles = ['admin', 'provider', 'consumer'] as const

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 transition-colors ${getRoleBadgeColor(user.role)}`}
      >
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => {
                  onRoleChange(user._id, role)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors ${
                  role === user.role 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function AdminPage() {
  const queryClient = useQueryClient()

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users')
      return data as User[]
    }
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats')
      return data as PlatformStats
    }
  })

  const { data: revenue } = useQuery({
    queryKey: ['admin', 'revenue'],
    queryFn: async () => {
      const { data } = await api.get('/admin/revenue')
      return data as {
        totalRevenue: number
        totalGMV: number
        totalProviderPayouts: number
        thisMonthRevenue: number
        commissionRate: number
      }
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    }
  })

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ userId, role })
  }

  const isLoading = usersLoading || statsLoading
  const error = usersError

  if (isLoading) {
    return <PageLoader label="Loading admin dashboard" />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {getQueryErrorMessage(error)}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage users and monitor platform statistics.
        </p>
      </header>

      {/* Platform Stats */}
      {stats && (
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Platform Statistics</h2>
            <p className="mt-1 text-sm text-gray-600">
              Overview of platform usage and user distribution.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {stats.totalProviders} Providers · {stats.totalConsumers} Consumers · {stats.totalAdmins} Admins
                  </div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalRequests.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Requests</div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalApis}</div>
                  <div className="text-sm text-gray-600">APIs Registered</div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Revenue Stats */}
      {revenue && (
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
            <p className="mt-1 text-sm text-gray-600">
              Platform revenue and provider payouts.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Platform commission: <span className="font-semibold">{(revenue.commissionRate * 100).toFixed(0)}%</span>
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">₹{revenue.totalGMV.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total GMV</div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">₹{revenue.totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Platform Revenue</div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">₹{revenue.totalProviderPayouts.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Provider Payouts</div>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">₹{revenue.thisMonthRevenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">This Month Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Users Table */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            View and manage all registered users.
          </p>
        </div>
        
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    APIs Provided
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    APIs Consuming
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Requests
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spend
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users?.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            Joined {formatDate(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {user.role === 'provider' ? user.apisProvided : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {user.apisConsuming > 0 ? user.apisConsuming : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {user.totalRequests.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      ₹{user.totalSpend.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPlanBadgeColor(user.plan)}`}>
                        {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <RoleDropdown user={user} onRoleChange={handleRoleChange} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users?.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
