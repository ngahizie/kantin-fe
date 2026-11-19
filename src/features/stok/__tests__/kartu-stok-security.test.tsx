import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Route } from '@/routes/_authenticated/stok/kartu/index'
import { useAuthStore } from '@/stores/auth-store'

describe('Security Hardening Kartu Stok (OWASP & NIST)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('SEC-STOK-01: Route Guard Fail-Closed Kartu Stok', () => {
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
          location: { href: '/stok/kartu' },
        } as never)
        expect.fail('Harus melempar redirect ke /sign-in')
      } catch (err: unknown) {
        expect(err).toBeDefined()
        const redirectStr = JSON.stringify(err)
        expect(redirectStr).toContain('/sign-in')
        expect(redirectStr).toContain('/stok/kartu')
      }
    })

    it('mengalihkan user terautentikasi tanpa peran pengelola/bendahara ke /403', () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        auth: {
          isAuthenticated: () => true,
          hasRole: (roles: string[]) => roles.includes('kasir'),
          user: { currentRole: 'kasir' },
        },
      } as unknown as ReturnType<typeof useAuthStore.getState>)

      try {
        Route.options.beforeLoad?.({
          location: { href: '/stok/kartu' },
        } as never)
        expect.fail('Harus melempar redirect ke /403')
      } catch (err: unknown) {
        expect(err).toBeDefined()
        const redirectStr = JSON.stringify(err)
        expect(redirectStr).toContain('/403')
      }
    })

    it('mengizinkan pengelola dan bendahara yang terautentikasi untuk mengakses /stok/kartu', () => {
      vi.spyOn(useAuthStore, 'getState').mockReturnValue({
        auth: {
          isAuthenticated: () => true,
          hasRole: (roles: string[]) => roles.includes('pengelola'),
          user: { currentRole: 'pengelola' },
        },
      } as unknown as ReturnType<typeof useAuthStore.getState>)

      expect(() =>
        Route.options.beforeLoad?.({
          location: { href: '/stok/kartu' },
        } as never)
      ).not.toThrow()
    })
  })
})
