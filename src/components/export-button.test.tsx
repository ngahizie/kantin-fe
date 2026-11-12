import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ExportButton } from './export-button'

describe('ExportButton', () => {
  it('menampilkan satu tombol Ekspor dan membuka dialog pilihan Excel dan PDF', async () => {
    const onExportExcel = vi.fn()
    const onExportPdf = vi.fn()

    const { getByRole, getByTestId, getByText } = await render(
      <ExportButton onExportExcel={onExportExcel} onExportPdf={onExportPdf} />
    )

    const trigger = getByRole('button', { name: /Ekspor/i })
    await expect.element(trigger).toBeInTheDocument()
    await expect.element(trigger).toBeEnabled()

    await userEvent.click(trigger)

    await expect
      .element(getByRole('heading', { name: 'Pilih Format Ekspor' }))
      .toBeInTheDocument()
    await expect.element(getByText('Spreadsheet Excel')).toBeInTheDocument()
    await expect.element(getByText('Dokumen PDF')).toBeInTheDocument()

    await userEvent.click(getByTestId('btn-export-excel-option'))
    expect(onExportExcel).toHaveBeenCalledOnce()
    expect(onExportPdf).not.toHaveBeenCalled()
    await expect
      .element(getByRole('heading', { name: 'Pilih Format Ekspor' }))
      .not.toBeInTheDocument()
  })

  it('menampilkan opsi Berkas CSV dan Dokumen PDF saat menggunakan onExportCsv dan onExportPdf', async () => {
    const onExportCsv = vi.fn()
    const onExportPdf = vi.fn()

    const { getByRole, getByTestId, getByText } = await render(
      <ExportButton onExportCsv={onExportCsv} onExportPdf={onExportPdf} />
    )

    await userEvent.click(getByRole('button', { name: /Ekspor/i }))

    await expect.element(getByText('Berkas CSV')).toBeInTheDocument()
    await expect.element(getByText('.csv')).toBeInTheDocument()
    await expect.element(getByText('Dokumen PDF')).toBeInTheDocument()
    await expect.element(getByText('.pdf')).toBeInTheDocument()

    await userEvent.click(getByTestId('btn-export-csv-option'))
    expect(onExportCsv).toHaveBeenCalledOnce()
    expect(onExportPdf).not.toHaveBeenCalled()

    await userEvent.click(getByRole('button', { name: /Ekspor/i }))
    await userEvent.click(getByTestId('btn-export-pdf-option'))
    expect(onExportPdf).toHaveBeenCalledOnce()
  })

  it('menonaktifkan tombol saat disabled, isLoading, atau tidak ada handler ekspor', async () => {
    const { getByTestId, rerender } = await render(
      <ExportButton
        onExportCsv={vi.fn()}
        onExportPdf={vi.fn()}
        disabled
        data-testid='btn-test-export'
      />
    )

    await expect.element(getByTestId('btn-test-export')).toBeDisabled()

    await rerender(
      <ExportButton
        onExportCsv={vi.fn()}
        onExportPdf={vi.fn()}
        isLoading
        data-testid='btn-test-export'
      />
    )
    await expect.element(getByTestId('btn-test-export')).toBeDisabled()

    await rerender(<ExportButton data-testid='btn-test-export' />)
    await expect.element(getByTestId('btn-test-export')).toBeDisabled()
  })

  it('menutup dialog saat tombol Batal diklik tanpa memanggil handler', async () => {
    const onExportCsv = vi.fn()
    const onExportPdf = vi.fn()

    const { getByRole } = await render(
      <ExportButton onExportCsv={onExportCsv} onExportPdf={onExportPdf} />
    )

    await userEvent.click(getByRole('button', { name: /Ekspor/i }))
    await userEvent.click(getByRole('button', { name: 'Batal' }))

    expect(onExportCsv).not.toHaveBeenCalled()
    expect(onExportPdf).not.toHaveBeenCalled()
    await expect
      .element(getByRole('heading', { name: 'Pilih Format Ekspor' }))
      .not.toBeInTheDocument()
  })
})
