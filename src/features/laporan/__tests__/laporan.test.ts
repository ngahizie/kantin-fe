import { describe, it, expect, beforeAll, vi } from 'vitest'
import { setupMockAdapter } from '@/mocks/mock-adapter'
import { apiClient } from '@/lib/api-client'
import { laporanApi } from '../api/laporan-api'
import { stokApi } from '@/features/stok/api/stok-api'
import {
  exportTableToExcel,
  exportMultiSheetExcel,
} from '@/lib/excelExport'
import {
  exportTableToPdf,
  exportMultiSectionPdf,
} from '@/lib/pdfExport'
import { formatRupiah } from '@/lib/formatters'
import {
  ALL_TIME_PARAMS,
  formatYmd,
  getTimezoneOffsetString,
  startOfDayIso,
  nextDayStartIso,
  getDefaultDateFilter,
  getPresetLabel,
} from '../components/date-filter-utils'
import { formatMargin } from '../laporan-utils'

describe('Modul Laporan Terpadu SKOOLIA Kantin', () => {
  beforeAll(() => {
    setupMockAdapter(apiClient)
  })
  describe('Laporan Rekonsiliasi Harian & Invariant Saldo (PRD §5 & §9.5)', () => {
    it('memeriksa invariant akuntansi: Topup - Refund = Saldo Mengendap + Penjualan Bersih', async () => {
      const data = await laporanApi.getRekonsiliasi()

      expect(data).toBeDefined()
      expect(data.seimbang).toBe(true)
      expect(data.selisih).toBe(0)

      // Verifikasi persamaan invariant
      const topupBersih = data.topupOnline + data.topupTunai - data.refund
      const totalPenggunaan = data.saldoMengendap + data.penjualanBersih
      expect(topupBersih).toBe(totalPenggunaan)
      expect(data.saldoMengendap).toBe(data.saldoSiswa)
    })

    it('menampilkan indikator selisih (seimbang=false, selisih!=0) secara akurat saat simulasi selisih aktif', async () => {
      const data = await laporanApi.getRekonsiliasi({ simulasiSelisih: true })

      expect(data).toBeDefined()
      // Pada mode simulasi selisih
      expect(data.selisih).toBe(75000)
      expect(data.seimbang).toBe(false)
      expect(data.selisih).not.toBe(0)
    })

    it('melempar galat saat mode live jika endpoint rekonsiliasi gagal atau kosong (tanpa dummy Seimbang)', async () => {
      vi.stubEnv('VITE_USE_MOCK', 'false')
      const getSpy = vi
        .spyOn(apiClient, 'get')
        .mockRejectedValueOnce(new Error('Network error'))

      try {
        await expect(laporanApi.getRekonsiliasi()).rejects.toThrow(
          'Network error'
        )

        getSpy.mockResolvedValueOnce({
          data: { code: 200, status: 'SUCCESS', data: null },
        })
        await expect(laporanApi.getRekonsiliasi()).rejects.toThrow()
      } finally {
        getSpy.mockRestore()
        vi.unstubAllEnvs()
      }
    })

    it('dapat mengekspor laporan rekonsiliasi ke format Excel (.xlsx)', () => {
      const mockRekonsiliasi = {
        topupBersih: 3500000,
        saldoMengendap: 500000,
        penjualanBersih: 3000000,
        selisih: 0,
        seimbang: true,
      }

      const rows = [
        { pos: 'Top-up Online', nominal: 1250000, arah: 'KREDIT' },
        { pos: 'Top-up Tunai', nominal: 2350000, arah: 'KREDIT' },
        { pos: 'Refund Saldo', nominal: 100000, arah: 'DEBIT' },
        { pos: 'Penjualan Bersih', nominal: 3000000, arah: 'DEBIT' },
        { pos: 'Saldo Mengendap Siswa', nominal: 500000, arah: 'STATUS' },
      ]

      const result = exportTableToExcel({
        filename: 'Laporan_Rekonsiliasi_Harian_Test',
        sheetName: 'Rekonsiliasi',
        title: 'LAPORAN REKONSILIASI HARIAN KANTIN',
        metadata: {
          'Status': mockRekonsiliasi.seimbang ? 'SEIMBANG' : 'SELISIH',
          'Selisih': formatRupiah(mockRekonsiliasi.selisih),
        },
        columns: [
          { header: 'Pos Akuntansi', key: 'pos' },
          { header: 'Arah Mutasi', key: 'arah' },
          {
            header: 'Nominal',
            key: 'nominal',
            formatter: (v) => formatRupiah(Number(v)),
          },
        ],
        data: rows,
      })

      expect(result.workbook).toBeDefined()
      expect(result.filename).toBe('Laporan_Rekonsiliasi_Harian_Test.xlsx')
      expect(result.workbook.SheetNames).toContain('Rekonsiliasi')

      const ws = result.workbook.getWorksheet('Rekonsiliasi')
      expect(ws).toBeDefined()
      expect(ws?.getCell('B1').value).toBe('LAPORAN REKONSILIASI HARIAN KANTIN')
    })

    it('dapat mengekspor laporan rekonsiliasi ke format PDF (.pdf)', () => {
      const rows = [
        { pos: 'Top-up Online', arah: 'KREDIT', nominal: 'Rp 1.250.000' },
        { pos: 'Top-up Tunai', arah: 'KREDIT', nominal: 'Rp 2.350.000' },
        { pos: 'Refund Saldo', arah: 'DEBIT', nominal: 'Rp 100.000' },
        { pos: 'Penjualan Bersih', arah: 'DEBIT', nominal: 'Rp 3.000.000' },
      ]

      const result = exportTableToPdf({
        filename: 'Laporan_Rekonsiliasi_Harian_Test',
        title: 'LAPORAN REKONSILIASI HARIAN KANTIN',
        subtitle: 'Sistem Kasir & Pembukuan Kantin SKOOLIA',
        metadata: {
          'Tanggal Cetak': '2026-10-27',
          'Status': 'SEIMBANG (VALID)',
          'Selisih': 'Rp 0',
        },
        columns: [
          { header: 'Pos Akuntansi', key: 'pos' },
          { header: 'Arah', key: 'arah' },
          { header: 'Nominal', key: 'nominal' },
        ],
        data: rows,
      })

      expect(result).toBeDefined()
      expect(result.filename).toBe('Laporan_Rekonsiliasi_Harian_Test.pdf')
      expect(result.doc).toBeDefined()
      expect(result.doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
      expect(result.buffer).toBeDefined()
      expect(result.buffer?.byteLength).toBeGreaterThan(0)
    })
  })

  describe('Laporan Penjualan & Laba Kotor (PRD §9.5, BE #291)', () => {
    it('mengambil ringkasan penjualan, totalModal, laba, jumlahRefund, dan marginPersen dengan tepat', async () => {
      const data = await laporanApi.getPenjualan()

      expect(data).toBeDefined()
      expect(data.penjualanBersih).toBe(data.penjualanBruto)
      expect(data.jumlahRefund).toBeGreaterThanOrEqual(0)
      expect(data.nilaiRefund).toBeGreaterThanOrEqual(0)
      expect(data.totalModal).toBeGreaterThan(0)
      expect(data.laba).toBe(data.penjualanBersih - data.totalModal)
      expect(data.marginPersen).toBeGreaterThan(0)
    })

    it('mengambil penjualan per item menu, kategori, dan titik kasir sesuai kontrak BE #291', async () => {
      const [items, kategoris, kasirs] = await Promise.all([
        laporanApi.getPenjualanPerItem(),
        laporanApi.getPenjualanPerKategori(),
        laporanApi.getPenjualanPerKasir(),
      ])

      expect(items.length).toBeGreaterThan(0)
      expect(items[0]).toHaveProperty('kunciId')
      expect(items[0]).toHaveProperty('nama')
      expect(items[0]).toHaveProperty('qty')
      expect(items[0]).toHaveProperty('total')
      expect(items[0]).toHaveProperty('hargaSatuan')
      expect(items[0]).toHaveProperty('modal')
      expect(items[0]).toHaveProperty('marginPersen')
      expect(items[0].laba).toBe(items[0].total - items[0].modal)
      expect(items[0].labaKotor).toBe(items[0].penjualanBersih - items[0].totalHpp)
      expect(items[0].kategoriNama).toBeTruthy()

      expect(kategoris.length).toBeGreaterThan(0)
      expect(kategoris[0]).toHaveProperty('kunciId')
      expect(kategoris[0]).toHaveProperty('nama')
      expect(kategoris[0]).toHaveProperty('total')
      expect(kategoris[0]).toHaveProperty('modal')
      expect(kategoris[0]).toHaveProperty('laba')
      expect(kategoris[0]).toHaveProperty('marginPersen')
      expect(kategoris[0].hargaSatuan).toBeNull()
      expect(kategoris[0].jumlahItem).not.toBeNull()

      expect(kasirs.length).toBeGreaterThan(0)
      expect(kasirs[0]).toHaveProperty('namaTitikKasir')
      expect(kasirs[0]).toHaveProperty('penjualanBersih')
    })

    it('memastikan formatMargin dari LaporanPenjualanPage merender 0% bila data kosong, nol, atau undefined agar tidak menampilkan undefined%', () => {
      expect(formatMargin(undefined)).toBe('0%')
      expect(formatMargin(null)).toBe('0%')
      expect(formatMargin(0)).toBe('0%')
      expect(formatMargin(25.5)).toBe('25.5%')
      expect(formatMargin(Number.NaN)).toBe('0%')
    })

    it('mengembalikan array kosong [] saat backend mengembalikan data kosong tanpa fallback mock palsu', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: { code: 200, status: 'SUCCESS', data: [] },
      })

      try {
        const [items, kategoris] = await Promise.all([
          laporanApi.getPenjualanPerItem(),
          laporanApi.getPenjualanPerKategori(),
        ])
        expect(items).toEqual([])
        expect(kategoris).toEqual([])
      } finally {
        getSpy.mockRestore()
      }
    })

    it('menangani ringkasan penjualan bernilai 0 tanpa menghasilkan undefined atau NaN', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          code: 200,
          status: 'SUCCESS',
          data: {
            dari: '2026-10-08T00:00:00Z',
            sampai: '2026-10-08T23:59:59Z',
            jumlahTransaksi: 0,
            penjualanBruto: 0,
            jumlahRefund: 0,
            nilaiRefund: 0,
            penjualanBersih: 0,
            totalModal: 0,
            laba: 0,
            marginPersen: 0,
          },
        },
      })

      try {
        const summary = await laporanApi.getPenjualan()
        expect(summary.jumlahTransaksi).toBe(0)
        expect(summary.totalModal).toBe(0)
        expect(summary.laba).toBe(0)
        expect(summary.marginPersen).toBe(0)
        expect(Number.isNaN(summary.marginPersen)).toBe(false)
      } finally {
        getSpy.mockRestore()
      }
    })

    it('dapat mengekspor laporan penjualan multi-sheet ke format Excel (.xlsx)', () => {
      const result = exportMultiSheetExcel({
        filename: 'Laporan_Penjualan_Test',
        sheets: [
          {
            sheetName: 'Per Item',
            columns: [
              { header: 'Nama Menu', key: 'nama' },
              { header: 'Qty', key: 'qty' },
              { header: 'Laba Kotor', key: 'laba' },
            ],
            data: [
              { nama: 'Nasi Goreng', qty: 20, laba: 60000 },
              { nama: 'Es Teh', qty: 35, laba: 70000 },
            ],
          },
          {
            sheetName: 'Per Kategori',
            columns: [
              { header: 'Kategori', key: 'kategori' },
              { header: 'Omset', key: 'omset' },
            ],
            data: [
              { kategori: 'Makanan Berat', omset: 500000 },
              { kategori: 'Minuman', omset: 250000 },
            ],
          },
        ],
      })

      expect(result.workbook.SheetNames).toEqual(['Per Item', 'Per Kategori'])
    })

    it('dapat mengekspor laporan penjualan multi-section ke format PDF (.pdf)', () => {
      const result = exportMultiSectionPdf({
        filename: 'Laporan_Penjualan_Multi_Test',
        title: 'LAPORAN PENJUALAN KANTIN SKOOLIA',
        subtitle: 'Analisis Penjualan Menu dan Kategori',
        metadata: {
          'Tanggal Cetak': '2026-10-27',
          'Penjualan Bersih': 'Rp 5.250.000',
        },
        sections: [
          {
            sectionTitle: '1. Rincian Penjualan per Item',
            columns: [
              { header: 'Nama Menu', key: 'nama' },
              { header: 'Qty', key: 'qty' },
              { header: 'Laba Kotor', key: 'laba' },
            ],
            data: [
              { nama: 'Nasi Goreng Spesial', qty: 25, laba: 'Rp 125.000' },
              { nama: 'Es Teh Manis', qty: 50, laba: 'Rp 100.000' },
            ],
          },
          {
            sectionTitle: '2. Ringkasan per Kategori',
            columns: [
              { header: 'Kategori', key: 'kategori' },
              { header: 'Total Omset', key: 'omset' },
            ],
            data: [
              { kategori: 'Makanan', omset: 'Rp 3.500.000' },
              { kategori: 'Minuman', omset: 'Rp 1.750.000' },
            ],
          },
        ],
      })

      expect(result).toBeDefined()
      expect(result.filename).toBe('Laporan_Penjualan_Multi_Test.pdf')
      expect(result.doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
      expect(result.buffer?.byteLength).toBeGreaterThan(0)
    })
  })

  describe('Laporan Saldo Mengendap & Riwayat Belanja Siswa (PRD §9.5)', () => {
    it('mengambil ringkasan saldo mengendap dan rincian per siswa', async () => {
      const [ringkasan, siswa] = await Promise.all([
        laporanApi.getSaldoMengendap(),
        laporanApi.getSiswaSaldoList(),
      ])

      expect(ringkasan.total).toBe(ringkasan.saldoSiswa)
      expect(siswa.length).toBeGreaterThan(0)
      expect(siswa[0]).toHaveProperty('nis')
      expect(siswa[0]).toHaveProperty('saldo')
    })

    it('mengambil riwayat belanja lengkap siswa beserta rincian item pesanan untuk komplain ortu', async () => {
      const { profil, riwayat } = await laporanApi.getRiwayatBelanjaSiswa(101)

      expect(profil).toBeDefined()
      expect(profil.siswaId).toBe(101)
      expect(profil.nama).toBe('Budi Santoso')
      expect(profil).toHaveProperty('parentName')

      expect(riwayat.length).toBeGreaterThan(0)
      const belanjaTrx = riwayat.find((r) => r.jenis === 'BELANJA')
      expect(belanjaTrx).toBeDefined()
      expect(belanjaTrx?.items).toBeDefined()
      expect(belanjaTrx?.items?.length).toBeGreaterThan(0)
      expect(belanjaTrx?.titikKasir).toBeDefined()
      expect(belanjaTrx?.petugas).toBeDefined()
    })

    it('mengambil riwayat transaksi keseluruhan seluruh siswa secara terurut', async () => {
      const list = await laporanApi.getRiwayatTransaksiKeseluruhan()

      expect(list.length).toBeGreaterThan(0)
      expect(list[0].siswaNama).toBeDefined()
      expect(list[0].siswaNis).toBeDefined()
      expect(list[0].referensiId).toBeDefined()
      expect(list[0].nominal).toBeGreaterThan(0)
    })

    it('menangani secara aman siswa tanpa catatan saldo/transaksi di backend (404) menjadi profil fallback dan riwayat kosong', async () => {
      const { profil, riwayat } = await laporanApi.getRiwayatBelanjaSiswa(999999)

      expect(profil).toBeDefined()
      expect(profil.siswaId).toBe(999999)
      expect(profil.saldo).toBe(0)
      expect(riwayat).toEqual([])
    })
  })

  describe('Laporan Kerugian Stok (PRD §9.5)', () => {
    it('mengambil mutasi kerugian stok (opname keluar dan barang rusak)', async () => {
      const [list, ringkasan] = await Promise.all([
        laporanApi.getKerugianStok(),
        laporanApi.getRingkasanKerugianStok(),
      ])

      expect(list.length).toBeGreaterThan(0)
      expect(list[0]).toHaveProperty('namaMenu')
      expect(list[0]).toHaveProperty('hppSnapshot')
      expect(list[0]).toHaveProperty('totalNilai')
      expect(list[0].totalNilai).toBe(list[0].qty * list[0].hppSnapshot)

      expect(ringkasan.totalKerugian).toBeGreaterThan(0)
      expect(ringkasan.totalQtyHilang).toBeGreaterThan(0)
    })

    it('menyinkronkan selisih minus hasil opname ke laporan kerugian stok dengan atribut lengkap', async () => {
      const baId = `BA-OPN-TEST-${Date.now()}`
      await stokApi.sesuaikanOpnameBatch({
        referensiId: baId,
        items: [
          {
            menuId: 1,
            qtyFisik: 0,
            alasan: 'Audit fisik: barang hilang dari etalase',
          },
        ],
      })

      const list = await laporanApi.getKerugianStok()
      const found = list.find((item) => item.beritaAcaraId === baId)
      expect(found).toBeDefined()
      expect(found?.namaMenu).toBeTruthy()
      expect(found?.kategoriNama).toBeTruthy()
      expect(found?.qty).toBeGreaterThan(0)
      expect(found?.hppSnapshot).toBeGreaterThan(0)
      expect(found?.totalNilai).toBe((found?.qty || 0) * (found?.hppSnapshot || 0))
      expect(found?.alasan).toContain('barang hilang dari etalase')
      expect(found?.petugas).toBeTruthy()
    })
  })

  describe('Utilitas Filter Tanggal Laporan (Date Filter Utils)', () => {
    it('getDefaultDateFilter mengembalikan tanggal hari ini dan label canonical yang sesuai', () => {
      const testDate = new Date(2026, 10, 11)
      const res = getDefaultDateFilter(testDate)
      expect(res.params).toEqual({ tanggal: '2026-11-11' })
      expect(res.label).toContain('Hari Ini')
    })

    it('getPresetLabel mengembalikan label yang sesuai untuk preset hari ini, kemarin, dan rentang waktu', () => {
      const testDate = new Date(2026, 10, 11)
      expect(getPresetLabel('TODAY', testDate)).toContain('Hari Ini')
      expect(getPresetLabel('YESTERDAY', testDate)).toContain('Kemarin')
      expect(getPresetLabel('LAST_7_DAYS', testDate)).toBe('7 Hari Terakhir')
      expect(getPresetLabel('LAST_30_DAYS', testDate)).toBe('30 Hari Terakhir')
      expect(getPresetLabel('THIS_MONTH', testDate)).toContain('Bulan Ini')
    })

    it('ALL_TIME_PARAMS berupa object kosong untuk kompatibilitas ke belakang', () => {
      expect(ALL_TIME_PARAMS).toEqual({})
      expect(Object.keys(ALL_TIME_PARAMS).length).toBe(0)
    })

    it('formatYmd memformat objek tanggal ke format YYYY-MM-DD secara konsisten', () => {
      const d = new Date(2026, 10, 10) // 10 Nov 2026 (month index 10 = Nov)
      expect(formatYmd(d)).toBe('2026-11-10')
    })

    it('getTimezoneOffsetString mengembalikan format offset yang valid (+HH:MM atau -HH:MM)', () => {
      const offset = getTimezoneOffsetString()
      expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/)
    })

    it('startOfDayIso dan nextDayStartIso menghasilkan rentang setengah terbuka [dari, sampai) yang presisi', () => {
      const offset = getTimezoneOffsetString()
      const start = startOfDayIso('2026-11-10')
      const end = nextDayStartIso('2026-11-10')

      expect(start).toBe(`2026-11-10T00:00:00${offset}`)
      expect(end).toBe(`2026-11-11T00:00:00${offset}`)

      // Menguji pergantian akhir tahun
      const endOfYearNext = nextDayStartIso('2026-12-31')
      expect(endOfYearNext).toBe(`2027-01-01T00:00:00${offset}`)
    })
  })
})
