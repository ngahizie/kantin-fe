import { describe, it, expect, beforeEach, vi } from 'vitest'
import { kasirApi } from '../api/kasir-api'
import { usePengaturanStore } from '@/stores/usePengaturanStore'

describe('Security Hardening Kasir (OWASP & NIST)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('SEC-KASIR-01: Validasi Fail-Closed Titik Kasir', () => {
    it('menolak prosesTap jika titikKasirId disediakan nilai <= 0', async () => {
      await expect(
        kasirApi.prosesTap({
          rfidUid: 'TESTUID123',
          metodeBayar: 'SALDO',
          items: [{ menuId: 1, qty: 1 }],
          idempotencyKey: 'test-key-2',
          titikKasirId: 0,
        })
      ).rejects.toThrow('Titik kasir belum dipilih atau tidak valid')

      await expect(
        kasirApi.prosesTap({
          rfidUid: 'TESTUID123',
          metodeBayar: 'SALDO',
          items: [{ menuId: 1, qty: 1 }],
          idempotencyKey: 'test-key-3',
          titikKasirId: -1,
        })
      ).rejects.toThrow('Titik kasir belum dipilih atau tidak valid')
    })

    it('usePengaturanStore dapat mengatur titik kasir aktif menjadi null tanpa memaksa nilai 1', () => {
      const store = usePengaturanStore.getState()
      store.setActiveTitikKasirId(null)
      expect(usePengaturanStore.getState().activeTitikKasirId).toBeNull()
      expect(usePengaturanStore.getState().getActiveTitikKasir()).toBeUndefined()
    })
  })

  describe('SEC-KASIR-02: Integritas Rekonsiliasi Buta (Blind Cash Count)', () => {
    it('memastikan data lock tersimpan dengan benar dan terlindungi', async () => {
      const { saveCloseSessionLock, getCloseSessionLock } =
        await import('../close-session-lock')

      const sesiDummy = {
        id: 101,
        tanggal: '2026-11-19',
        titikKasirId: 1,
        status: 'TERBUKA' as const,
      }
      saveCloseSessionLock(sesiDummy, 50000, 'Pas', 50000)

      const locked = getCloseSessionLock(sesiDummy)
      expect(locked).not.toBeNull()
      expect(locked?.cashValue).toBe(50000)
      expect(locked?.sesiId).toBe(101)
    })
  })

  describe('SEC-KASIR-03: Kriptografi Idempotency Key (CSPRNG)', () => {
    it('menghasilkan UUID v4 valid dan tidak menggunakan Math.random', async () => {
      const { generateIdempotencyKey } = await import('../api/kasir-api')
      const mathRandomSpy = vi.spyOn(Math, 'random')
      mathRandomSpy.mockClear()

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      const key = generateIdempotencyKey()
      expect(key).toMatch(uuidRegex)
      expect(mathRandomSpy).not.toHaveBeenCalled()
    })

    it('menggunakan fallback crypto.getRandomValues saat crypto.randomUUID tidak tersedia', async () => {
      const { generateIdempotencyKey } = await import('../api/kasir-api')
      const originalRandomUUID = crypto.randomUUID

      // @ts-expect-error Mock penghapusan crypto.randomUUID untuk menguji CSPRNG fallback
      crypto.randomUUID = undefined

      try {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        const fallbackKey = generateIdempotencyKey()
        expect(fallbackKey).toMatch(uuidRegex)
      } finally {
        crypto.randomUUID = originalRandomUUID
      }
    })
  })

  describe('SEC-KASIR-04: Penghapusan Default Param Kosong pada voidTransaksi', () => {
    it('menolak voidTransaksi jika kodeStruk kosong atau hanya whitespace', async () => {
      await expect(
        kasirApi.voidTransaksi(1, 'Salah menu', '')
      ).rejects.toThrow('Kode struk wajib diisi untuk melakukan pembatalan transaksi')

      await expect(
        kasirApi.voidTransaksi(1, 'Salah menu', '   ')
      ).rejects.toThrow('Kode struk wajib diisi untuk melakukan pembatalan transaksi')
    })
  })

  describe('SEC-KASIR-05: Sanitasi Pesan Error (Anti-Verbose Disclosure)', () => {
    it('menyembunyikan detail exception internal / database dan mengembalikan pesan fallback', async () => {
      const { sanitizeKasirErrorMessage } = await import('../kasir-error')

      const sqlError = 'org.postgresql.util.PSQLException: ERROR: syntax error at or near "SELECT"'
      expect(sanitizeKasirErrorMessage(sqlError)).toBe(
        'Terjadi kesalahan saat memproses transaksi kasir'
      )

      const javaError = 'java.lang.NullPointerException at com.asqi.scholia_kantin_be.service'
      expect(sanitizeKasirErrorMessage(javaError)).toBe(
        'Terjadi kesalahan saat memproses transaksi kasir'
      )
    })

    it('memotong pesan yang melebihi batas 150 karakter', async () => {
      const { sanitizeKasirErrorMessage } = await import('../kasir-error')

      const longMessage = 'A'.repeat(200)
      const sanitized = sanitizeKasirErrorMessage(longMessage)
      expect(sanitized.length).toBeLessThanOrEqual(150)
      expect(sanitized.endsWith('...')).toBe(true)
    })

    it('tetap meloloskan pesan validasi bisnis yang ramah pengguna', async () => {
      const { sanitizeKasirErrorMessage } = await import('../kasir-error')

      const normalMsg = 'Saldo kartu tidak mencukupi untuk transaksi ini (PRD §6.2)'
      expect(sanitizeKasirErrorMessage(normalMsg)).toBe(
        'Saldo kartu tidak mencukupi untuk transaksi ini'
      )
    })
  })

  describe('SEC-KASIR-06: Pencatatan Client Audit Trail untuk Insiden Kasir', () => {
    it('mencatat audit log saat terjadi kegagalan transaksi, selisih kas, atau void', async () => {
      const { logKasirAuditEvent, getKasirAuditLogs, clearKasirAuditLogs } =
        await import('../api/kasir-audit')

      clearKasirAuditLogs()
      expect(getKasirAuditLogs()).toHaveLength(0)

      await logKasirAuditEvent({
        action: 'TRANSAKSI_GAGAL',
        titikKasirId: 2,
        sesiId: 44,
        detail: { alasan: 'Kartu diblokir', uid: '04A1B2C3' },
      })

      await logKasirAuditEvent({
        action: 'TUTUP_SESI_SELISIH',
        titikKasirId: 2,
        sesiId: 44,
        detail: { uangFisik: 45000, kasSeharusnya: 50000, selisih: -5000 },
      })

      const logs = getKasirAuditLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].action).toBe('TRANSAKSI_GAGAL')
      expect(logs[0].titikKasirId).toBe(2)
      expect(logs[0].detail.alasan).toBe('Kartu diblokir')
      expect(logs[0].timestamp).toBeDefined()

      expect(logs[1].action).toBe('TUTUP_SESI_SELISIH')
      expect(logs[1].detail.selisih).toBe(-5000)

      clearKasirAuditLogs()
      expect(getKasirAuditLogs()).toHaveLength(0)
    })
  })
})
