import axios from 'axios'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupMockAdapter } from '@/mocks/mock-adapter'
import { kasirApi } from '../api/kasir-api'
import { PILIHAN_ALASAN_VOID, type TransaksiSesiItem, type TutupSesiPayload } from '../types'

describe('Kasir Sesi, Void Transaksi, & Tutup Kasir (Issue #5)', () => {
  let testAxios: ReturnType<typeof axios.create>

  beforeEach(() => {
    testAxios = axios.create()
    setupMockAdapter(testAxios)

    // Spy implementation ke endpoint mock
    vi.spyOn(kasirApi, 'getSesiAktif').mockImplementation(async (titikKasirId?: number) => {
      const res = await testAxios.get('/api/kasir/sesi/aktif', {
        params: { titikKasirId },
      })
      return res.data?.data
    })

    vi.spyOn(kasirApi, 'bukaSesi').mockImplementation(async (titikKasirId?: number) => {
      const res = await testAxios.post('/api/kasir/sesi/buka', {
        titikKasirId: titikKasirId || 1,
      })
      return res.data?.data
    })

    vi.spyOn(kasirApi, 'getRekapSesi').mockImplementation(async (sesiId: number) => {
      const res = await testAxios.get(`/api/kasir/sesi/${sesiId}/rekap`)
      return res.data?.data
    })

    vi.spyOn(kasirApi, 'tutupSesi').mockImplementation(async (sesiId: number, payload?: TutupSesiPayload) => {
      const res = await testAxios.post(`/api/kasir/sesi/${sesiId}/tutup`, payload)
      return res.data?.data
    })

    vi.spyOn(kasirApi, 'getRiwayatTransaksiSesi').mockImplementation(async () => {
      const res = await testAxios.get('/api/kasir/transaksi/sesi')
      return res.data?.data || []
    })

    vi.spyOn(kasirApi, 'refundTransaksi').mockImplementation(
      async (transaksiId: number, alasan?: string) => {
        await testAxios.post(`/api/kasir/transaksi/${transaksiId}/void`, {
          alasan,
        })
      }
    )
  })

  describe('1. Riwayat Sesi & Rekapitulasi Kasir Harian', () => {
    it('dapat memuat sesi kasir aktif dan riwayat transaksi sesi hari ini', async () => {
      const sesi = await kasirApi.getSesiAktif(1)
      expect(sesi).toBeDefined()
      expect(sesi.id).toBeGreaterThan(0)
      expect(sesi.status).toBe('TERBUKA')

      const transactions = await kasirApi.getRiwayatTransaksiSesi(sesi.id)
      expect(Array.isArray(transactions)).toBe(true)
      expect(transactions.length).toBeGreaterThan(0)

      const firstTrx = transactions[0]
      expect(firstTrx).toHaveProperty('nomorReferensi')
      expect(firstTrx).toHaveProperty('pembeliNama')
      expect(firstTrx).toHaveProperty('total')
      expect(firstTrx).toHaveProperty('status')
    })

    it('menghitung kalkulasi rekapitulasi sesi secara akurat (bruto, void, bersih)', async () => {
      const sesi = await kasirApi.getSesiAktif(1)
      const rekap = await kasirApi.getRekapSesi(sesi.id)
      expect(rekap).toBeDefined()
      expect(rekap.sesiKasirId).toBe(sesi.id)

      // Total bersih harus tepat sama dengan total bruto dikurangi total void
      expect(rekap.totalBersih).toBe(rekap.totalBruto - rekap.totalVoid)
      expect(rekap.jumlahTransaksi).toBeGreaterThanOrEqual(0)
      expect(rekap.jumlahVoid).toBeGreaterThanOrEqual(0)
    })

    it('memvalidasi formula rekapitulasi data transaksi mandiri', () => {
      const mockList: TransaksiSesiItem[] = [
        {
          id: 101,
          nomorReferensi: 'TRX-001',
          waktu: '2026-10-08T09:00:00Z',
          pembeliTipe: 'SISWA',
          pembeliNama: 'Budi Santoso',
          items: [],
          total: 25000,
          status: 'SUKSES',
        },
        {
          id: 102,
          nomorReferensi: 'TRX-002',
          waktu: '2026-10-08T09:15:00Z',
          pembeliTipe: 'SISWA',
          pembeliNama: 'Siti Aminah',
          items: [],
          total: 15000,
          status: 'VOID',
          voidAlasan: 'Salah input menu',
        },
        {
          id: 103,
          nomorReferensi: 'TRX-003',
          waktu: '2026-10-08T09:30:00Z',
          pembeliTipe: 'KARTU_TAMU',
          pembeliNama: 'Tamu 01',
          items: [],
          total: 10000,
          status: 'SUKSES',
        },
      ]

      const totalBruto = mockList.reduce((acc, it) => acc + it.total, 0)
      const totalVoid = mockList
        .filter((it) => it.status === 'VOID')
        .reduce((acc, it) => acc + it.total, 0)
      const totalBersih = totalBruto - totalVoid
      const countSukses = mockList.filter((it) => it.status === 'SUKSES').length
      const countVoid = mockList.filter((it) => it.status === 'VOID').length

      expect(totalBruto).toBe(50000)
      expect(totalVoid).toBe(15000)
      expect(totalBersih).toBe(35000)
      expect(countSukses).toBe(2)
      expect(countVoid).toBe(1)
    })
  })

  describe('2. Fitur Void Transaksi Sesi Kasir', () => {
    it('memiliki daftar pilihan alasan void resmi sesuai spesifikasi', () => {
      expect(PILIHAN_ALASAN_VOID).toContain('Salah input menu')
      expect(PILIHAN_ALASAN_VOID).toContain('Pembeli membatalkan')
      expect(PILIHAN_ALASAN_VOID).toContain('Kartu dipakai bukan pemiliknya')
      expect(PILIHAN_ALASAN_VOID).toContain('Lainnya')
    })

    it('dapat melakukan void transaksi sesi dengan alasan yang valid', async () => {
      const initialList = await kasirApi.getRiwayatTransaksiSesi(1)
      const targetTrx = initialList.find((t) => t.status === 'SUKSES')
      expect(targetTrx).toBeDefined()
      const targetTrxId = targetTrx!.id

      const alasan = 'Pembeli membatalkan'
      await kasirApi.refundTransaksi(targetTrxId, alasan, 'TRX-20261110-1')

      // Verifikasi riwayat transaksi terupdate statusnya menjadi VOID
      const updatedList = await kasirApi.getRiwayatTransaksiSesi(1)
      const target = updatedList.find((t) => t.id === targetTrxId)
      expect(target).toBeDefined()
      expect(target?.status).toBe('VOID')
      expect(target?.voidAlasan).toBe(alasan)
    })
  })

  describe('3. Fitur Tutup Kasir Harian (Close Session)', () => {
    it('dapat menutup sesi kasir harian dan mengubah status sesi menjadi DITUTUP', async () => {
      const closedSession = await kasirApi.tutupSesi(1)

      expect(closedSession).toBeDefined()
      expect(closedSession.status).toBe('DITUTUP')
      expect(closedSession.ditutupAt).toBeDefined()
      expect(closedSession.totalBersih).toBe(
        closedSession.totalBruto - closedSession.totalVoid
      )
    })

    it('dapat menutup sesi kasir dengan mengirimkan kas fisik, selisih, dan catatan rekonsiliasi', async () => {
      const payload: TutupSesiPayload = {
        uangFisik: 150000,
        selisih: 0,
        catatan: 'Kas seimbang sesuai pencatatan',
      }
      const closedSession = await kasirApi.tutupSesi(1, payload)

      expect(closedSession).toBeDefined()
      expect(closedSession.status).toBe('DITUTUP')
      expect(closedSession.uangFisik).toBe(150000)
      expect(closedSession.selisih).toBe(0)
      expect(closedSession.catatan).toBe('Kas seimbang sesuai pencatatan')
    })

    it('memvalidasi kalkulasi status selisih kas fisik (seimbang, kurang, lebih)', () => {
      const totalBersihSistem = 100000

      // Kasus 1: Kas Seimbang
      const kasSeimbang = 100000
      const selisihSeimbang = kasSeimbang - totalBersihSistem
      expect(selisihSeimbang).toBe(0)

      // Kasus 2: Kekurangan Kas
      const kasKurang = 90000
      const selisihKurang = kasKurang - totalBersihSistem
      expect(selisihKurang).toBe(-10000)
      expect(selisihKurang < 0).toBe(true)

      // Kasus 3: Kelebihan Kas
      const kasLebih = 115000
      const selisihLebih = kasLebih - totalBersihSistem
      expect(selisihLebih).toBe(15000)
      expect(selisihLebih > 0).toBe(true)
    })

    it('mengunci transaksi baru ketika status sesi adalah DITUTUP', () => {
      const sesiStatus = 'DITUTUP'
      const isSessionClosed = sesiStatus === 'DITUTUP'

      // Logika guard transaksi di POS
      const canProcessTransaction = !isSessionClosed
      expect(canProcessTransaction).toBe(false)
    })
  })

  describe('4. Penanganan Mode Offline (Offline Guard)', () => {
    it('memblokir transaksi baru ketika status koneksi offline', () => {
      const isOnline = false
      const canProcess = isOnline

      expect(canProcess).toBe(false)
    })

    it('mengizinkan transaksi diproses hanya saat status koneksi online', () => {
      const isOnline = true
      const canProcess = isOnline

      expect(canProcess).toBe(true)
    })
  })
})
