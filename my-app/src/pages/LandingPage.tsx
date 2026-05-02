import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap,
  CreditCard,
  BarChart3,
  Key,
  ShoppingCart,
  Shield,
  Check,
  ArrowRight,
  Menu,
  X,
  ChevronRight,
  Globe,
  Code2,
  TrendingUp,
  Lock,
  Server
} from 'lucide-react'

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MF</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                MeterFlow
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Docs
              </button>
              <button
                onClick={() => scrollToSection('footer')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                About
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={() => scrollToSection('features')}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Docs
              </button>
              <button
                onClick={() => scrollToSection('footer')}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                About
              </button>
              <hr className="my-2" />
              <Link
                to="/login"
                className="block px-3 py-2 text-gray-700 font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="block px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium text-center"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-purple-50 via-white to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              The API Marketplace & Billing Platform for{' '}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Modern Developers
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Publish your APIs, set flexible pricing, and let developers discover and integrate them instantly.
              Usage-based billing handled automatically.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                to="/register"
                className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center"
              >
                Start for Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => scrollToSection('features')}
                className="px-8 py-4 bg-white text-gray-700 border border-gray-300 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all flex items-center"
              >
                View Demo
              </button>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Mock Header */}
              <div className="bg-gray-900 px-6 py-4 flex items-center space-x-2">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-gray-400 text-sm">dashboard.meterflow.app</span>
                </div>
              </div>
              {/* Mock Content */}
              <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs">Total Requests</span>
                      <Zap className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">24.5K</p>
                    <p className="text-green-500 text-xs">+12% this month</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs">Revenue</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">₹45,230</p>
                    <p className="text-green-500 text-xs">+8% this month</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs">Active APIs</span>
                      <Server className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">8</p>
                    <p className="text-gray-400 text-xs">2 pending review</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500 text-xs">Success Rate</span>
                      <Shield className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">99.8%</p>
                    <p className="text-green-500 text-xs">+0.2% this week</p>
                  </div>
                </div>
                {/* Mock Chart Area */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">API Usage Analytics</h3>
                    <div className="flex space-x-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">7 days</span>
                    </div>
                  </div>
                  <div className="h-32 flex items-end space-x-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t-sm"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-200 rounded-full blur-3xl opacity-60" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-60" />
          </div>

          {/* Stats Bar */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-purple-600" />
              <span>3 Pricing Models</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-purple-600" />
              <span>Real-time Analytics</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-purple-600" />
              <span>Automated Billing</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block" />
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-purple-600" />
              <span>Secure Gateway</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to monetize your APIs
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From publishing to billing, MeterFlow handles the complex parts so you can focus on building great APIs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">API Gateway</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Route all requests through our secure gateway with automatic rate limiting and request validation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Flexible Billing</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Per request, tiered, monthly flat, or free. Set the pricing model that works for your business.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Track every request, latency, error rate, and revenue in real time with detailed insights.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-gray-100">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Key className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">API Key Management</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Generate, rotate, and revoke API keys with one click. Full control over access.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-gray-100">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">API Marketplace</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Consumers discover and access your APIs from one central marketplace. More visibility, more usage.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-gray-100">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise Security</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                JWT authentication, rate limiting, and credit limit enforcement built in from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple for providers. Powerful for consumers.
            </h2>
            <p className="text-lg text-gray-600">
              Get started in minutes, scale to millions of requests.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Providers */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">For API Providers</h3>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Register your API</h4>
                    <p className="text-gray-600 text-sm mt-1">Add your API endpoints and choose your pricing model.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Share your gateway URL</h4>
                    <p className="text-gray-600 text-sm mt-1">Consumers access your API through our secure gateway.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Watch usage and earnings</h4>
                    <p className="text-gray-600 text-sm mt-1">Real-time analytics show requests, revenue, and growth.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Consumers */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">For API Consumers</h3>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Browse the marketplace</h4>
                    <p className="text-gray-600 text-sm mt-1">Discover APIs by category, popularity, or pricing.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Get instant API access</h4>
                    <p className="text-gray-600 text-sm mt-1">Generate API keys and start integrating immediately.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Pay only for what you use</h4>
                    <p className="text-gray-600 text-sm mt-1">Transparent billing based on your actual API consumption.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600">
              Start free, upgrade when you need more.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Free</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">₹0</span>
                  <span className="text-gray-500 ml-2">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  1,000 requests/month
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  1 API
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Basic analytics
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Community support
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-center hover:border-purple-600 hover:text-purple-600 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl transform scale-105">
              <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium mb-4">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold">Pro</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-bold">₹999</span>
                  <span className="text-white/70 ml-2">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-white/90">
                  <Check className="w-4 h-4 text-white mr-2 flex-shrink-0" />
                  Unlimited requests
                </li>
                <li className="flex items-center text-sm text-white/90">
                  <Check className="w-4 h-4 text-white mr-2 flex-shrink-0" />
                  10 APIs
                </li>
                <li className="flex items-center text-sm text-white/90">
                  <Check className="w-4 h-4 text-white mr-2 flex-shrink-0" />
                  Advanced analytics
                </li>
                <li className="flex items-center text-sm text-white/90">
                  <Check className="w-4 h-4 text-white mr-2 flex-shrink-0" />
                  Priority support
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full py-3 px-4 bg-white text-purple-600 rounded-xl font-semibold text-center hover:bg-gray-100 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">Custom</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Unlimited everything
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Dedicated support
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Custom SLA
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  On-premise option
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-center hover:border-purple-600 hover:text-purple-600 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              Get Started Free
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to monetize your APIs?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Join thousands of developers who trust MeterFlow for their API billing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg"
            >
              Start for Free
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Logo & Tagline */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MF</span>
                </div>
                <span className="text-xl font-bold text-white">MeterFlow</span>
              </div>
              <p className="text-sm text-gray-400">
                The API billing platform for modern developers.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">
                    Pricing
                  </button>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-white transition-colors">Get Started</Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">
                    How it Works
                  </button>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">About Us</span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">Contact</span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">Blog</span>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">Cookie Policy</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-gray-400">
              © 2026 MeterFlow. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Code2 className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Lock className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
