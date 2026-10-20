import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { RefundOrangTuaModal } from './RefundOrangTuaModal'
import { MOCK_SISWA_NONAKTIF } from '@/mocks/mock-data'

describe('RefundOrangTuaModal', () => {
  it('dapat berganti dari Transfer Bank ke Tunai dan kembali lagi ke Transfer Bank tanpa kendala', async () => {
    const siswa = MOCK_SISWA_NONAKTIF[0] // Raditya Pratama
    const { getByText } = await render(
      <RefundOrangTuaModal
        open={true}
        onOpenChange={vi.fn()}
        siswa={siswa}
        onRefundSuccess={vi.fn()}
      />
    )

    // 1. Initial: modal terbuka dengan mode Transfer Bank terpilih
    const bankLabel = getByText(/Bank Tujuan \*/i)
    await expect.element(bankLabel).toBeInTheDocument()

    // 2. Klik pilihan Tunai (Kas TU)
    const tunaiCard = getByText(/Tunai \(Kas TU\)/i)
    await userEvent.click(tunaiCard)

    // Form detail transfer bank hilang
    await expect.element(bankLabel).not.toBeInTheDocument()

    // 3. Klik kembali pilihan Transfer Bank
    const transferBankCard = getByText(/Transfer Bank/i)
    await userEvent.click(transferBankCard)

    // Form detail transfer bank muncul kembali dengan responsif!
    const bankLabelAfter = getByText(/Bank Tujuan \*/i)
    await expect.element(bankLabelAfter).toBeInTheDocument()

    // 4. Klik Tunai sekali lagi
    await userEvent.click(tunaiCard)
    await expect.element(bankLabelAfter).not.toBeInTheDocument()

    // 5. Klik Transfer Bank sekali lagi
    await userEvent.click(transferBankCard)
    const bankLabelFinal = getByText(/Bank Tujuan \*/i)
    await expect.element(bankLabelFinal).toBeInTheDocument()
  })

  it('dapat memproses refund transfer bank saat persetujuan dicentang', async () => {
    const siswa = MOCK_SISWA_NONAKTIF[0] // Raditya Pratama
    const onRefundSuccess = vi.fn()
    const onOpenChange = vi.fn()

    const { getByRole } = await render(
      <RefundOrangTuaModal
        open={true}
        onOpenChange={onOpenChange}
        siswa={siswa}
        onRefundSuccess={onRefundSuccess}
      />
    )

    // Centang persetujuan
    const checkbox = getByRole('checkbox')
    await userEvent.click(checkbox)

    // Klik tombol submit
    const submitBtn = getByRole('button', { name: /Proses Refund/i })
    await userEvent.click(submitBtn)

    // Berhasil memanggil onRefundSuccess dan menutup modal secara async
    await expect.poll(() => onRefundSuccess.mock.calls.length).toBe(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
