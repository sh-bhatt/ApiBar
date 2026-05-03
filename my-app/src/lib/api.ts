import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios'

export const AUTH_TOKEN_KEY = 'meterflow_jwt'
export const REFRESH_TOKEN_KEY = 'meterflow_refresh_jwt'

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

let refreshPromise: Promise<string | null> | null = null

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  console.log('[meterflow api] attaching access token', {
    url: config.url,
    hasToken: Boolean(token),
    token,
  })
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (!isAxiosError(err) || err.response?.status !== 401 || !err.config) {
      return Promise.reject(err)
    }

    const originalRequest = err.config as RetryableRequestConfig
    const requestUrl = originalRequest.url ?? ''

    if (
      originalRequest._retry ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh')
    ) {
      clearStoredToken()
      redirectToLogin()
      return Promise.reject(err)
    }

    originalRequest._retry = true

    const nextAccessToken = await refreshAccessToken()
    if (!nextAccessToken) {
      clearStoredToken()
      redirectToLogin()
      return Promise.reject(err)
    }

    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`
    return api(originalRequest)
  },
)

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const { data } = await refreshClient.post<{ accessToken: string }>('/auth/refresh', {
        refreshToken,
      })
      setStoredToken(data.accessToken)
      return data.accessToken
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function redirectToLogin() {
  const path = window.location.pathname
  if (path !== '/login' && path !== '/register') {
    window.location.assign('/login')
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function setStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function setStoredAuthTokens(accessToken: string, refreshToken: string): void {
  setStoredToken(accessToken)
  setStoredRefreshToken(refreshToken)
}

export function clearStoredToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
