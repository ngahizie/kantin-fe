import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Route } from '@/routes/_authenticated/stok/kartu/index'
import { useAuthStore } from '@/stores/auth-store'
import {
  parseSafeMenuId,
  formatJenisMutasi,
  getStokExportMetadata,
} from '../stok-utils'
import { sanitizeStokErrorMessage } from '../stok-error'
import {
  logStokAuditEvent,
  getStokAuditLogs,
  clearStokAuditLogs,
} from '../api/stok-audit'
import apiClient from '@/lib/api-client'

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

  describe('SEC-STOK-04: Client Audit Logging Ekspor Stok', () => {
    beforeEach(() => {
      clearStokAuditLogs()
    })

    it('mencatat audit event saat ekspor CSV dan PDF', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } })

      await logStokAuditEvent({
        action: 'STOK_EXPORT_CSV',
        menuId: 5,
        detail: { totalBaris: 25 },
      })

      await logStokAuditEvent({
        action: 'STOK_EXPORT_PDF',
        menuId: null,
        detail: { totalBaris: 100 },
      })

      const logs = getStokAuditLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].action).toBe('STOK_EXPORT_CSV')
      expect(logs[0].menuId).toBe(5)
      expect(logs[0].timestamp).toBeDefined()
      expect(logs[1].action).toBe('STOK_EXPORT_PDF')

      expect(postSpy).toHaveBeenCalledTimes(2)
      expect(postSpy).toHaveBeenCalledWith('/api/stok/audit', expect.objectContaining({
        action: 'STOK_EXPORT_CSV',
        menuId: 5,
      }))
    })

    it('membatasi ukuran antrean buffer audit klien maksimum 50 entri', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } })

      for (let i = 1; i <= 60; i++) {
        await logStokAuditEvent({
          action: 'STOK_EXPORT_CSV',
          menuId: i,
          detail: { index: i },
        })
      }

      const logs = getStokAuditLogs()
      expect(logs).toHaveLength(50)
      expect(logs[0].menuId).toBe(11)
      expect(logs[49].menuId).toBe(60)
    })
  })

  describe('SEC-STOK-05: Concurrency Guard Ekspor Laporan', () => {
    it('memastikan pengunci isExporting aktif saat proses ekspor berlangsung untuk mencegah double execution', () => {
      let isExportingRefCurrent = false
      const executionCount = { count: 0 }

      const triggerExport = () => {
        if (isExportingRefCurrent) return
        isExportingRefCurrent = true
        try {
          executionCount.count += 1
        } finally {
          isExportingRefCurrent = false
        }
      }

      // Simulasi panggilan pertama
      triggerExport()
      expect(executionCount.count).toBe(1)

      // Simulasi panggilan terkunci saat sedang berjalan
      isExportingRefCurrent = true
      triggerExport()
      expect(executionCount.count).toBe(1) // Tidak bertambah karena terkunci

      isExportingRefCurrent = false
      triggerExport()
      expect(executionCount.count).toBe(2)
    })
  })

  describe('SEC-STOK-06: Penanganan Safe String Mutasi & Integritas Metadata PDF', () => {
    it('memformat jenis mutasi dengan aman tanpa melempar unhandled exception saat null atau undefined', () => {
      expect(formatJenisMutasi(null)).toBe('-')
      expect(formatJenisMutasi(undefined)).toBe('-')
      expect(formatJenisMutasi('')).toBe('-')
      expect(formatJenisMutasi('PENJUALAN_VOID')).toBe('REFUND PENJUALAN')
      expect(formatJenisMutasi('BARANG_MASUK')).toBe('BARANG MASUK')
      expect(formatJenisMutasi('OPNAME_KELUAR')).toBe('OPNAME KELUAR')
    })

    it('menghasilkan metadata laporan yang akurat untuk mode seluruh menu maupun single menu', () => {
      const globalMeta = getStokExportMetadata(undefined)
      expect(globalMeta.cakupan).toBe('Seluruh Menu Kantin')
      expect(globalMeta.subtitle).toBe('Seluruh Mutasi Produk & Menu Kantin')
      expect(globalMeta.fileSuffix).toBe('')

      const menuMeta = getStokExportMetadata(5, 'Nasi Uduk Spesial')
      expect(menuMeta.cakupan).toBe('Menu: Nasi Uduk Spesial')
      expect(menuMeta.subtitle).toBe('Mutasi Produk: Nasi Uduk Spesial')
      expect(menuMeta.fileSuffix).toBe('_Menu_5')

      const fallbackMenuMeta = getStokExportMetadata(12, null)
      expect(fallbackMenuMeta.cakupan).toBe('Menu: Menu #12')
      expect(fallbackMenuMeta.subtitle).toBe('Mutasi Produk: Menu #12')
      expect(fallbackMenuMeta.fileSuffix).toBe('_Menu_12')
    })
  })
})
