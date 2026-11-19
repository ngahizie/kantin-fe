import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Route } from '@/routes/_authenticated/kategori/index'
import { useAuthStore } from '@/stores/auth-store'
import { getKategoriDeleteBlockedReason } from '../menu-utils'

describe('Security Hardening Kategori (OWASP & NIST)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('SEC-KAT-02: Route Guard Fail-Closed Kategori', () => {
    it('mengalihkan sesi belum terautentikasi ke /sign-in beserta target redirect', () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        auth: {
          isAuthenticated: () => false,
          hasRole: () => false,
          user: null,
        },
      } as unknown as ReturnType<typeof useAuthStore.getState>)

      try {
        Route.options.beforeLoad?.({
          location: { href: '/kategori' },
        } as never)
        expect.fail('Harus melempar redirect ke /sign-in')
      } catch (err: unknown) {
        expect(err).toBeDefined()
        const redirectStr = JSON.stringify(err)
        expect(redirectStr).toContain('/sign-in')
        expect(redirectStr).toContain('/kategori')
      }
    })

    it('mengalihkan user terautentikasi non-pengelola ke /403', () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        auth: {
          isAuthenticated: () => true,
          hasRole: (roles: string[]) => roles.includes('kasir'),
          user: { currentRole: 'kasir' },
        },
      } as unknown as ReturnType<typeof useAuthStore.getState>)

      try {
        Route.options.beforeLoad?.({
          location: { href: '/kategori' },
        } as never)
        expect.fail('Harus melempar redirect ke /403')
      } catch (err: unknown) {
        expect(err).toBeDefined()
        const redirectStr = JSON.stringify(err)
        expect(redirectStr).toContain('/403')
      }
    })

    it('mengizinkan pengelola yang terautentikasi untuk mengakses /kategori', () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        auth: {
          isAuthenticated: () => true,
          hasRole: (roles: string[]) => roles.includes('pengelola'),
          user: { currentRole: 'pengelola' },
        },
      } as unknown as ReturnType<typeof useAuthStore.getState>)

      expect(() =>
        Route.options.beforeLoad?.({
          location: { href: '/kategori' },
        } as never)
      ).not.toThrow()
    })
  })

  describe('SEC-KAT-03: Fail-Closed Verifikasi Relasi Menu Kategori', () => {
    it('memblokir penghapusan kategori jika jumlahItem belum terverifikasi (undefined)', () => {
      const reason = getKategoriDeleteBlockedReason({
        nama: 'Kategori Uji Fail-Closed',
        jumlahItem: undefined,
      })
      expect(reason).not.toBeNull()
      expect(reason).toContain('belum terverifikasi')
      expect(reason).toContain('Kategori Uji Fail-Closed')
    })

    it('memblokir penghapusan kategori jika masih memiliki menu terkait (> 0)', () => {
      const reason = getKategoriDeleteBlockedReason({
        nama: 'Makanan Utama',
        jumlahItem: 5,
      })
      expect(reason).not.toBeNull()
      expect(reason).toContain('masih memiliki 5 menu terkait')
    })

    it('mengizinkan penghapusan jika kategori terverifikasi memiliki 0 menu terkait', () => {
      const reason = getKategoriDeleteBlockedReason({
        nama: 'Kategori Kosong',
        jumlahItem: 0,
      })
      expect(reason).toBeNull()
    })
  })
})
