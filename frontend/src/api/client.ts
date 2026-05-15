import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// Exported navigation helper — replace in tests via vi.spyOn(_nav, 'redirectToLogin')
export const _nav = {
  redirectToLogin() {
    const { pathname } = window.location
    if (pathname !== '/login' && pathname !== '/signup') {
      window.location.href = '/login'
    }
  },
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

interface QueueEntry {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}

let isRefreshing = false
let waitQueue: QueueEntry[] = []

// Exported for test cleanup between cases
export function resetRefreshState() {
  isRefreshing = false
  waitQueue = []
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    const original = error.config as RetriableConfig | undefined

    if (error.response?.status !== 401 || !original || original._retried) {
      return Promise.reject(error)
    }

    // Refresh endpoint itself returning 401 → drain queue with error, do not retry
    if (original.url?.endsWith('/api/auth/refresh')) {
      waitQueue.forEach(({ reject }) => reject(error))
      waitQueue = []
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<unknown>((resolve, reject) => {
        waitQueue.push({
          resolve: (newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`
            original._retried = true
            resolve(apiClient(original))
          },
          reject,
        })
      })
    }

    original._retried = true
    isRefreshing = true

    try {
      const { data } = await apiClient.post<{ success: true; data: { accessToken: string } }>(
        '/api/auth/refresh',
      )
      const newToken = data.data.accessToken
      useAuthStore.getState().setAccessToken(newToken)
      waitQueue.forEach(({ resolve }) => resolve(newToken))
      waitQueue = []
      original.headers.Authorization = `Bearer ${newToken}`
      return apiClient(original)
    } catch {
      waitQueue.forEach(({ reject }) => reject(error))
      waitQueue = []
      useAuthStore.getState().clearAuth()
      _nav.redirectToLogin()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
