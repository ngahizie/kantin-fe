import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Route } from '@/routes/_authenticated/stok/kartu/index'
import { useAuthStore } from '@/stores/auth-store'
import { parseSafeMenuId } from '../stok-utils'
import { sanitizeStokErrorMessage } from '../stok-error'

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

  describe('SEC-STOK-02: Validasi Parameter menuId (Mencegah NaN / Negatif)', () => {
    it('menerima menuId valid berupa angka positif atau string angka bulat', () => {
      expect(parseSafeMenuId(10)).toBe(10)
      expect(parseSafeMenuId('42')).toBe(42)
    })

    it('menolak string non-angka, NaN, dan nilai kosong dengan mengembalikan undefined', () => {
      expect(parseSafeMenuId('abc')).toBeUndefined()
      expect(parseSafeMenuId('NaN')).toBeUndefined()
      expect(parseSafeMenuId(NaN)).toBeUndefined()
      expect(parseSafeMenuId('')).toBeUndefined()
      expect(parseSafeMenuId(null)).toBeUndefined()
      expect(parseSafeMenuId(undefined)).toBeUndefined()
    })

    it('menolak angka negatif, nol, bilangan desimal, dan tak hingga (Infinity)', () => {
      expect(parseSafeMenuId(-1)).toBeUndefined()
      expect(parseSafeMenuId('-10')).toBeUndefined()
      expect(parseSafeMenuId(0)).toBeUndefined()
      expect(parseSafeMenuId('0')).toBeUndefined()
      expect(parseSafeMenuId(12.5)).toBeUndefined()
      expect(parseSafeMenuId('3.14')).toBeUndefined()
      expect(parseSafeMenuId(Infinity)).toBeUndefined()
      expect(parseSafeMenuId(-Infinity)).toBeUndefined()
    })
  })

  describe('SEC-STOK-03: Sanitasi Pesan Error Mutasi & Stok', () => {
    it('menyembunyikan detail SQL, psql, constraint, dan stack trace internal backend', () => {
      const sqlError = 'ERROR: relation "riwayat_stok" does not exist (SQLSTATE 42P01)'
      const sanitized = sanitizeStokErrorMessage(sqlError, 'Gagal memuat mutasi stok')
      expect(sanitized).toBe('Gagal memuat mutasi stok')
      expect(sanitized).not.toContain('SQLSTATE')
      expect(sanitized).not.toContain('riwayat_stok')

      const stackError = 'java.lang.NullPointerException at com.asqi.scholia_kantin_be.service.stok.StokOperasiService.riwayat'
      expect(sanitizeStokErrorMessage(stackError, 'Gagal memuat mutasi stok')).toBe('Gagal memuat mutasi stok')
    })

    it('mempertahankan pesan bisnis valid yang aman dan membatasi panjang teks', () => {
      const safeMsg = 'Rentang tanggal filter mutasi tidak valid'
      expect(sanitizeStokErrorMessage(safeMsg)).toBe(safeMsg)

      const longMsg = 'X'.repeat(200)
      const truncated = sanitizeStokErrorMessage(longMsg)
      expect(truncated.length).toBeLessThanOrEqual(150)
      expect(truncated.endsWith('...')).toBe(true)
    })
  })
})
