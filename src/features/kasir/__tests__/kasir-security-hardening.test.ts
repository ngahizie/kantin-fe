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

      const sesiDummy = { id: 101, tanggal: '2026-11-19', titikKasirId: 1 }
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
})
