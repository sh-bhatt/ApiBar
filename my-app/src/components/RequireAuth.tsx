import { Navigate, Outlet } from 'react-router-dom'
import { getStoredToken } from '../lib/api'

export function RequireAuth() {
  if (!getStoredToken()) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
