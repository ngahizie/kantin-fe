import { describe, it, expect } from 'vitest'
import {
  exportTableToExcel,
  exportMultiSheetExcel,
  exportRawDataToExcel,
} from './excelExport'

describe('excelExport utility (ExcelJS template resmi)', () => {
  it('berhasil memformat dan mengekspor single table ke workbook dengan kop dan gaya Navy #123463', async () => {
    const data = [
      { id: 1, nama: 'Nasi Goreng', harga: 15000, qty: 10 },
      { id: 2, nama: 'Es Teh Manis', harga: 4000, qty: 25 },
    ]

    const result = await exportTableToExcel({
      filename: 'laporan-penjualan-test',
      sheetName: 'Penjualan',
      title: 'Laporan Penjualan Harian Kantin',
      schoolName: 'SMP Negeri 1 Skoolia',
      schoolAddress: 'Jl. Merdeka No. 1, Lingkungan Pendidikan SKOOLIA',
      metadata: {
        'Tanggal Cetak': '12 November 2026 10:10',
        'Periode': '06 November 2026 s.d. 12 November 2026',
      },
      columns: [
        { header: 'No', key: 'id', width: 6 },
        { header: 'Menu Makanan/Minuman', key: 'nama', width: 25 },
        {
          header: 'Harga Satuan',
          key: 'harga',
          formatter: (v) => `Rp ${Number(v).toLocaleString('id-ID')}`,
        },
        { header: 'Jumlah Terjual', key: 'qty' },
      ],
      data,
      summaryRow: {
        id: 'Total',
        qty: 35,
      },
      footnote: 'Keterangan: Laporan resmi dicetak dari sistem Kantin Cashless',
    })

    expect(result).toBeDefined()
    expect(result.filename).toBe('laporan-penjualan-test.xlsx')
    expect(result.workbook).toBeDefined()

    const ws = result.workbook.getWorksheet('Penjualan')
    expect(ws).toBeDefined()

    // Verifikasi kolom A padding lebar 3.0
    expect(ws?.getColumn(1).width).toBe(3.0)

    // Verifikasi Kop
    expect(ws?.getCell('B1').value).toBe('LAPORAN PENJUALAN HARIAN KANTIN')
    expect(ws?.getCell('B1').font?.name).toBe('Calibri')
    expect(ws?.getCell('B1').font?.bold).toBe(true)

    expect(ws?.getCell('B2').value).toBe('SMP NEGERI 1 SKOOLIA')
    expect(ws?.getCell('B3').value).toBe('Jl. Merdeka No. 1, Lingkungan Pendidikan SKOOLIA')

    // Verifikasi Metadata di Baris 5
    const metaVal = String(ws?.getCell('B5').value || '')
    expect(metaVal).toContain('Dicetak: 12 November 2026 10:10')
    expect(metaVal).toContain('Periode: 06 November 2026 s.d. 12 November 2026')

    // Verifikasi Header Kolom di Baris 6 (Navy #123463)
    const headerCell = ws?.getCell('B6')
    expect(headerCell?.value).toBe('No')
    expect(headerCell?.font?.color?.argb).toBe('FFFFFFFF')
    expect(headerCell?.fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF123463' },
    })

    // Verifikasi Data Baris 7 & Baris 8 (Zebra striping #F0F4FB)
    const row1Cell = ws?.getCell('B7')
    expect(row1Cell?.value).toBe(1)

    const row2Cell = ws?.getCell('B8')
    expect(row2Cell?.value).toBe(2)
    expect(row2Cell?.fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F4FB' },
    })

    // Verifikasi Buffer
    const buffer = await result.bufferPromise
    expect(buffer).toBeDefined()
    expect(buffer?.byteLength).toBeGreaterThan(0)
  })

  it('berhasil mengekspor multi sheet ke dalam satu workbook', async () => {
    const result = await exportMultiSheetExcel({
      filename: 'laporan-multi-sheet',
      sheets: [
        {
          sheetName: 'Ringkasan',
          columns: [
            { header: 'Pos', key: 'pos' },
            { header: 'Nominal', key: 'nominal' },
          ],
          data: [
            { pos: 'Top-up Masuk', nominal: 500000 },
            { pos: 'Penjualan Bersih', nominal: 350000 },
          ],
        },
        {
          sheetName: 'Detail',
          columns: [
            { header: 'ID', key: 'id' },
            { header: 'Keterangan', key: 'ket' },
          ],
          data: [{ id: 101, ket: 'Tap Kasir POS' }],
        },
      ],
    })

    expect(result).toBeDefined()
    expect(result.filename).toBe('laporan-multi-sheet.xlsx')
    const sheetNames = result.workbook.worksheets.map((s) => s.name)
    expect(sheetNames).toEqual(['Ringkasan', 'Detail'])
  })

  it('berhasil mengekspor raw array of arrays', async () => {
    const headers = ['Kode', 'Item', 'Nilai']
    const rows = [
      ['A1', 'Bakso', 12000],
      ['B2', 'Soto', 15000],
    ]

    const result = await exportRawDataToExcel(
      'laporan-raw.xlsx',
      'Data Mentah',
      headers,
      rows
    )
    expect(result).toBeDefined()
    expect(result.filename).toBe('laporan-raw.xlsx')
    const ws = result.workbook.getWorksheet('Data Mentah')
    expect(ws).toBeDefined()
    expect(ws?.getCell('B6').value).toBe('Kode')
  })
})
