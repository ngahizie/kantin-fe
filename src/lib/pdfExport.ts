/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility Ekspor Data ke Format Dokumen PDF (.pdf)
 * Modul Laporan SKOOLIA Kantin Cashless
 *
 * Menggunakan library 'jspdf' dan 'jspdf-autotable' untuk menghasilkan
 * dokumen laporan resmi berformat A4 dengan kop sekolah/kantin, tabel rapi,
 * auto-alignment (angka di kanan, kode di tengah), dan penomoran halaman otomatis.
 */

import { jsPDF } from 'jspdf'
import autoTable, { type UserOptions } from 'jspdf-autotable'

export interface PdfColumn<T = any> {
  header: string
  key?: keyof T | string
  formatter?: (val: unknown, row: T) => string | number | boolean | null | undefined
  align?: 'left' | 'center' | 'right'
}

export interface PdfTableSection<T = any> {
  sectionTitle?: string
  columns: PdfColumn<T>[]
  data: T[]
}

export interface ExportTablePdfOptions<T = any> {
  filename: string
  title?: string
  subtitle?: string
  metadata?: Record<string, string | number | undefined | null>
  columns: PdfColumn<T>[]
  data: T[]
  orientation?: 'portrait' | 'landscape'
}

export interface MultiSectionPdfExportOptions {
  filename: string
  title?: string
  subtitle?: string
  metadata?: Record<string, string | number | undefined | null>
  sections: PdfTableSection<any>[]
  orientation?: 'portrait' | 'landscape'
}

/**
 * Membersihkan nama file dari karakter ilegal dan memastikan ekstensi .pdf
 */
