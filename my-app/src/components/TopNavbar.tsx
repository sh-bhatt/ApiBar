import { Search, Bell, ChevronDown, LogOut, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, clearStoredToken } from '../lib/api'

interface UserProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'provider' | 'consumer'
  plan: 'free' | 'pro'
  createdAt: string
  avatar: string
}

interface Notification {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  createdAt: string
  read: boolean
  link: string
}

export function TopNavbar() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set())

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      /* Clear local auth state even if server logout fails */
    } finally {
      clearStoredToken()
      navigate('/login', { replace: true })
    }
  }

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile')
      return data as UserProfile
    }
  })

  // Fetch notifications with 60-second refetch interval
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<Notification[]>('/notifications')
      return data
    },
    refetchInterval: 60000, // Refetch every 60 seconds
  })

  const unreadCount = notifications?.filter(n => !readNotifications.has(n.id)).length ?? 0

  function markAllAsRead() {
    if (notifications) {
      setReadNotifications(new Set(notifications.map(n => n.id)))
    }
  }

  function handleNotificationClick(link: string) {
    navigate(link)
    setShowNotifications(false)
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">MF</span>
        </div>
        <span className="text-xl font-bold gradient-text">MeterFlow</span>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search APIs, keys, or documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {!notifications || notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const isRead = readNotifications.has(notification.id)
                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.link)}
                        className={`p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors ${
                          isRead ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.createdAt)}</p>
                          </div>
                          {!isRead && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          {profile && (
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#6C63FF] to-[#3B82F6] flex items-center justify-center">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {profile?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                       || profile?.email?.split('@')[0].substring(0, 2).toUpperCase()
                       || 'U'}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{profile?.name || 'User'}</p>
                <div className="flex items-center space-x-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    profile?.role === 'admin' ? 'bg-red-500 text-white' :
                    profile?.role === 'provider' ? 'bg-green-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {profile?.role?.toUpperCase() || 'USER'}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          )}

          {showProfile && profile && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#6C63FF] to-[#3B82F6] flex items-center justify-center flex-shrink-0">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-xs">
                        {profile?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                           || profile?.email?.split('@')[0].substring(0, 2).toUpperCase()
                           || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{profile?.name || 'User'}</p>
                    <p className="text-sm text-gray-500 truncate">{profile?.email || 'user@example.com'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    profile?.role === 'admin' ? 'bg-red-500 text-white' :
                    profile?.role === 'provider' ? 'bg-green-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {profile?.role?.toUpperCase() || 'USER'}
                  </span>
                  <span className="text-xs bg-gradient-to-r from-[#6C63FF] to-[#3B82F6] text-white px-2 py-1 rounded-full font-medium">
                    {profile?.plan?.toUpperCase() || 'FREE'} PLAN
                  </span>
                </div>
              </div>
              <div className="py-2">
                <button
                  onClick={() => { navigate('/dashboard/profile'); setShowProfile(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => { navigate('/dashboard/invoices'); setShowProfile(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Billing
                </button>
                <button
                  onClick={() => { navigate('/dashboard/docs'); setShowProfile(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  API Documentation
                </button>
                <hr className="my-2 border-gray-200" />
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
