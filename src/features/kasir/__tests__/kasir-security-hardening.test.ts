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
})
