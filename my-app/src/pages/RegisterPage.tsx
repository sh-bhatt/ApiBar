import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Mail, Lock, User, Zap, Shield, CreditCard, Rocket, Plug, Gift } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { api, getStoredToken, setStoredAuthTokens } from '../lib/api'
import toast from 'react-hot-toast'

export function RegisterPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (getStoredToken()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'provider' | 'consumer'>('provider')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Google OAuth using useGoogleLogin hook
  const googleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Get user info from Google
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        }).then(r => r.json())

        // Send to our backend with selected role
        const { data } = await api.post('/auth/google', { userInfo, role })
        setStoredAuthTokens(data.accessToken, data.refreshToken)
        navigate('/dashboard', { replace: true })
        toast.success('Successfully registered with Google!')
      } catch (err) {
        toast.error('Failed to register with Google')
        console.error('Google register error:', err)
      }
    },
    onError: () => toast.error('Google registration failed')
  })

  // GitHub register handler (coming soon)
  const handleGitHubRegister = () => {
    toast('GitHub login coming soon!', {
      icon: '🚧',
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const { data } = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/register',
        {
        email,
        password,
        name,
        role,
        },
      )
      setStoredAuthTokens(data.accessToken, data.refreshToken)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(resolveErrorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600 p-12 flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold text-xl">MF</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">MeterFlow</h1>
              <p className="text-purple-200 text-sm">The API billing platform for modern developers</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Real-time usage tracking</h3>
                <p className="text-purple-200 text-sm mt-1">Monitor API usage in real-time with detailed analytics</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Secure API key management</h3>
                <p className="text-purple-200 text-sm mt-1">Enterprise-grade security for your API keys</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Automated billing & invoicing</h3>
                <p className="text-purple-200 text-sm mt-1">Seamless billing automation with detailed invoices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="flex items-center space-x-2 text-purple-200 text-sm">
          <span>Trusted by 1000+ developers</span>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-white p-8 lg:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center space-x-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">MF</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MeterFlow</h1>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create account</h2>
            <p className="text-gray-600">Join thousands of developers using MeterFlow</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose your role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('provider')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    role === 'provider'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Rocket className="w-6 h-6 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">API Provider</h3>
                  <p className="text-xs mt-1 opacity-75">Create and monetize your APIs</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('consumer')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    role === 'consumer'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Plug className="w-6 h-6 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">API Consumer</h3>
                  <p className="text-xs mt-1 opacity-75">Access and use third-party APIs</p>
                </button>
              </div>
            </div>

            {/* Free Tier Badge */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Free Tier Included</p>
                  <p className="text-xs text-purple-700">1,000 free requests per month</p>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Create a strong password"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">At least 8 characters</p>
            </div>

            {/* Error Message */}
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                {error}
              </div>
            ) : null}

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or continue with</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Social Login Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => googleRegister()}
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">Google</span>
            </button>
            <button 
              onClick={handleGitHubRegister}
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">GitHub</span>
            </button>
          </div>

          {/* Login Link */}
          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-purple-600 hover:text-purple-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function resolveErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return formatError(data.error)
    if (err.response?.status === 409) return 'That email is already registered.'
    if (err.response?.status === 400) return 'Check your email and password.'
  }
  return 'Something went wrong. Try again.'
}

function formatError(code: string): string {
  switch (code) {
    case 'email_already_registered':
      return 'That email is already registered.'
    case 'password_min_length_8':
      return 'Password must be at least 8 characters.'
    case 'email_and_password_required':
      return 'Email and password are required.'
    default:
      return 'Registration failed. Please try again.'
  }
}
