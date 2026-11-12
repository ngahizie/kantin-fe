import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { LaporanExportButton } from '../components/LaporanExportButton'

describe('LaporanExportButton', () => {
  it('merender tombol tunggal Ekspor dan membuka popup pilihan format', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const screen = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    )

    // Tombol tunggal awal memakai varian default (solid primary)
    const exportBtn = screen.getByRole('button', { name: /Ekspor/i })
    await expect.element(exportBtn).toBeInTheDocument()
    await expect.element(exportBtn).toHaveClass('bg-primary')

    // Dialog belum terbuka
    await expect.element(screen.getByText('Pilih Format Ekspor')).not.toBeInTheDocument()

    // Klik tombol Ekspor
    await userEvent.click(exportBtn)

    // Dialog muncul
    await expect.element(screen.getByText('Pilih Format Ekspor')).toBeInTheDocument()
    await expect.element(screen.getByText('Spreadsheet Excel')).toBeInTheDocument()
    await expect.element(screen.getByText('Dokumen PDF')).toBeInTheDocument()
    await expect.element(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument()
  })

  it('memanggil onExportExcel saat opsi Excel dipilih', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const screen = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /Ekspor/i }))
    await userEvent.click(screen.getByTestId('btn-export-excel-option'))

    expect(onExportExcel).toHaveBeenCalledOnce()
    expect(onExportPdf).not.toHaveBeenCalled()
  })

  it('memanggil onExportPdf saat opsi PDF dipilih', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const screen = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /Ekspor/i }))
    await userEvent.click(screen.getByTestId('btn-export-pdf-option'))

    expect(onExportPdf).toHaveBeenCalledOnce()
    expect(onExportExcel).not.toHaveBeenCalled()
  })

  it('tidak dapat dibuka bila tombol dalam kondisi disabled', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const screen = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
        disabled
      />
    )

    const exportBtn = screen.getByRole('button', { name: /Ekspor/i })
    await expect.element(exportBtn).toBeDisabled()
  })

  it('menutup dialog saat tombol Batal diklik tanpa mengeksekusi callback ekspor', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const screen = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /Ekspor/i }))
    await expect.element(screen.getByText('Pilih Format Ekspor')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(onExportExcel).not.toHaveBeenCalled()
    expect(onExportPdf).not.toHaveBeenCalled()
  })
})
