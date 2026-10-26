import { describe, it, expect, beforeAll } from 'vitest'
import * as XLSX from 'xlsx'
import { setupMockAdapter } from '@/mocks/mock-adapter'
import { apiClient } from '@/lib/api-client'
import { laporanApi } from '../api/laporan-api'
import { stokApi } from '@/features/stok/api/stok-api'
import {
  exportTableToExcel,
  exportMultiSheetExcel,
} from '@/lib/excelExport'
import { formatRupiah } from '@/lib/formatters'

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
      expect(data.saldoMengendap).toBe(data.saldoSiswa + data.saldoKartuTamu)
    })

    it('menampilkan indikator selisih (seimbang=false, selisih!=0) secara akurat saat simulasi selisih aktif', async () => {
      const data = await laporanApi.getRekonsiliasi({ simulasiSelisih: true })

      expect(data).toBeDefined()
      // Pada mode simulasi selisih
      expect(data.selisih).toBe(75000)
      expect(data.seimbang).toBe(false)
      expect(data.selisih).not.toBe(0)
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
        { pos: 'Saldo Mengendap Siswa', nominal: 400000, arah: 'STATUS' },
        { pos: 'Saldo Mengendap Tamu', nominal: 100000, arah: 'STATUS' },
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

      const ws = result.workbook.Sheets['Rekonsiliasi']
      const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
      expect((sheetData[0] as unknown[])[0]).toBe('LAPORAN REKONSILIASI HARIAN KANTIN')
    })
  })

  describe('Laporan Penjualan & Laba Kotor (PRD §9.5)', () => {
    it('mengambil ringkasan penjualan, HPP, laba kotor, dan margin dengan tepat', async () => {
      const data = await laporanApi.getPenjualan()

      expect(data).toBeDefined()
      expect(data.penjualanBersih).toBe(data.penjualanBruto - data.nilaiVoid)
      expect(data.labaKotor).toBe(data.penjualanBersih - data.totalHpp)
      expect(data.marginLabaPersen).toBeGreaterThan(0)
    })

    it('mengambil penjualan per item menu, kategori, dan titik kasir', async () => {
      const [items, kategoris, kasirs] = await Promise.all([
        laporanApi.getPenjualanPerItem(),
        laporanApi.getPenjualanPerKategori(),
        laporanApi.getPenjualanPerKasir(),
      ])

      expect(items.length).toBeGreaterThan(0)
      expect(items[0]).toHaveProperty('nama')
      expect(items[0]).toHaveProperty('qty')
      expect(items[0]).toHaveProperty('labaKotor')
      expect(items[0].labaKotor).toBe(items[0].penjualanBersih - items[0].totalHpp)

      expect(kategoris.length).toBeGreaterThan(0)
      expect(kategoris[0]).toHaveProperty('nama')
      expect(kategoris[0]).toHaveProperty('penjualanBersih')

      expect(kasirs.length).toBeGreaterThan(0)
      expect(kasirs[0]).toHaveProperty('namaTitikKasir')
      expect(kasirs[0]).toHaveProperty('penjualanBersih')
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
  })

  describe('Laporan Saldo Mengendap & Riwayat Belanja Siswa (PRD §9.5)', () => {
    it('mengambil ringkasan saldo mengendap dan rincian per siswa serta kartu tamu', async () => {
      const [ringkasan, siswa, kartuTamu] = await Promise.all([
        laporanApi.getSaldoMengendap(),
        laporanApi.getSiswaSaldoList(),
        laporanApi.getKartuTamuSaldoList(),
      ])

      expect(ringkasan.total).toBe(ringkasan.saldoSiswa + ringkasan.saldoKartuTamu)
      expect(siswa.length).toBeGreaterThan(0)
      expect(siswa[0]).toHaveProperty('nis')
      expect(siswa[0]).toHaveProperty('saldo')

      expect(kartuTamu.length).toBeGreaterThan(0)
      expect(kartuTamu[0]).toHaveProperty('nomorKartu')
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
})
