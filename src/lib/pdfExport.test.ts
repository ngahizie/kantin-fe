import { describe, it, expect } from 'vitest'
import {
  exportTableToPdf,
  exportMultiSectionPdf,
  sanitizePdfFilename,
} from './pdfExport'

describe('pdfExport utility', () => {
  it('berhasil membersihkan nama file dan memastikan ekstensi .pdf', () => {
    expect(sanitizePdfFilename('Laporan Penjualan')).toBe('Laporan Penjualan.pdf')
    expect(sanitizePdfFilename('Laporan/Penjualan:Harian*.pdf')).toBe('Laporan_Penjualan_Harian_.pdf')
    expect(sanitizePdfFilename('laporan.PDF')).toBe('laporan.PDF')
  })

  it('berhasil memformat dan mengekspor single table ke dokumen PDF', () => {
    const data = [
      { id: 1, nama: 'Nasi Kuning Komplit', harga: 15000, qty: 10, total: 150000 },
      { id: 2, nama: 'Es Teh Manis', harga: 4000, qty: 25, total: 100000 },
    ]

    const result = exportTableToPdf({
      filename: 'laporan-penjualan-test',
      title: 'Laporan Penjualan Harian Kantin',
      subtitle: 'Kantin Utama SKOOLIA',
      metadata: {
        'Tanggal Cetak': '2026-10-27',
        'Petugas Jaga': 'Budi Santoso',
        'Total Omzet': 'Rp 250.000',
      },
      columns: [
        { header: 'No', key: 'id' },
        { header: 'Menu Makanan/Minuman', key: 'nama' },
        {
          header: 'Harga Satuan',
          key: 'harga',
          formatter: (v) => `Rp ${Number(v).toLocaleString('id-ID')}`,
        },
        { header: 'Qty Terjual', key: 'qty' },
        {
          header: 'Total Penjualan',
          key: 'total',
          formatter: (v) => `Rp ${Number(v).toLocaleString('id-ID')}`,
        },
      ],
      data,
    })

    expect(result).toBeDefined()
    expect(result.filename).toBe('laporan-penjualan-test.pdf')
    expect(result.doc).toBeDefined()
    expect(result.doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    expect(result.buffer).toBeDefined()
    expect(result.buffer?.byteLength).toBeGreaterThan(0)
  })

  it('berhasil mengekspor multi section ke dalam satu dokumen PDF', () => {
    const result = exportMultiSectionPdf({
      filename: 'laporan-multi-section',
      title: 'LAPORAN REKONSILIASI LENGKAP',
      subtitle: 'Periode Oktober 2026',
      metadata: {
        'Tanggal': '2026-10-27',
        'Status': 'Seimbang (Balance)',
      },
      sections: [
        {
          sectionTitle: 'Bagian 1: Ringkasan Pos Keuangan',
          columns: [
            { header: 'Pos Transaksi', key: 'pos' },
            { header: 'Total Nominal', key: 'nominal' },
          ],
          data: [
            { pos: 'Top-up Masuk', nominal: 'Rp 500.000' },
            { pos: 'Penjualan Bersih', nominal: 'Rp 350.000' },
          ],
        },
        {
          sectionTitle: 'Bagian 2: Rincian Sesi Kasir',
          columns: [
            { header: 'ID Sesi', key: 'id' },
            { header: 'Titik Kasir', key: 'kasir' },
            { header: 'Petugas', key: 'petugas' },
            { header: 'Total Fisik', key: 'fisik' },
          ],
          data: [
            { id: 'S-01', kasir: 'Kasir Utama', petugas: 'Ani', fisik: 'Rp 350.000' },
          ],
        },
      ],
    })

    expect(result).toBeDefined()
    expect(result.filename).toBe('laporan-multi-section.pdf')
    expect(result.doc).toBeDefined()
    expect(result.doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    expect(result.buffer).toBeDefined()
    expect(result.buffer?.byteLength).toBeGreaterThan(0)
  })

  it('menangani data kosong dengan aman dan tetap mencetak struktur tabel', () => {
    const result = exportTableToPdf({
      filename: 'laporan-kosong',
      title: 'Laporan Data Kosong',
      columns: [
        { header: 'Kolom 1', key: 'col1' },
        { header: 'Kolom 2', key: 'col2' },
      ],
      data: [],
    })

    expect(result).toBeDefined()
    expect(result.filename).toBe('laporan-kosong.pdf')
    expect(result.doc.getNumberOfPages()).toBe(1)
    expect(result.buffer?.byteLength).toBeGreaterThan(0)
  })
})
