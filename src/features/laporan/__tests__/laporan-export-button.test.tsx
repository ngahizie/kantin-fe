import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { LaporanExportButton } from '../components/LaporanExportButton'

describe('LaporanExportButton', () => {
  it('merender tombol tunggal Ekspor dan membuka popup pilihan format', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const { getByRole, getByText, unmount } = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    )

    // Tombol tunggal awal memakai varian default (solid primary)
    const exportBtn = getByRole('button', { name: /Ekspor/i })
    await expect.element(exportBtn).toBeInTheDocument()
    await expect.element(exportBtn).toHaveClass('bg-primary')

    // Dialog belum terbuka
    await expect.element(getByText('Pilih Format Ekspor')).not.toBeInTheDocument()

    // Klik tombol Ekspor
    await userEvent.click(exportBtn)

    // Menu muncul
    await expect.element(getByText('Pilih Format Ekspor')).toBeInTheDocument()
    await expect.element(getByText('Spreadsheet Excel')).toBeInTheDocument()
    await expect.element(getByText('Dokumen PDF')).toBeInTheDocument()

    // Menutup menu kembali
    await userEvent.keyboard('{Escape}')
    await expect.element(getByText('Pilih Format Ekspor')).not.toBeInTheDocument()
    await unmount()
  })

  it('memanggil onExportExcel saat opsi Excel dipilih', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const { getByRole, getByTestId, getByText, unmount } = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    )

    const trigger = getByRole('button', { name: /Ekspor/i })
    await expect.element(trigger).toBeInTheDocument()
    await userEvent.click(trigger)

    await expect.element(getByText('Spreadsheet Excel')).toBeInTheDocument()
    await userEvent.click(getByTestId('btn-export-excel-option'))

    expect(onExportExcel).toHaveBeenCalledOnce()
    expect(onExportPdf).not.toHaveBeenCalled()
    await unmount()
  })

  it('memanggil onExportPdf saat opsi PDF dipilih', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const { getByRole, getByTestId, getByText, unmount } = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    )

    const trigger = getByRole('button', { name: /Ekspor/i })
    await expect.element(trigger).toBeInTheDocument()
    await userEvent.click(trigger)

    await expect.element(getByText('Dokumen PDF')).toBeInTheDocument()
    await userEvent.click(getByTestId('btn-export-pdf-option'))

    expect(onExportPdf).toHaveBeenCalledOnce()
    expect(onExportExcel).not.toHaveBeenCalled()
    await unmount()
  })

  it('tidak dapat dibuka bila tombol dalam kondisi disabled', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const { getByRole, unmount } = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
        disabled
      />
    )

    const exportBtn = getByRole('button', { name: /Ekspor/i })
    await expect.element(exportBtn).toBeDisabled()
    await unmount()
  })

  it('menutup menu saat Escape ditekan tanpa mengeksekusi callback ekspor', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const { getByRole, getByText, unmount } = await render(
      <LaporanExportButton
        onExportExcel={onExportExcel}
        onExportPdf={onExportPdf}
      />
    )

    const trigger = getByRole('button', { name: /Ekspor/i })
    await expect.element(trigger).toBeInTheDocument()
    await userEvent.click(trigger)
    await expect.element(getByText('Pilih Format Ekspor')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(onExportExcel).not.toHaveBeenCalled()
    expect(onExportPdf).not.toHaveBeenCalled()
    await expect.element(getByText('Pilih Format Ekspor')).not.toBeInTheDocument()
    await unmount()
  })
})
