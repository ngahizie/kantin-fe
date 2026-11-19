import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Route } from '@/routes/_authenticated/tu/topup/index'
import { useAuthStore } from '@/stores/auth-store'

describe('SEC-TOPUP-01: Route Guard /tu/topup/ Security', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('mengalihkan user yang belum terautentikasi ke /sign-in beserta return redirect URL', () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => false,
        hasRole: () => false,
        user: null,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    const mockLocation = { href: '/tu/topup?filter=active' } as Location

    try {
      // @ts-expect-error - testing TanStack beforeLoad hook directly
      Route.options.beforeLoad?.({ location: mockLocation })
      expect.fail('Seharusnya redirect ke /sign-in')
    } catch (redirectError: unknown) {
      expect(redirectError).toBeDefined()
      const redirectStr = JSON.stringify(redirectError)
      expect(redirectStr).toContain('/sign-in')
      expect(redirectStr).toContain('/tu/topup?filter=active')
    }
  })

  it('mengalihkan user yang login tanpa role tu ke /403', () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        hasRole: (roles: string[]) => roles.includes('siswa'),
        user: { userId: 123, nama: 'Siswa Non-TU', role: 'siswa' },
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    const mockLocation = { href: '/tu/topup' } as Location

    try {
      // @ts-expect-error - testing TanStack beforeLoad hook directly
      Route.options.beforeLoad?.({ location: mockLocation })
      expect.fail('Seharusnya redirect ke /403')
    } catch (redirectError: unknown) {
      expect(redirectError).toBeDefined()
      const redirectStr = JSON.stringify(redirectError)
      expect(redirectStr).toContain('/403')
    }
  })

  it('mengizinkan akses bagi pengguna dengan role tu', () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        hasRole: (roles: string[]) => roles.includes('tu'),
        user: { userId: 2, nama: 'Petugas TU', role: 'tu' },
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    const mockLocation = { href: '/tu/topup' } as Location

    expect(() => {
      // @ts-expect-error - testing TanStack beforeLoad hook directly
      Route.options.beforeLoad?.({ location: mockLocation })
    }).not.toThrow()
  })
})
