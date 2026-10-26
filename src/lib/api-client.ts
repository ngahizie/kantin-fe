/**
 * Axios API Client untuk Kantin Cashless SKOOLIA
 * Dilengkapi dengan interceptor JWT token, error handling terpusat, dan Mock API adapter.
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { toast } from 'sonner'
import { setupMockAdapter } from '@/mocks/mock-adapter'

import { getCookie } from '@/lib/cookies'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8082'
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

// Pasang Mock Adapter jika VITE_USE_MOCK=true
if (useMock) {
  // eslint-disable-next-line no-console
  console.info('⚡ [Kantin-FE] Mock API Layer AKTIF (VITE_USE_MOCK=true).')
  setupMockAdapter(apiClient)
  setupMockAdapter(axios)
} else {
  // eslint-disable-next-line no-console
  console.info(`🌐 [Kantin-FE] Terhubung ke server backend: ${baseURL}`)
}

// Request Interceptor: Otomatis cantumkan Authorization Bearer token jika ada
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token =
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('kantin_token')
        : null) ||
      (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('kantin_token')
        : null)
    if (!token) {
      const cookieVal = getCookie('kantin_access_token')
      if (cookieVal) {
        try {
          token = JSON.parse(cookieVal)
        } catch {
          token = cookieVal
        }
      }
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Tangani error umum (401, 403, 500)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; status?: string }>) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || 'Terjadi kesalahan sistem'
    const isSilent = Boolean(
      (error.config as { silent?: boolean; skipToast?: boolean } | undefined)?.silent ||
      (error.config as { silent?: boolean; skipToast?: boolean } | undefined)?.skipToast
    )

    if (status === 401) {
      // Token expired atau unauthenticated
      localStorage.removeItem('kantin_token')
      localStorage.removeItem('kantin_user')
      sessionStorage.removeItem('kantin_token')
      // Jika bukan di halaman login, redirect
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/sign-in')) {
        toast.error('Sesi Anda telah berakhir, silakan login kembali')
        window.location.href = '/sign-in'
      }
    } else if (status === 403) {
      if (!isSilent) {
        toast.error('Anda tidak memiliki hak akses untuk aksi ini')
      }
    } else if (status && status >= 500) {
      if (!isSilent) {
        toast.error(`Kesalahan Server (${status}): ${message}`)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
