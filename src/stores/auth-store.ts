import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { useRoleStore, type UserRole } from '@/stores/useRoleStore'

export const ACCESS_TOKEN_COOKIE = 'kantin_access_token'
export const ACCESS_TOKEN_STORAGE = 'kantin_token'
export const AUTH_USER_STORAGE = 'kantin_user'

export interface AuthUser {
  userId: string | number
  nama: string
  email: string
  username?: string
  sekolahId: number
  sekolahNama: string
  roles: string[]
  currentRole: UserRole
  exp?: number
}

interface AuthState {
  auth: {
    user: AuthUser | null
    accessToken: string
    setUser: (user: AuthUser | null) => void
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
    isAuthenticated: () => boolean
    hasRole: (allowedRoles: UserRole[]) => boolean
  }
}

function parseStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function parseStoredToken(): string {
  if (typeof window === 'undefined') return ''
  const cookieVal = getCookie(ACCESS_TOKEN_COOKIE)
  if (cookieVal) {
    try {
      return JSON.parse(cookieVal)
    } catch {
      return cookieVal
    }
  }
  return localStorage.getItem(ACCESS_TOKEN_STORAGE) || ''
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const initialToken = parseStoredToken()
  const initialUser = parseStoredUser()

  if (initialUser) {
    useRoleStore.getState().setRole(initialUser.currentRole)
    useRoleStore.getState().setSchoolName(initialUser.sekolahNama)
    useRoleStore.getState().setUserName(initialUser.nama)
    useRoleStore.getState().setUserEmail(initialUser.username || initialUser.email)
  }

  return {
    auth: {
      user: initialUser,
      accessToken: initialToken,

      setUser: (user) => {
        if (user) {
          localStorage.setItem(AUTH_USER_STORAGE, JSON.stringify(user))
          // Sinkronisasi ke useRoleStore untuk header, sidebar, dan profil
          useRoleStore.getState().setRole(user.currentRole)
          useRoleStore.getState().setSchoolName(user.sekolahNama)
          useRoleStore.getState().setUserName(user.nama)
          useRoleStore.getState().setUserEmail(user.username || user.email)
        } else {
          localStorage.removeItem(AUTH_USER_STORAGE)
          useRoleStore.getState().setUserName('')
          useRoleStore.getState().setUserEmail('')
        }
        set((state) => ({ ...state, auth: { ...state.auth, user } }))
      },

      setAccessToken: (accessToken) => {
        if (accessToken) {
          setCookie(ACCESS_TOKEN_COOKIE, JSON.stringify(accessToken))
          localStorage.setItem(ACCESS_TOKEN_STORAGE, accessToken)
        } else {
          removeCookie(ACCESS_TOKEN_COOKIE)
          localStorage.removeItem(ACCESS_TOKEN_STORAGE)
        }
        set((state) => ({ ...state, auth: { ...state.auth, accessToken } }))
      },

      resetAccessToken: () => {
        removeCookie(ACCESS_TOKEN_COOKIE)
        localStorage.removeItem(ACCESS_TOKEN_STORAGE)
        set((state) => ({ ...state, auth: { ...state.auth, accessToken: '' } }))
      },

      reset: () => {
        removeCookie(ACCESS_TOKEN_COOKIE)
        localStorage.removeItem(ACCESS_TOKEN_STORAGE)
        localStorage.removeItem(AUTH_USER_STORAGE)
        useRoleStore.getState().setRole('admin')
        useRoleStore.getState().setUserName('')
        useRoleStore.getState().setUserEmail('')
        set((state) => ({
          ...state,
          auth: { ...state.auth, user: null, accessToken: '' },
        }))
      },

      isAuthenticated: () => {
        const token = get().auth.accessToken || parseStoredToken()
        return Boolean(token && token.trim().length > 0)
      },

      hasRole: (allowedRoles: UserRole[]) => {
        const user = get().auth.user || parseStoredUser()
        if (!user) return false
        return allowedRoles.includes(user.currentRole)
      },
    },
  }
})