export function sanitizePdfFilename(filename: string): string {
  const clean = filename.replace(/[\\/:*?"<>|]/g, '_').trim()
  return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`
}

/**
 * Mendeteksi perataan teks kolom berdasarkan nama atau kunci kolom
 */
function resolveColumnAlignment<T>(col: PdfColumn<T>): 'left' | 'center' | 'right' {
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
    str.includes('bruto') ||
    str.includes('void') ||
    str.includes('selisih') ||
    str.includes('fisik') ||
    str.includes('sistem')
  ) {
    return 'right'
  }

  if (
    str === 'no' ||
    str === 'id' ||
    str.includes('kode') ||
    str.includes('status') ||
    str.includes('tipe') ||
    str.includes('waktu') ||
    str.includes('tanggal') ||
    str.includes('kelas')
  ) {
    return 'center'
  }

  return 'left'
}

/**
 * Menggambar Kop Resmi Kantin Skoolia dan Informasi Metadata
 */
function drawHeaderAndMetadata(
  doc: jsPDF,
  title?: string,
  subtitle?: string,
  metadata?: Record<string, string | number | undefined | null>
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 14

  // Brand Name / Kop Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(22, 101, 52) // Emerald-800
  doc.text('KANTIN CASHLESS SKOOLIA', 14, y)
  y += 6

  // Subtitle Aplikasi
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text('Sistem Transaksi & Akuntansi Kantin Sekolah Digital', 14, y)
  y += 6

  // Judul Laporan
  if (title) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59) // Slate-800
    doc.text(title.toUpperCase(), 14, y)
    y += 5
  }

  // Subtitle Tambahan
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105) // Slate-600
    doc.text(subtitle, 14, y)
    y += 5
  }

  // Garis Pemisah Kop (Separator line)
  doc.setDrawColor(203, 213, 225) // Slate-300
  doc.setLineWidth(0.4)
  doc.line(14, y, pageWidth - 14, y)
  y += 5

  // Metadata / Parameter Laporan
  if (metadata && Object.keys(metadata).length > 0) {
    const entries = Object.entries(metadata).filter(
      ([, val]) => val !== undefined && val !== null && val !== ''
    )

    if (entries.length > 0) {
      doc.setFontSize(8)
      const col1X = 14
      const col2X = pageWidth / 2 + 5
      const isTwoColumn = entries.length > 2 && pageWidth > 180

      let currentMetaY = y
      entries.forEach(([key, value], idx) => {
        const useCol2 = isTwoColumn && idx >= Math.ceil(entries.length / 2)
        const posX = useCol2 ? col2X : col1X
        const posY = useCol2
          ? y + (idx - Math.ceil(entries.length / 2)) * 4.5
          : currentMetaY

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        const label = `${key}: `
        doc.text(label, posX, posY)

        const labelWidth = doc.getTextWidth(label)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(15, 23, 42)
        doc.text(String(value), posX + labelWidth, posY)

        if (!useCol2) {
          currentMetaY += 4.5
        }
      })

      const totalRows = isTwoColumn
        ? Math.ceil(entries.length / 2)
        : entries.length
      y += totalRows * 4.5 + 4
    }
  }

  return y
}

/**
 * Menambahkan Footer Halaman pada Seluruh Halaman Dokumen
 */
function attachFooters(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Garis Atas Footer
    doc.setDrawColor(226, 232, 240) // Slate-200
    doc.setLineWidth(0.3)
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11)

    // Teks Footer Kiri
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184) // Slate-400
    doc.text(
      'Dokumen ini dicetak otomatis oleh Sistem Kantin Cashless SKOOLIA',
      14,
      pageHeight - 6.5
    )

    // Penomoran Halaman Kanan
    const pageStr = `Halaman ${i} dari ${totalPages}`
    const pageStrWidth = doc.getTextWidth(pageStr)
    doc.text(pageStr, pageWidth - 14 - pageStrWidth, pageHeight - 6.5)
  }
}

/**
 * Mengonversi baris data objek ke baris string untuk autoTable
 */
function formatTableRows<T>(columns: PdfColumn<T>[], data: T[]): string[][] {
  return data.map((item) => {
    return columns.map((col) => {
      let val: unknown = undefined
      if (col.key) {
        val = (item as Record<string, unknown>)[col.key as string]
      }
      if (col.formatter) {
        val = col.formatter(val, item)
      }
      if (val === undefined || val === null) {
        return '-'
      }
      return String(val)
    })
  })
}

/**
 * Memicu pengunduhan file PDF di browser dan mengembalikan instance doc & buffer
 */
function finalizePdfDownload(doc: jsPDF, filename: string) {
  const cleanFilename = sanitizePdfFilename(filename)
  let buffer: ArrayBuffer | undefined

  try {
    buffer = doc.output('arraybuffer')
  } catch {
    // fallback jika environment tidak mendukung
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      doc.save(cleanFilename)
    } catch {
      // Menangani lingkungan mock atau test browser
    }
  }

  return {
    doc,
    filename: cleanFilename,
    buffer,
  }
}

/**
 * Mengekspor satu tabel data ke dokumen PDF (.pdf)
 */
export function exportTableToPdf<T = any>(options: ExportTablePdfOptions<T>) {
  // Jika orientasi tidak diset eksplisit, pilih landscape otomatis jika kolom > 6
  const orientation =
    options.orientation || (options.columns.length > 6 ? 'landscape' : 'portrait')

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  // Kop dan Metadata
  const startY = drawHeaderAndMetadata(
    doc,
    options.title,
    options.subtitle,
    options.metadata
  )

  // Styling Perataan Kolom
  const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {}
  options.columns.forEach((col, idx) => {
    columnStyles[idx] = { halign: resolveColumnAlignment(col) }
  })

  const headers = [options.columns.map((c) => c.header)]
  const rows = formatTableRows(options.columns, options.data)

  const autoTableConfig: UserOptions = {
    startY: startY + 2,
    head: headers,
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    columnStyles,
    margin: { left: 14, right: 14, bottom: 18 },
  }

  autoTable(doc, autoTableConfig)

  // Tambahkan Footer Halaman
  attachFooters(doc)

  return finalizePdfDownload(doc, options.filename)
}

/**
 * Mengekspor beberapa bagian / tabel sekaligus ke dalam satu dokumen PDF (.pdf)
 */
export function exportMultiSectionPdf(options: MultiSectionPdfExportOptions) {
  // Cek apakah ada tabel dengan kolom > 6 untuk default orientasi
  const maxCols = Math.max(0, ...options.sections.map((s) => s.columns.length))
  const orientation =
    options.orientation || (maxCols > 6 ? 'landscape' : 'portrait')

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  // Kop dan Metadata Utama
  let currentY = drawHeaderAndMetadata(
    doc,
    options.title,
    options.subtitle,
    options.metadata
  )

  const pageHeight = doc.internal.pageSize.getHeight()

  // Gambar Setiap Section Tabel
  options.sections.forEach((section, sIdx) => {
    // Jika sisa halaman terlalu sedikit (< 40mm), buat halaman baru
    if (sIdx > 0 && currentY > pageHeight - 40) {
      doc.addPage()
      currentY = 16
    }

    // Judul Bagian / Section Title
    if (section.sectionTitle) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(30, 41, 59)
      doc.text(section.sectionTitle, 14, currentY + 4)
      currentY += 7
    }

    const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {}
    section.columns.forEach((col, idx) => {
      columnStyles[idx] = { halign: resolveColumnAlignment(col) }
    })

    const headers = [section.columns.map((c) => c.header)]
    const rows = formatTableRows(section.columns, section.data)

    const autoTableConfig: UserOptions = {
      startY: currentY,
      head: headers,
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles,
      margin: { left: 14, right: 14, bottom: 18 },
    }

    autoTable(doc, autoTableConfig)

    // Dapatkan posisi akhir tabel
    const lastTable = (doc as any).lastAutoTable
    if (lastTable && lastTable.finalY) {
      currentY = lastTable.finalY + 8
    } else {
      currentY += 20
    }
  })

  // Tambahkan Footer Halaman
  attachFooters(doc)

  return finalizePdfDownload(doc, options.filename)
}
