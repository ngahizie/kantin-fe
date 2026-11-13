/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility Ekspor Data ke Format Microsoft Excel (.xlsx)
 * Modul Laporan SKOOLIA Kantin
 *
 * Menggunakan library 'exceljs' untuk menghasilkan berkas Excel
 * resmi yang elegan sesuai template acuan docs/Ekspor excel.xlsx:
 * - Margin kolom A kosong (lebar 3.0)
 * - Kop 3 baris (Judul Laporan, Nama Sekolah, Alamat)
 * - Metadata periode & tanggal cetak
 * - Header tabel biru Navy (#123463) dengan teks putih tebal
 * - Baris data zebra striping (#F0F4FB) dengan auto-alignment
 * - Baris total berlatar biru (#22559B)
 * - Catatan kaki keterangan
 */

import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth-store'
import { SCHOOL_LOGO_BASE64 } from '@/assets/schoolLogoBase64'

export interface ExcelColumn<T = any> {
  header: string
  key?: keyof T | string
  formatter?: (val: unknown, row: T, rowIndex: number) => string | number | boolean | null | undefined
  width?: number
  align?: 'left' | 'center' | 'right'
}

export interface ExportTableOptions<T = any> {
  filename: string
  sheetName?: string
  title?: string
  schoolName?: string
  schoolAddress?: string
  metadata?: Record<string, string | number | undefined | null>
  columns: ExcelColumn<T>[]
  data: T[]
  summaryRow?: Record<string, string | number | null | undefined>
  summaryRowColor?: 'navy' | 'gray' | string
  autoSummaryRow?: boolean
  footnote?: string
}

export interface SheetConfig<T = any> {
  sheetName: string
  title?: string
  schoolName?: string
  schoolAddress?: string
  metadata?: Record<string, string | number | undefined | null>
  columns: ExcelColumn<T>[]
  data: T[]
  summaryRow?: Record<string, string | number | null | undefined>
  summaryRowColor?: 'navy' | 'gray' | string
  autoSummaryRow?: boolean
  footnote?: string
}

export interface MultiSheetExportOptions {
  filename: string
  sheets: SheetConfig<any>[]
}

export type StyledWorkbook = ExcelJS.Workbook & {
  SheetNames?: string[]
  Sheets?: Record<string, any>
}

export interface ExportExcelResult {
  workbook: StyledWorkbook
  filename: string
  bufferPromise: Promise<Uint8Array | undefined>
}

/**
 * Membersihkan nama file dari karakter ilegal
 */
export function sanitizeFilename(filename: string): string {
  const clean = filename.replace(/[\\/:*?"<>|]/g, '_').trim()
  return clean.toLowerCase().endsWith('.xlsx') ? clean : `${clean}.xlsx`
}

/**
 * Mendeteksi perataan kolom berdasarkan header / key jika tidak dispesifikasikan manual
 */
function resolveColumnAlignment<T>(col: ExcelColumn<T>): 'left' | 'center' | 'right' {
  if (col.align) return col.align

  const str = `${col.header} ${String(col.key || '')}`.toLowerCase()

  if (
    str.includes('rp') ||
    str.includes('harga') ||
    str.includes('total') ||
    str.includes('hpp') ||
    str.includes('laba') ||
    str.includes('qty') ||
    str.includes('jumlah') ||
    str.includes('saldo') ||
    str.includes('nominal') ||
    str.includes('margin') ||
    str.includes('omzet') ||
    str.includes('omset') ||
    str.includes('bruto') ||
    str.includes('disetor') ||
    str.includes('fisik') ||
    str.includes('sistem') ||
    str.includes('selisih') ||
    str.includes('terjual')
  ) {
    return 'right'
  }

  if (
    str === 'no' ||
    str === 'no.' ||
    str === 'id' ||
    str.includes('kode') ||
    str.includes('status') ||
    str.includes('tipe') ||
    str.includes('waktu') ||
    str.includes('tanggal') ||
    str.includes('kelas') ||
    str.includes('jenjang') ||
    str.includes('nis')
  ) {
    return 'center'
  }

  return 'left'
}

/**
 * Menentukan apakah suatu kolom layak/bagus dijumlahkan pada baris footer (total)
 */
export function shouldColumnBeSummed(key: string, header: string): boolean {
  const str = `${key} ${header}`.toLowerCase().trim()

  // Kolom nomor urut, ID, kode, harga satuan, limit, persentase, tanggal dsb. tidak dijumlahkan
  if (
    str === 'no' ||
    str === 'no.' ||
    str.startsWith('no.') ||
    str.startsWith('no ') ||
    str === 'id' ||
    str.endsWith('id') ||
    str.includes('nis') ||
    str.includes('kode') ||
    str.includes('referensi') ||
    str.includes('transaksi') ||
    str.includes('harga') ||
    str.includes('hpp') ||
    str.includes('modalunit') ||
    str.includes('modal unit') ||
    str.includes('persen') ||
    str.includes('margin') ||
    str.includes('limit') ||
    str.includes('rate') ||
    str.includes('saldoakhir') ||
    str.includes('saldo akhir') ||
    str.includes('saldosetelah') ||
    str.includes('saldo setelah') ||
    str.includes('sisasaldo') ||
    str.includes('sisa saldo') ||
    str.includes('status') ||
    str.includes('kelas') ||
    str.includes('tanggal') ||
    str.includes('waktu') ||
    str.includes('petugas') ||
    str.includes('kasir') ||
    str.includes('orang') ||
    str.includes('wali') ||
    str.includes('kategori') ||
    str.includes('jenis') ||
    str.includes('alasan') ||
    str.includes('berita') ||
    str.includes('nama') ||
    str.includes('item')
  ) {
    return false
  }

  // Kolom akumulasi kuantitatif / moneter yang bagus dijumlahkan
  if (
    str.includes('total') ||
    str.includes('nominal') ||
    str.includes('omzet') ||
    str.includes('omset') ||
    str.includes('laba') ||
    str.includes('qty') ||
    str.includes('jumlah') ||
    str.includes('belanja') ||
    str.includes('bruto') ||
    str.includes('void') ||
    str.includes('bersih') ||
    str.includes('selisih') ||
    str.includes('disetor') ||
    str.includes('kerugian') ||
    (str.includes('saldo') && !str.includes('sisa') && !str.includes('akhir') && !str.includes('setelah'))
  ) {
    return true
  }

  return false
}

/**
 * Mengambil informasi sekolah aktif dari auth store dengan fallback yang aman
 */
function getSchoolProfile(): { name: string; address: string } {
  try {
    const user = useAuthStore.getState().auth.user
    const name = user?.sekolahNama || 'SMP NEGERI 1 SKOOLIA'
    const address = 'Jl. Merdeka No. 1, Lingkungan Pendidikan SKOOLIA'
    return { name, address }
  } catch {
    return {
      name: 'SMP NEGERI 1 SKOOLIA',
      address: 'Jl. Merdeka No. 1, Lingkungan Pendidikan SKOOLIA',
    }
  }
}

const COLOR_NAVY = 'FF123463'
const COLOR_ZEBRA = 'FFF0F4FB'
const COLOR_TOTAL = 'FF22559B'
const COLOR_GRAY_TEXT = 'FF646464'
const COLOR_BORDER = 'FFE0E0E0'
const COLOR_HEADER_BORDER = 'FFD3D3D3'

/**
 * Membangun worksheet pada workbook ExcelJS sesuai format template docs/Ekspor excel.xlsx
 */
function populateWorksheet<T>(
  ws: ExcelJS.Worksheet,
  config: {
    title?: string
    schoolName?: string
    schoolAddress?: string
    metadata?: Record<string, string | number | undefined | null>
    columns: ExcelColumn<T>[]
    data: T[]
    summaryRow?: Record<string, string | number | null | undefined>
    summaryRowColor?: 'navy' | 'gray' | string
    autoSummaryRow?: boolean
    footnote?: string
  }
) {
  const schoolProfile = getSchoolProfile()
  const title = config.title || 'LAPORAN KANTIN CASHLESS'
  const schoolName = (config.schoolName || schoolProfile.name).toUpperCase()
  const schoolAddress = config.schoolAddress || schoolProfile.address

  const numCols = config.columns.length
  // Tabel dimulai dari kolom B (indeks kolom 2), kolom A (indeks 1) adalah padding
  const startCol = 2
  const endCol = startCol + numCols - 1

  // Set lebar kolom A sebagai padding visual (lebar 3.0 sesuai template)
  ws.getColumn(1).width = 3.0

  // Set lebar kolom tabel
  config.columns.forEach((col, idx) => {
    const colNumber = startCol + idx
    const isNoCol =
      col.header.toLowerCase() === 'no' ||
      col.header.toLowerCase() === 'no.' ||
      col.key === 'no'

    if (isNoCol) {
      ws.getColumn(colNumber).width = col.width || 6
      return
    }

    let maxLen = col.header.length

    for (const item of config.data) {
      let val: unknown = undefined
      if (col.key) val = (item as Record<string, unknown>)[col.key as string]
      if (col.formatter) val = col.formatter(val, item, 0)
      const str = val !== undefined && val !== null ? String(val) : ''
      if (str.length > maxLen) {
        maxLen = str.length
      }
    }

    const calculatedWidth = col.width
      ? col.width
      : Math.min(Math.max(maxLen + 4, 12), 45)
    ws.getColumn(colNumber).width = calculatedWidth
  })

  // Tambahkan Logo Sekolah Resmi dari template docs/Ekspor excel.xlsx
  try {
    const logoId = ws.workbook.addImage({
      base64: SCHOOL_LOGO_BASE64,
      extension: 'png',
    })

    // Logo kiri di Kolom B (index 1), Baris 1-4
    ws.addImage(logoId, {
      tl: { col: 1, row: 0 },
      br: { col: 2, row: 4 },
      editAs: 'oneCell',
    } as any)

    // Logo kanan di Kolom paling kanan jika kolom tabel >= 5
    if (endCol - 1 >= 4) {
      ws.addImage(logoId, {
        tl: { col: endCol - 1, row: 0 },
        br: { col: endCol, row: 4 },
        editAs: 'oneCell',
      } as any)
    }
  } catch (_imgErr) {
    // Abaikan jika tidak didukung oleh lingkungan tertentu
  }

  // Baris 1: Judul Laporan
  ws.mergeCells(1, startCol, 1, endCol)
  const cellB1 = ws.getCell(1, startCol)
  cellB1.value = title
  cellB1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR_NAVY } }
  cellB1.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 26

  // Baris 2: Nama Sekolah
  ws.mergeCells(2, startCol, 2, endCol)
  const cellB2 = ws.getCell(2, startCol)
  cellB2.value = schoolName
  cellB2.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLOR_NAVY } }
  cellB2.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(2).height = 20

  // Baris 3: Alamat Sekolah
  ws.mergeCells(3, startCol, 3, endCol)
  const cellB3 = ws.getCell(3, startCol)
  cellB3.value = schoolAddress
  cellB3.font = { name: 'Calibri', size: 10, bold: false, color: { argb: COLOR_GRAY_TEXT } }
  cellB3.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(3).height = 16

  // Baris 4: Baris Pemisah Kosong (tinggi 4)
  ws.getRow(4).height = 4

  // Baris 5: Metadata (Dicetak Pada | Periode)
  const metaText = config.metadata
    ? (() => {
        const parts: string[] = []
        const printDate =
          config.metadata['Tanggal Cetak'] ||
          config.metadata['Dicetak'] ||
          new Date().toLocaleString('id-ID')
        parts.push(`Dicetak: ${printDate}`)

        const periode = config.metadata['Periode'] || config.metadata['Tanggal']
        if (periode) {
          parts.push(`Periode: ${periode}`)
        }

        for (const [key, val] of Object.entries(config.metadata)) {
          if (
            key !== 'Tanggal Cetak' &&
            key !== 'Dicetak' &&
            key !== 'Periode' &&
            key !== 'Tanggal' &&
            val !== undefined &&
            val !== null &&
            val !== ''
          ) {
            parts.push(`${key}: ${val}`)
          }
        }
        return parts.join('   |   ')
      })()
    : `Dicetak: ${new Date().toLocaleString('id-ID')}`

  ws.mergeCells(5, startCol, 5, endCol)
  const cellB5 = ws.getCell(5, startCol)
  cellB5.value = metaText
  cellB5.font = { name: 'Calibri', size: 10, bold: false, color: { argb: COLOR_NAVY } }
  cellB5.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(5).height = 16

  // Baris 6: Header Kolom Tabel
  const headerRow = ws.getRow(6)
  headerRow.height = 22

  config.columns.forEach((col, idx) => {
    const colNumber = startCol + idx
    const cell = ws.getCell(6, colNumber)
    cell.value = col.header
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_NAVY },
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: COLOR_HEADER_BORDER } },
      bottom: { style: 'thin', color: { argb: COLOR_HEADER_BORDER } },
      left: { style: 'thin', color: { argb: COLOR_NAVY } },
      right: { style: 'thin', color: { argb: COLOR_NAVY } },
    }
  })

  // Baris 7+: Data Rows (Zebra Striping)
  let currentRowNum = 7
  config.data.forEach((item, rowIdx) => {
    const row = ws.getRow(currentRowNum)
    row.height = 19
    const isZebra = rowIdx % 2 === 1

    config.columns.forEach((col, colIdx) => {
      const colNumber = startCol + colIdx
      const cell = ws.getCell(currentRowNum, colNumber)

      let val: unknown = undefined
      if (col.key) {
        val = (item as Record<string, unknown>)[col.key as string]
      }
      if (col.formatter) {
        val = col.formatter(val, item, rowIdx)
      }
      const isNoCol =
        col.header.toLowerCase() === 'no' ||
        col.header.toLowerCase() === 'no.' ||
        col.key === 'no'
      if (isNoCol && (val === undefined || val === null || val === '')) {
        val = rowIdx + 1
      }
      if (val === undefined || val === null) {
        val = ''
      }

      cell.value = val as any
      cell.font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } }

      if (isZebra) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLOR_ZEBRA },
        }
      }

      const align = resolveColumnAlignment(col)
      cell.alignment = { horizontal: align, vertical: 'middle' }

      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
        left: { style: 'thin', color: { argb: COLOR_BORDER } },
        right: { style: 'thin', color: { argb: COLOR_BORDER } },
      }
    })

    currentRowNum++
  })

  // Baris Total / Summary: Ditambahkan pada semua eksporan
  let summaryData = config.summaryRow
  if (!summaryData && config.autoSummaryRow !== false) {
    summaryData = {}
    config.columns.forEach((col) => {
      const colKey = (col.key as string) || col.header
      const canSum = shouldColumnBeSummed(colKey, col.header)
      if (!canSum) {
        summaryData![colKey] = ''
        return
      }

      let sum = 0
      let hasValues = false
      for (const item of config.data) {
        const raw = col.key ? (item as Record<string, unknown>)[col.key as string] : undefined
        if (typeof raw === 'number' && !isNaN(raw)) {
          sum += raw
          hasValues = true
        } else if (raw !== undefined && raw !== null && raw !== '') {
          const parsed = Number(raw)
          if (!isNaN(parsed)) {
            sum += parsed
            hasValues = true
          }
        }
      }
      summaryData![colKey] = hasValues ? sum : ''
    })
  }

  if (summaryData) {
    const summaryRowNum = currentRowNum
    const row = ws.getRow(summaryRowNum)
    row.height = 20

    // Warna footer: Navy royal FF22559B (agak lebih cerah dari header FF123463 tapi tidak terlalu terang)
    const fillColor = COLOR_TOTAL
    const fontColor = 'FFFFFFFF'
    const borderColor = COLOR_HEADER_BORDER

    config.columns.forEach((col, colIdx) => {
      const colNumber = startCol + colIdx
      const cell = ws.getCell(summaryRowNum, colNumber)

      let val: unknown = ''
      if (col.key && summaryData?.[col.key as string] !== undefined) {
        val = summaryData[col.key as string]
      } else if (summaryData?.[col.header] !== undefined) {
        val = summaryData[col.header]
      }

      const isNoCol =
        col.header.toLowerCase() === 'no' ||
        col.header.toLowerCase() === 'no.' ||
        col.key === 'no'
      if (isNoCol) {
        val = ''
      }

      const isNum = typeof val === 'number' && !isNaN(val)
      cell.value = (isNum ? val : '') as any
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: fontColor } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      }

      const align = resolveColumnAlignment(col)
      cell.alignment = {
        horizontal: isNum ? 'right' : align,
        vertical: 'middle',
      }

      cell.border = {
        top: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'double', color: { argb: borderColor } },
        left: { style: 'thin', color: { argb: fillColor } },
        right: { style: 'thin', color: { argb: fillColor } },
      }
    })
    currentRowNum++
  }

  // Catatan Kaki / Footnote jika ada
  if (config.footnote) {
    const footnoteRowNum = currentRowNum + 1
    ws.mergeCells(footnoteRowNum, startCol, footnoteRowNum, endCol)
    const cell = ws.getCell(footnoteRowNum, startCol)
    cell.value = config.footnote
    cell.font = { name: 'Calibri', size: 8, bold: true, italic: true, color: { argb: COLOR_GRAY_TEXT } }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getRow(footnoteRowNum).height = 16
  }
}

