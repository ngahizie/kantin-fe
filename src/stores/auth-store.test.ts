import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    const { useRoleStore } = await import('./useRoleStore')

    useAuthStore.getState().auth.setUser({ ...sampleUser })

    expect(useAuthStore.getState().auth.user).toEqual(sampleUser)
    expect(useRoleStore.getState().userName).toBe(sampleUser.nama)
    expect(useRoleStore.getState().userEmail).toBe(sampleUser.email)
    expect(useRoleStore.getState().schoolName).toBe(sampleUser.sekolahNama)
    expect(useRoleStore.getState().currentRole).toBe(sampleUser.currentRole)
  })

  it('reset clears user and access token and drops persistence', async () => {
    const useAuthStore = await importAuthStore()
    const { useRoleStore } = await import('./useRoleStore')
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
    const { useCartStore } = await import('./useCartStore')

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
})
