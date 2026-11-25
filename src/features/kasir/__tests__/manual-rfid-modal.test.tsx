import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ManualRfidModal } from '../components/manual-rfid-modal'

function ManualRfidHarness({
  onScan,
  onOpenChangeSpy,
}: {
  onScan: (uid: string) => void
  onOpenChangeSpy?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <ManualRfidModal
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChangeSpy?.(nextOpen)
        setOpen(nextOpen)
      }}
      onScan={onScan}
    />
  )
}

function waitMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('ManualRfidModal (#200)', () => {
  it('tidak auto-close atau auto-submit saat UID hex 9–16 karakter diketik pelan dengan jeda > 60ms', async () => {
    const onScan = vi.fn()
    const onOpenChangeSpy = vi.fn()

    const screen = await render(
      <ManualRfidHarness onScan={onScan} onOpenChangeSpy={onOpenChangeSpy} />
    )

    const input = screen.getByPlaceholder(/Tap kartu RFID atau masukkan UID/i)
    await expect.element(input).toBeInTheDocument()
    await waitMs(80)
    await userEvent.click(input)

    // Ketik UID hex bertahap dengan jeda > 60ms (menghindari batas burst 35ms & timer lama 60ms)
    const partialUid = '04A1B2C3D'
    for (const ch of partialUid) {
      await userEvent.keyboard(ch)
      await waitMs(85)
    }

    // Beri jeda tambahan setelah 9 karakter selesai diketik
    await waitMs(220)

    expect(onScan).not.toHaveBeenCalled()
    expect(onOpenChangeSpy).not.toHaveBeenCalled()
    await expect.element(screen.getByText('Bayar / Tap Kartu RFID')).toBeInTheDocument()

    // Lanjutkan mengetik hingga 16 karakter hex pelan-pelan — tetap belum boleh auto-submit
    for (const ch of '4E5F6A1') {
      await userEvent.keyboard(ch)
      await waitMs(85)
    }
    await waitMs(220)

    expect(onScan).not.toHaveBeenCalled()
    expect(onOpenChangeSpy).not.toHaveBeenCalled()
    await expect.element(input).toHaveValue('04A1B2C3D4E5F6A1')

    // Submit baru berjalan setelah klik tombol Proses Tap
    await userEvent.click(screen.getByRole('button', { name: /Proses Tap/i }))

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith('04A1B2C3D4E5F6A1')
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
    await expect.element(screen.getByText('Bayar / Tap Kartu RFID')).not.toBeInTheDocument()
  })

  it('mengirim UID lengkap saat menekan Enter atau mengklik Proses Tap', async () => {
    const onScan = vi.fn()
    const onOpenChangeSpy = vi.fn()

    const screen = await render(
      <ManualRfidHarness onScan={onScan} onOpenChangeSpy={onOpenChangeSpy} />
    )

    const input = screen.getByPlaceholder(/Tap kartu RFID atau masukkan UID/i)
    await userEvent.fill(input, '04a1b2c3d4')

    // Tunggu > 150ms memastikan fill tidak memicu auto-submit
    await waitMs(200)
    expect(onScan).not.toHaveBeenCalled()

    await userEvent.click(input)
    await userEvent.keyboard('{Enter}')

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith('04A1B2C3D4')
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
    await expect.element(screen.getByText('Bayar / Tap Kartu RFID')).not.toBeInTheDocument()
  })

  it('tetap memicu tap otomatis saat menerima burst UID dari reader RFID hardware', async () => {
    const onScan = vi.fn()
    const onOpenChangeSpy = vi.fn()

    const screen = await render(
      <ManualRfidHarness onScan={onScan} onOpenChangeSpy={onOpenChangeSpy} />
    )

    const inputEl = screen
      .getByPlaceholder(/Tap kartu RFID atau masukkan UID/i)
      .element() as HTMLInputElement
    inputEl.focus()

    // Simulasi burst keyboard-wedge USB RFID reader (< 35ms/karakter) diakhiri Enter
    for (const key of ['0', '4', 'a', '1', 'b', '2', 'c', '3', 'd', '4', 'Enter']) {
      inputEl.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      )
    }

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith('04A1B2C3D4')
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
    await expect.element(screen.getByText('Bayar / Tap Kartu RFID')).not.toBeInTheDocument()
  })
})
