import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Route } from '@/routes/_authenticated/tu/topup/index'
import { useAuthStore } from '@/stores/auth-store'
import { generateTopupReferenceId } from '../topup-utils'

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

  describe('SEC-TOPUP-02: Collision-Resistant Reference ID Generator', () => {
    it('menghasilkan nomor referensi unik dengan panjang maksimal 60 karakter', () => {
      const ref = generateTopupReferenceId()
      expect(ref).toBeDefined()
      expect(ref.startsWith('TU-TOPUP-')).toBe(true)
      expect(ref.length).toBeLessThanOrEqual(60)
    })

    it('menghasilkan nilai unik tanpa tabrakan pada pemanggilan berulang (1.000 iterasi)', () => {
      const set = new Set<string>()
      const count = 1000
      for (let i = 0; i < count; i++) {
        const ref = generateTopupReferenceId()
        set.add(ref)
      }
      expect(set.size).toBe(count)
    })

    it('memiliki format tanggal ISO yang konsisten pada prefix referensi', () => {
      const testDate = new Date('2026-11-19T10:30:00Z')
      const ref = generateTopupReferenceId(testDate)
      expect(ref).toContain('TU-TOPUP-20261119-')
    })
  })
})
