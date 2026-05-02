import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { AdminPage } from './pages/AdminPage'
import { ApisPage } from './pages/ApisPage'
import { BalancePage } from './pages/BalancePage'
import { DashboardPage } from './pages/DashboardPage'
import { EarningsPage } from './pages/EarningsPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { MyApisPage } from './pages/MyApisPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'
import { UsagePage } from './pages/UsagePage'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder'}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="apis" element={<ApisPage />} />
                <Route path="marketplace" element={<MarketplacePage />} />
                <Route path="my-apis" element={<MyApisPage />} />
                <Route path="usage" element={<UsagePage />} />
                <Route path="balance" element={<BalancePage />} />
                <Route path="earnings" element={<EarningsPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  )
}




