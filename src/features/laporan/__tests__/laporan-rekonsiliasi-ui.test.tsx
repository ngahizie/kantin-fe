import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
import { exportTableToPdf } from '@/lib/pdfExport'
import { exportTableToExcel } from '@/lib/excelExport'
import { LaporanRekonsiliasiPage } from '../LaporanRekonsiliasiPage'

vi.mock('@/lib/pdfExport', () => ({
  exportTableToPdf: vi.fn(),
}))

vi.mock('@/lib/excelExport', () => ({
  exportTableToExcel: vi.fn(),
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div>Theme</div>,
}))

describe('LaporanRekonsiliasiPage UI - Penyesuaian Kolom Arah & Nilai Tetap', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  const mockRekonsiliasiData = {
    tanggal: '2026-11-16',
    saldoAwal: 5000000,
    topup: 2500000,
    topupOnline: 1500000,
    topupTunai: 1000000,
    penjualan: 3000000,
    refund: 200000,
    voidPenjualan: 100000,
    penjualanBersih: 2900000,
    koreksiMasuk: 50000,
    koreksiKeluar: 0,
    saldoSiswa: 4450000,
    saldoMengendap: 4450000,
    totalKreditSemua: 2550000,
    totalDebitSemua: 2900000,
    selisih: 0,
    seimbang: true,
    totalTopupSemua: 2500000,
    totalRefundSemua: 200000,
    topupBersih: 2300000,
    totalPenggunaan: 2900000,
  }

  it('menampilkan kolom Arah dengan nilai MASUK, KELUAR, TETAP dan tidak menampilkan kolom Kategori atau KREDIT/DEBIT di tabel', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        code: 200,
        status: 'SUCCESS',
        data: mockRekonsiliasiData,
      },
    })

    const screen = await render(<LaporanRekonsiliasiPage />)

    // Kolom "Arah" harus ada di header tabel
    await expect.element(screen.getByText('Arah', { exact: true })).toBeInTheDocument()

    // Kolom "Kategori" harus sudah dihilangkan
    await expect.element(screen.getByText('Kategori', { exact: true })).not.toBeInTheDocument()

    // Badge arah MASUK, KELUAR, dan TETAP harus tampil
    await expect.element(screen.getByText('TETAP').first()).toBeInTheDocument()
    await expect.element(screen.getByText('MASUK').first()).toBeInTheDocument()
    await expect.element(screen.getByText('KELUAR').first()).toBeInTheDocument()

    // Nilai KREDIT dan DEBIT lama tidak boleh tampil di tabel rincian
    await expect.element(screen.getByText('KREDIT', { exact: true })).not.toBeInTheDocument()
    await expect.element(screen.getByText('DEBIT', { exact: true })).not.toBeInTheDocument()
  })

  it('memastikan ekspor PDF dan Excel menyertakan kolom Arah tanpa kolom Kategori lama', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        code: 200,
        status: 'SUCCESS',
        data: mockRekonsiliasiData,
      },
    })

    const screen = await render(<LaporanRekonsiliasiPage />)

    // Tunggu data termuat
    await expect.element(screen.getByText('Top-up Online Siswa')).toBeInTheDocument()

    // Klik tombol Ekspor -> PDF
    await userEvent.click(screen.getByRole('button', { name: /Ekspor/i }))
    await userEvent.click(screen.getByTestId('btn-export-pdf-option'))

    expect(exportTableToPdf).toHaveBeenCalledTimes(1)
    const pdfArg = vi.mocked(exportTableToPdf).mock.calls[0][0]
    const pdfHeaders = pdfArg.columns.map((c) => c.header)
    expect(pdfHeaders).toContain('Arah')
    expect(pdfHeaders).not.toContain('Kategori')

    // Periksa salah satu baris memiliki nilai TETAP
    const pdfData = pdfArg.data as Array<{ pos?: string; arah?: string }>
    const tetapRowPdf = pdfData.find((r) => r.pos === 'Penjualan Bersih Kantin')
    expect(tetapRowPdf?.arah).toBe('TETAP')

    // Klik tombol Ekspor -> Excel
    await userEvent.click(screen.getByRole('button', { name: /Ekspor/i }))
    await userEvent.click(screen.getByTestId('btn-export-excel-option'))

    expect(exportTableToExcel).toHaveBeenCalledTimes(1)
    const excelArg = vi.mocked(exportTableToExcel).mock.calls[0][0]
    const excelHeaders = excelArg.columns.map((c) => c.header)
    expect(excelHeaders).toContain('Arah')
    expect(excelHeaders).not.toContain('Kategori')
    expect(excelHeaders).not.toContain('Arah Mutasi')

    const excelData = excelArg.data as Array<{ pos?: string; arah?: string }>
    const tetapRowExcel = excelData.find((r) => r.pos === 'Saldo Mengendap Siswa')
    expect(tetapRowExcel?.arah).toBe('TETAP')
  })
})
