import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '@/lib/api-client'
import type { AuthUser } from './auth-store'

async function importAuthStore() {
  const { useAuthStore } = await import('./auth-store')
  return useAuthStore
}

const sampleUser: AuthUser = {
  userId: '1',
  nama: 'Wibisana Bama',
  email: 'user@example.com',
  sekolahId: 10,
  sekolahNama: 'SMA Negeri 1 SKOOLIA',
  roles: ['ROLE_ADMIN'],
  currentRole: 'admin',
  exp: 1_700_000_000,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    clearCookies()
    vi.resetModules()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('starts with an empty access token when nothing is persisted', async () => {
    const useAuthStore = await importAuthStore()

    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
  })

  it('persists access token so a new store instance reads it back', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setAccessToken('session-token')

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe(
      'session-token'
    )
  })

  it('clears persisted access token when resetAccessToken is used', async () => {
    const useAuthStore = await importAuthStore()
    useAuthStore.getState().auth.setAccessToken('to-clear')
    useAuthStore.getState().auth.resetAccessToken()

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe('')
  })

  it('updates the signed-in user via setUser and syncs with useRoleStore', async () => {
    const useAuthStore = await importAuthStore()
    const { useRoleStore } = await import('./use-role-store')

    useAuthStore.getState().auth.setUser({ ...sampleUser })

    expect(useAuthStore.getState().auth.user).toEqual(sampleUser)
    expect(useRoleStore.getState().userName).toBe(sampleUser.nama)
    expect(useRoleStore.getState().userEmail).toBe(sampleUser.email)
    expect(useRoleStore.getState().schoolName).toBe(sampleUser.sekolahNama)
    expect(useRoleStore.getState().currentRole).toBe(sampleUser.currentRole)
  })

  it('reset clears user and access token and drops persistence', async () => {
    const useAuthStore = await importAuthStore()
    const { useRoleStore } = await import('./use-role-store')
    useAuthStore.getState().auth.setAccessToken('will-be-cleared')
    useAuthStore.getState().auth.setUser({ ...sampleUser })

    useAuthStore.getState().auth.reset()

    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useRoleStore.getState().userName).toBe('')
    expect(useRoleStore.getState().userEmail).toBe('')

    vi.resetModules()
    const useAuthStoreAfterReload = await importAuthStore()

    expect(useAuthStoreAfterReload.getState().auth.user).toBeNull()
    expect(useAuthStoreAfterReload.getState().auth.accessToken).toBe('')
  })

  it('mengosongkan keranjang belanja kasir saat auth.reset dan auth.setUser dipanggil (issue #143)', async () => {
    const useAuthStore = await importAuthStore()
    const { useCartStore } = await import('./use-cart-store')

    // Isi keranjang
    useCartStore.getState().addItem({
      id: 99,
      kategoriId: 1,
      nama: 'Item Kasir Lama',
      hargaJual: 10000,
      satuan: 'PORSI',
      fotoUrl: null,
      stokMinimum: 1,
      stokBerjalan: 5,
      aktif: true,
    })
    expect(useCartStore.getState().items).toHaveLength(1)

    // auth.reset harus mengosongkan keranjang
    useAuthStore.getState().auth.reset()
    expect(useCartStore.getState().items).toHaveLength(0)

    // Isi keranjang kembali
    useCartStore.getState().addItem({
      id: 99,
      kategoriId: 1,
      nama: 'Item Kasir Lama',
      hargaJual: 10000,
      satuan: 'PORSI',
      fotoUrl: null,
      stokMinimum: 1,
      stokBerjalan: 5,
      aktif: true,
    })
    expect(useCartStore.getState().items).toHaveLength(1)

    // auth.setUser saat kasir baru login juga harus mengosongkan keranjang
    useAuthStore.getState().auth.setUser({ ...sampleUser, userId: '2', nama: 'Kasir Baru' })
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('isAuthenticated mengembalikan false jika token JWT kedaluwarsa (exp lampau)', async () => {
    const useAuthStore = await importAuthStore()
    const expPast = Math.floor(Date.now() / 1000) - 3600 // 1 jam lalu
    const expiredPayload = btoa(JSON.stringify({ exp: expPast, sub: 'user1' }))
    const expiredJwt = `header.${expiredPayload}.signature`

    useAuthStore.getState().auth.setAccessToken(expiredJwt)
    expect(useAuthStore.getState().auth.isAuthenticated()).toBe(false)
  })

  it('isAuthenticated mengembalikan true jika token JWT masih aktif (exp masa depan)', async () => {
    const useAuthStore = await importAuthStore()
    const expFuture = Math.floor(Date.now() / 1000) + 3600 // 1 jam ke depan
    const validPayload = btoa(JSON.stringify({ exp: expFuture, sub: 'user1' }))
    const validJwt = `header.${validPayload}.signature`

    useAuthStore.getState().auth.setAccessToken(validJwt)
    expect(useAuthStore.getState().auth.isAuthenticated()).toBe(true)
  })

  it('signOut memanggil POST /api/auth/cabut dan membersihkan semua token lokal (#219)', async () => {
    const useAuthStore = await importAuthStore()
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: { code: 200, message: 'Token dicabut' },
    })

    useAuthStore.getState().auth.setAccessToken('active-token-123')
    useAuthStore.getState().auth.setUser({ ...sampleUser })
    sessionStorage.setItem('kantin_token', 'active-token-123')

    await useAuthStore.getState().auth.signOut()

    expect(postSpy).toHaveBeenCalledWith(
      '/api/auth/cabut',
      null,
      expect.objectContaining({ silent: true })
    )
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(localStorage.getItem('kantin_token')).toBeNull()
    expect(sessionStorage.getItem('kantin_token')).toBeNull()

    postSpy.mockRestore()
  })

  it('signOut tetap membersihkan token lokal jika server offline atau request cabut gagal (#219)', async () => {
    const useAuthStore = await importAuthStore()
    const postSpy = vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network Error'))

    useAuthStore.getState().auth.setAccessToken('active-token-123')
    useAuthStore.getState().auth.setUser({ ...sampleUser })
    sessionStorage.setItem('kantin_token', 'active-token-123')

    await useAuthStore.getState().auth.signOut()

    expect(postSpy).toHaveBeenCalled()
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(localStorage.getItem('kantin_token')).toBeNull()
    expect(sessionStorage.getItem('kantin_token')).toBeNull()

    postSpy.mockRestore()
  })

  it('verifySession mengembalikan true saat token masih sah di server (200 OK) (#219)', async () => {
    const useAuthStore = await importAuthStore()
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      status: 200,
      data: {
        code: 200,
        data: { userId: '1', peran: 'ADMIN_SEKOLAH' },
      },
    })

    const expFuture = Math.floor(Date.now() / 1000) + 3600
    const validJwt = `header.${btoa(JSON.stringify({ exp: expFuture }))}.sig`
    useAuthStore.getState().auth.setAccessToken(validJwt)

    const isValid = await useAuthStore.getState().auth.verifySession()

    expect(getSpy).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ silent: true })
    )
    expect(isValid).toBe(true)

    getSpy.mockRestore()
  })

  it('verifySession mengembalikan false dan mereset auth saat token dicabut di server (401) (#219)', async () => {
    const useAuthStore = await importAuthStore()
    const error401 = {
      response: { status: 401, data: { message: 'Token telah dicabut' } },
    }
    const getSpy = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(error401)

    const expFuture = Math.floor(Date.now() / 1000) + 3600
    const validJwt = `header.${btoa(JSON.stringify({ exp: expFuture }))}.sig`
    useAuthStore.getState().auth.setAccessToken(validJwt)
    useAuthStore.getState().auth.setUser({ ...sampleUser })

    const isValid = await useAuthStore.getState().auth.verifySession()

    expect(getSpy).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ silent: true })
    )
    expect(isValid).toBe(false)
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(useAuthStore.getState().auth.user).toBeNull()

    getSpy.mockRestore()
  })

  it('verifySession tetap mengizinkan sesi jika server offline (network error) tetapi token lokal masih valid (#219)', async () => {
    const useAuthStore = await importAuthStore()
    const networkError = new Error('Network Error') // tidak ada response
    const getSpy = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(networkError)

    const expFuture = Math.floor(Date.now() / 1000) + 3600
    const validJwt = `header.${btoa(JSON.stringify({ exp: expFuture }))}.sig`
    useAuthStore.getState().auth.setAccessToken(validJwt)

    const isValid = await useAuthStore.getState().auth.verifySession()

    expect(isValid).toBe(true)

    getSpy.mockRestore()
  })
})