/**
 * Menambahkan layer kompatibilitas SheetNames & Sheets agar kompatibel dengan pembaca SheetJS
 */
function wrapWorkbookCompatibility(wb: ExcelJS.Workbook): StyledWorkbook {
  const styled = wb as StyledWorkbook

  Object.defineProperty(styled, 'SheetNames', {
    get: () => styled.worksheets.map((w) => w.name),
    configurable: true,
  })

  Object.defineProperty(styled, 'Sheets', {
    get: () => {
      const map: Record<string, any> = {}
      styled.worksheets.forEach((w) => {
        const rows: any[][] = []
        w.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const rVals: any[] = []
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            rVals[colNumber - 1] = cell.value
          })
          rows[rowNumber - 1] = rVals
        })
        map[w.name] = XLSX.utils.aoa_to_sheet(rows)
      })
      return map
    },
    configurable: true,
  })

  return styled
}

/**
 * Memicu unduhan berkas Excel di browser
 */
async function triggerDownload(workbook: ExcelJS.Workbook, fullFilename: string): Promise<Uint8Array | undefined> {
  let buffer: Uint8Array | undefined

  try {
    const rawBuffer = await workbook.xlsx.writeBuffer()
    buffer = new Uint8Array(rawBuffer)
  } catch {
    // Fallback jika lingkungan tidak mendukung writeBuffer
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined' && buffer) {
    try {
      const blob = new Blob([buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fullFilename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // Abaikan jika dialog unduhan dibatasi lingkungan pengujian
    }
  }

  return buffer
}

/**
 * Mengekspor satu tabel data ke file Excel (.xlsx) sesuai template acuan
 */
export function exportTableToExcel<T = any>(options: ExportTableOptions<T>): ExportExcelResult {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SKOOLIA Kantin'
  wb.lastModifiedBy = 'SKOOLIA Kantin'
  wb.created = new Date()
  wb.modified = new Date()

  const sheetName = (options.sheetName || 'Laporan').substring(0, 31)
  const ws = wb.addWorksheet(sheetName)

  populateWorksheet(ws, {
    title: options.title,
    schoolName: options.schoolName,
    schoolAddress: options.schoolAddress,
    metadata: options.metadata,
    columns: options.columns,
    data: options.data,
    summaryRow: options.summaryRow,
    summaryRowColor: options.summaryRowColor,
    autoSummaryRow: options.autoSummaryRow,
    footnote: options.footnote,
  })

  const wrappedWb = wrapWorkbookCompatibility(wb)
  const finalFilename = sanitizeFilename(options.filename)
  const bufferPromise = triggerDownload(wb, finalFilename)

  return {
    workbook: wrappedWb,
    filename: finalFilename,
    bufferPromise,
  }
}

/**
 * Mengekspor beberapa sheet sekaligus ke dalam satu file Excel (.xlsx)
 */
export function exportMultiSheetExcel(options: MultiSheetExportOptions): ExportExcelResult {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SKOOLIA Kantin'
  wb.lastModifiedBy = 'SKOOLIA Kantin'
  wb.created = new Date()
  wb.modified = new Date()

  for (const sheet of options.sheets) {
    const sheetName = (sheet.sheetName || 'Sheet').substring(0, 31)
    const ws = wb.addWorksheet(sheetName)
    populateWorksheet(ws, {
      title: sheet.title,
      schoolName: sheet.schoolName,
      schoolAddress: sheet.schoolAddress,
      metadata: sheet.metadata,
      columns: sheet.columns,
      data: sheet.data,
      summaryRow: sheet.summaryRow,
      summaryRowColor: sheet.summaryRowColor,
      autoSummaryRow: sheet.autoSummaryRow,
      footnote: sheet.footnote,
    })
  }

  const wrappedWb = wrapWorkbookCompatibility(wb)
  const finalFilename = sanitizeFilename(options.filename)
  const bufferPromise = triggerDownload(wb, finalFilename)

  return {
    workbook: wrappedWb,
    filename: finalFilename,
    bufferPromise,
  }
}

/**
 * Mengekspor data mentah (Array of Arrays) ke Excel dengan header Navy dan zebra stripe
 */
export function exportRawDataToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): ExportExcelResult {
  const columns: ExcelColumn<Record<string, any>>[] = headers.map((h, i) => ({
    header: h,
    key: `col_${i}`,
  }))

  const data = rows.map((r) => {
    const item: Record<string, any> = {}
    r.forEach((val, i) => {
      item[`col_${i}`] = val
    })
    return item
  })

  return exportTableToExcel({
    filename,
    sheetName,
    columns,
    data,
  })
}
