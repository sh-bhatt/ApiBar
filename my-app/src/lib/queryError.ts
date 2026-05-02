import { isAxiosError } from 'axios'

export function getQueryErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined
    if (data?.error && typeof data.error === 'string') return data.error
    if (data?.message && typeof data.message === 'string') return data.message
    if (err.response?.status === 401) return 'Session expired. Please log in again.'
    if (err.response?.status === 404) return 'Not found.'
    if (err.message) return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}
