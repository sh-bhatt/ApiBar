import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, clearStoredToken } from '../lib/api'
import {
  LayoutDashboard,
  Globe,
  Key,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  User,
  UserCircle,
  Shield,
  ChevronDown,
  ShoppingBag,
  Zap,
  Wallet,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { TopNavbar } from './TopNavbar'

interface UserProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'provider' | 'consumer'
  plan: 'free' | 'pro'
  createdAt: string
}

export function Layout() {
  const navigate = useNavigate()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile')
      return data as UserProfile
    }
  })

  // Dynamic navigation based on user role
  const getNavigationItems = () => {
    const baseNav = [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ]

    // Add Admin link only for admin users
    if (profile?.role === 'admin') {
      baseNav.push({ to: '/dashboard/admin', label: 'Admin', icon: Shield, end: false })
    }

    // Add API-related links for providers (includes marketplace features)
    if (profile?.role === 'provider') {
      baseNav.push(
        { to: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingBag, end: false },
        { to: '/dashboard/apis', label: 'APIs', icon: Globe, end: false },
        { to: '/dashboard/my-apis', label: 'My APIs', icon: Zap, end: false },
        { to: '/dashboard/balance', label: 'Balance', icon: Wallet, end: false },
        { to: '/dashboard/usage', label: 'Usage', icon: BarChart3, end: false },
        { to: '/dashboard/earnings', label: 'Earnings', icon: TrendingUp, end: false },
        { to: '/dashboard/invoices', label: 'Invoices', icon: FileText, end: false }
      )
    }

    // Add admin-specific links (admins have full access including marketplace)
    if (profile?.role === 'admin') {
      baseNav.push(
        { to: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingBag, end: false },
        { to: '/dashboard/my-apis', label: 'My APIs', icon: Zap, end: false },
        { to: '/dashboard/apis', label: 'APIs', icon: Globe, end: false },
        { to: '/dashboard/balance', label: 'Balance', icon: Wallet, end: false },
        { to: '/dashboard/usage', label: 'Usage', icon: BarChart3, end: false },
        { to: '/dashboard/invoices', label: 'Invoices', icon: FileText, end: false }
      )
    }

    // Add Consumer-specific links
    if (profile?.role === 'consumer') {
      baseNav.push(
        { to: '/dashboard/marketplace', label: 'Marketplace', icon: ShoppingBag, end: false },
        { to: '/dashboard/my-apis', label: 'My APIs', icon: Zap, end: false },
        { to: '/dashboard/balance', label: 'Balance', icon: Wallet, end: false },
        { to: '/dashboard/usage', label: 'Usage', icon: BarChart3, end: false },
        { to: '/dashboard/invoices', label: 'Invoices', icon: FileText, end: false }
      )
    }

    // Add Profile for all users
    baseNav.push({ to: '/dashboard/profile', label: 'Profile', icon: UserCircle, end: false })

    return baseNav
  }

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

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Fixed Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-screen sidebar-bg z-20">
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MF</span>
              </div>
              <div>
                <div className="text-lg font-semibold text-white">MeterFlow</div>
                <div className="text-xs text-white/70">usage-based billing</div>
              </div>
            </div>
          </div>

          {/* Navigation - takes all available space */}
          <nav className="flex-1 flex-col gap-1 p-4 overflow-y-auto">
            {getNavigationItems().map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* User Profile Section - pushed to bottom */}
          <div className="mt-auto border-t border-white/10 p-4">
            {profile && (
              <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-[#6C63FF] to-[#3B82F6] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {profile?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() 
                     || profile?.email?.split('@')[0].substring(0, 2).toUpperCase() 
                     || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{profile?.name || 'User'}</div>
                  <div className="flex items-center space-x-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      profile?.role === 'admin' ? 'bg-red-500 text-white' :
                      profile?.role === 'provider' ? 'bg-green-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {profile?.role?.toUpperCase() || 'USER'}
                    </span>
                    <span className="text-xs bg-gradient-to-r from-[#6C63FF] to-[#3B82F6] text-white px-2 py-0.5 rounded-full font-medium">
                      {profile?.plan?.toUpperCase() || 'FREE'}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </div>
            )}
            
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 mt-3 text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="ml-64">
        {/* Fixed Top Navbar */}
        <div className="fixed top-0 left-64 right-0 z-10 bg-white border-b border-gray-200">
          <TopNavbar />
        </div>
        
        {/* Page Content with padding for fixed navbar */}
        <main className="pt-16">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
