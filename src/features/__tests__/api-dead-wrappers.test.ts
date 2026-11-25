import { describe, it, expect } from 'vitest'
import { stokApi } from '@/features/stok/api/stok-api'
import { laporanApi } from '@/features/laporan/api/laporan-api'
import { pengaturanApi } from '@/features/pengaturan/api/pengaturan-api'

describe('Pembersihan Wrapper API Mati (Issue #207)', () => {
  describe('stokApi', () => {
    it('tidak lagi mengekspos getStokMenipis (digantikan oleh laporan/stok?hanyaMenipis=true)', () => {
      // @ts-expect-error method getStokMenipis sudah dihapus sesuai Issue #207
      expect(stokApi.getStokMenipis).toBeUndefined()
    })

    it('tidak lagi mengekspos rekonsiliasi (dead endpoint)', () => {
      // @ts-expect-error method rekonsiliasi sudah dihapus sesuai Issue #207
      expect(stokApi.rekonsiliasi).toBeUndefined()
    })

    it('tetap menyediakan getInventaris untuk memuat stok menipis secara resmi', () => {
      expect(typeof stokApi.getInventaris).toBe('function')
    })
  })

  describe('laporanApi', () => {
    it('tidak lagi mengekspos downloadEksporBackend (ekspor 100% sisi klien)', () => {
      // @ts-expect-error method downloadEksporBackend sudah dihapus sesuai Issue #207
      expect(laporanApi.downloadEksporBackend).toBeUndefined()
    })
  })

  describe('pengaturanApi', () => {
    it('tidak lagi mengekspos getTitikKasirDetail (form edit memakai getTitikKasirList)', () => {
      // @ts-expect-error method getTitikKasirDetail sudah dihapus sesuai Issue #207
      expect(pengaturanApi.getTitikKasirDetail).toBeUndefined()
    })

    it('tetap menyediakan getTitikKasirList untuk CRUD titik kasir', () => {
      expect(typeof pengaturanApi.getTitikKasirList).toBe('function')
    })
  })
})
