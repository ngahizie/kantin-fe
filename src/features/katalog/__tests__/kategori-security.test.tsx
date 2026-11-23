import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { Route } from '@/routes/_authenticated/kategori/index'
import { useAuthStore } from '@/stores/auth-store'
import { getKategoriDeleteBlockedReason } from '../menu-utils'
import { KategoriFormModal } from '../KategoriFormModal'
import { katalogApi } from '../api/katalog-api'
import { sanitizeKategoriErrorMessage } from '../kategori-error'
import {
  logKategoriAuditEvent,
  getKategoriAuditLogs,
  clearKategoriAuditLogs,
} from '../api/kategori-audit'
import apiClient from '@/lib/api-client'

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

  describe('SEC-KAT-04: Submission Lock Mencegah Double Submit', () => {
    it('mengunci tombol dan mencegah double submit saat proses create masih berjalan', async () => {
      let resolvePromise: (val: unknown) => void = () => {}
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      const createSpy = vi.spyOn(katalogApi, 'createKategori').mockImplementation(() => pendingPromise as never)

      const screen = await render(
        <KategoriFormModal
          open={true}
          onOpenChange={vi.fn()}
          onSuccess={vi.fn()}
        />
      )

      const input = screen.getByLabelText(/Nama Kategori/i)
      await input.fill('Kategori Anti Double')

      const submitBtn = screen.getByRole('button', { name: /Buat Kategori/i })
      await submitBtn.click()

      expect(createSpy).toHaveBeenCalledTimes(1)

      const savingBtn = screen.getByRole('button', { name: /Menyimpan/i })
      await expect.element(savingBtn).toBeDisabled()

      resolvePromise({ id: 10, nama: 'Kategori Anti Double', urutan: 0, aktif: true })
    })
  })

  describe('SEC-KAT-05: Sanitasi Pesan Error Kategori', () => {
    it('menyembunyikan detail SQL, psql, constraint, dan stack trace internal backend', () => {
      const sqlError = 'ERROR: duplicate key value violates unique constraint "kategori_nama_key" (SQLSTATE 23505)'
      const sanitized = sanitizeKategoriErrorMessage(sqlError, 'Gagal menyimpan kategori')
      expect(sanitized).toBe('Gagal menyimpan kategori')
      expect(sanitized).not.toContain('SQLSTATE')
      expect(sanitized).not.toContain('kategori_nama_key')

      const stackError = 'java.lang.NullPointerException at com.kantin.service.KategoriService.save'
      expect(sanitizeKategoriErrorMessage(stackError, 'Gagal menyimpan kategori')).toBe('Gagal menyimpan kategori')
    })

    it('mempertahankan pesan bisnis valid yang aman dan membatasi panjang teks', () => {
      const safeMsg = 'Nama kategori sudah digunakan pada kantin ini'
      expect(sanitizeKategoriErrorMessage(safeMsg)).toBe(safeMsg)

      const longMsg = 'X'.repeat(200)
      const truncated = sanitizeKategoriErrorMessage(longMsg)
      expect(truncated.length).toBeLessThanOrEqual(150)
      expect(truncated.endsWith('...')).toBe(true)
    })
  })

  describe('SEC-KAT-06: Client Audit Logging Kategori', () => {
    beforeEach(() => {
      clearKategoriAuditLogs()
    })

    it('mencatat audit log event saat create, toggle status, dan delete kategori', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } })

      await logKategoriAuditEvent({
        action: 'KATEGORI_CREATE',
        kategoriId: 101,
        kategoriNama: 'Makanan Sehat',
        detail: { urutan: 1, aktif: true },
      })

      await logKategoriAuditEvent({
        action: 'KATEGORI_TOGGLE_STATUS',
        kategoriId: 101,
        kategoriNama: 'Makanan Sehat',
        detail: { sebelum: true, sesudah: false },
      })

      await logKategoriAuditEvent({
        action: 'KATEGORI_DELETE_BLOCKED',
        kategoriId: 101,
        kategoriNama: 'Makanan Sehat',
        detail: { alasan: 'Masih ada 3 menu terkait' },
      })

      const logs = getKategoriAuditLogs()
      expect(logs).toHaveLength(3)
      expect(logs[0].action).toBe('KATEGORI_CREATE')
      expect(logs[0].kategoriNama).toBe('Makanan Sehat')
      expect(logs[0].timestamp).toBeDefined()
      expect(logs[1].action).toBe('KATEGORI_TOGGLE_STATUS')
      expect(logs[2].action).toBe('KATEGORI_DELETE_BLOCKED')

      expect(postSpy).not.toHaveBeenCalled()
    })

    it('membatasi ukuran antrean buffer audit klien tidak melebihi 50 entri', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } })

      for (let i = 1; i <= 60; i++) {
        await logKategoriAuditEvent({
          action: 'KATEGORI_UPDATE',
          kategoriId: i,
          kategoriNama: `Kategori ${i}`,
        })
      }

      const logs = getKategoriAuditLogs()
      expect(logs).toHaveLength(50)
      expect(logs[0].kategoriId).toBe(11)
      expect(logs[49].kategoriId).toBe(60)
    })
  })
})
