import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { toast } from 'sonner'
import { kasirApi, type RekapSesiData, type SesiKasirData } from '../api/kasir-api'
import {
  KANTIN_CLOSE_SESSION_LOCKS_KEY,
  clearCloseSessionLock,
  getCloseSessionLock,
  saveCloseSessionLock,
} from '../close-session-lock'
import { CloseSessionModal } from '../components/CloseSessionModal'

const sampleSesi: SesiKasirData = {
  id: 41,
  titikKasirId: 1,
  titikKasirNama: 'Kasir Kantin Utama',
  tanggal: '2026-11-11',
  status: 'TERBUKA',
  totalBruto: 213000,
  totalVoid: 15000,
  totalBersih: 198000,
  totalTransaksi: 13,
  dibukaAt: '2026-11-11T07:00:00Z',
}

const sampleRekap: RekapSesiData = {
  sesiKasirId: 41,
  jumlahTransaksi: 13,
  jumlahVoid: 2,
  totalBruto: 213000,
  totalVoid: 15000,
  totalBersih: 198000,
}

describe('CloseSessionModal (Blind Count & Anti-Kecurangan Rekonsiliasi)', () => {
  beforeEach(() => {
    window.localStorage.removeItem(KANTIN_CLOSE_SESSION_LOCKS_KEY)
  })

  afterEach(() => {
    clearCloseSessionLock(sampleSesi.id)
    window.localStorage.removeItem(KANTIN_CLOSE_SESSION_LOCKS_KEY)
    vi.restoreAllMocks()
  })

  it('mengizinkan batal pada Langkah 1 sebelum lanjut ke rekapitulasi dan mereset input saat dibuka ulang', async () => {
    const onOpenChange = vi.fn()
    const screen = await render(
      <CloseSessionModal
        open={true}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )

    await expect
      .element(screen.getByText('Tutup Sesi Kasir Harian'))
      .toBeInTheDocument()
    await expect
      .element(
        screen.getByText(/dikunci dan tidak dapat diubah setelah lanjut ke rekapitulasi/i)
      )
      .toBeInTheDocument()

    const cashInput = screen.getByLabelText(/Total Uang Tunai di Laci Kasir/i)
    await userEvent.fill(cashInput, '100000')
    await expect.element(cashInput).toHaveValue('100.000')

    await userEvent.click(screen.getByRole('button', { name: 'Batal' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(getCloseSessionLock(sampleSesi)).toBeNull()

    await screen.rerender(
      <CloseSessionModal
        open={false}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )
    await screen.rerender(
      <CloseSessionModal
        open={true}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )

    await expect
      .element(screen.getByLabelText(/Total Uang Tunai di Laci Kasir/i))
      .toHaveValue('')
  })

  it('menghapus tombol Ubah dan Kembali serta mengunci nominal saat masuk Langkah 2 Rekapitulasi', async () => {
    const onOpenChange = vi.fn()
    const screen = await render(
      <CloseSessionModal
        open={true}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )

    const cashInput = screen.getByLabelText(/Total Uang Tunai di Laci Kasir/i)
    await userEvent.fill(cashInput, '100000')
    await userEvent.click(
      screen.getByRole('button', { name: /Lanjut ke Rekapitulasi/i })
    )

    await expect
      .element(screen.getByText('Rekonsiliasi & Tutup Sesi Kasir'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Transaksi Refund')).toBeInTheDocument()
    await expect.element(screen.getByText(/Transaksi Void/i)).not.toBeInTheDocument()
    await expect
      .element(
        screen.getByText(/\(Bruto Rp\s+213\.000 - Refund Rp\s+15\.000\)/)
      )
      .toBeInTheDocument()
    await expect.element(screen.getByText(/- Void Rp/i)).not.toBeInTheDocument()
    await expect.element(screen.getByText('Terkunci')).toBeInTheDocument()
    await expect.element(screen.getByText('Rp 100.000')).toBeInTheDocument()
    await expect.element(screen.getByText('Rp 198.000')).toBeInTheDocument()

    // Tidak boleh ada tombol kembali, tombol ubah, maupun banner peringatan konfirmasi
    await expect
      .element(screen.getByRole('button', { name: /Ubah/i }))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /Kembali/i }))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByText(/transaksi kasir akan dikunci dan dibukukan ke laporan/i))
      .not.toBeInTheDocument()

    // Fokus berpindah ke textarea catatan di Langkah 2
    const catatanInput = screen.getByLabelText(/Catatan \/ Keterangan Selisih/i)
    expect(document.activeElement).toBe(catatanInput.element())

    // Klik di luar dialog pada Langkah 2 tidak menutup dialog
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    await expect
      .element(screen.getByText('Rekonsiliasi & Tutup Sesi Kasir'))
      .toBeInTheDocument()

    // Lock tersimpan untuk sesi aktif
    const lock = getCloseSessionLock(sampleSesi)
    expect(lock?.cashValue).toBe(100000)
  })

  it('mempertahankan Langkah 2 dan nominal terkunci meskipun dialog ditutup atau dimuat ulang sebelum sesi ditutup', async () => {
    const onOpenChange = vi.fn()
    const screen = await render(
      <CloseSessionModal
        open={true}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )

    await userEvent.fill(
      screen.getByLabelText(/Total Uang Tunai di Laci Kasir/i),
      '100000'
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Lanjut ke Rekapitulasi/i })
    )

    await userEvent.fill(
      screen.getByLabelText(/Catatan \/ Keterangan Selisih/i),
      'Kembalian receh kurang'
    )

    // Tutup modal via tombol Close X -> tidak mereset ke Langkah 1
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    await screen.rerender(
      <CloseSessionModal
        open={false}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )
    await screen.rerender(
      <CloseSessionModal
        open={true}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )

    await expect
      .element(screen.getByText('Rekonsiliasi & Tutup Sesi Kasir'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Rp 100.000')).toBeInTheDocument()
    await expect
      .element(screen.getByLabelText(/Catatan \/ Keterangan Selisih/i))
      .toHaveValue('Kembalian receh kurang')

    // Simulasi reload halaman penuh (unmount + render instance baru untuk sesi yang sama)
    await screen.unmount()
    const reloaded = await render(
      <CloseSessionModal
        open={true}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )

    await expect
      .element(reloaded.getByText('Rekonsiliasi & Tutup Sesi Kasir'))
      .toBeInTheDocument()
    await expect.element(reloaded.getByText('Rp 100.000')).toBeInTheDocument()
    await expect
      .element(reloaded.getByRole('button', { name: /Ubah/i }))
      .not.toBeInTheDocument()
    await expect
      .element(reloaded.getByRole('button', { name: /Kembali/i }))
      .not.toBeInTheDocument()
  })

  it('menjaga penguncian Langkah 2 pada komponen bahkan ketika data sesi belum terpasang (sesi null)', async () => {
    const screen = await render(
      <CloseSessionModal
        open={true}
        onOpenChange={vi.fn()}
        sesi={null}
        rekap={sampleRekap}
      />
    )

    await userEvent.fill(
      screen.getByLabelText(/Total Uang Tunai di Laci Kasir/i),
      '75000'
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Lanjut ke Rekapitulasi/i })
    )

    await screen.rerender(
      <CloseSessionModal
        open={false}
        onOpenChange={vi.fn()}
        sesi={null}
        rekap={sampleRekap}
      />
    )
    await screen.rerender(
      <CloseSessionModal
        open={true}
        onOpenChange={vi.fn()}
        sesi={null}
        rekap={sampleRekap}
      />
    )

    await expect
      .element(screen.getByText('Rekonsiliasi & Tutup Sesi Kasir'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Rp 75.000')).toBeInTheDocument()
  })

  it('menolak perubahan nominal jika sesi sudah dikunci di tab lain sebelum submit Langkah 1', async () => {
    const infoSpy = vi.spyOn(toast, 'info').mockImplementation(() => 'info-1')
    const screen = await render(
      <CloseSessionModal
        open={true}
        onOpenChange={vi.fn()}
        sesi={sampleSesi}
        rekap={sampleRekap}
      />
    )

    // Simulasi tab lain lebih dulu lanjut ke rekapitulasi dengan nominal 100.000
    saveCloseSessionLock(sampleSesi, 100000)

    // Di tab ini kasir mencoba menginput 198.000 agar pas
    await userEvent.fill(
      screen.getByLabelText(/Total Uang Tunai di Laci Kasir/i),
      '198000'
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Lanjut ke Rekapitulasi/i })
    )

    expect(infoSpy).toHaveBeenCalled()
    await expect.element(screen.getByText('Rp 100.000')).toBeInTheDocument()
    await expect
      .element(screen.getByText(/Kekurangan Kas:\s*-Rp\s+98\.000/))
      .toBeInTheDocument()
  })

  it('mengirim nominal terkunci dan menghapus lock saat Konfirmasi & Tutup Kasir berhasil (termasuk nominal 0)', async () => {
    const tutupSpy = vi.spyOn(kasirApi, 'tutupSesi').mockResolvedValue({
      ...sampleSesi,
      status: 'DITUTUP',
      uangFisik: 0,
      selisih: -198000,
    })
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()

    const screen = await render(
      <CloseSessionModal
        open={true}
        onOpenChange={onOpenChange}
        sesi={sampleSesi}
        rekap={sampleRekap}
        onSuccess={onSuccess}
      />
    )

    await userEvent.fill(
      screen.getByLabelText(/Total Uang Tunai di Laci Kasir/i),
      '0'
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Lanjut ke Rekapitulasi/i })
    )

    expect(getCloseSessionLock(sampleSesi)?.cashValue).toBe(0)

    const confirmBtn = screen.getByRole('button', {
      name: /Konfirmasi & Tutup Kasir/i,
    })
    await expect.element(confirmBtn).toBeDisabled()

    await userEvent.fill(
      screen.getByLabelText(/Catatan \/ Keterangan Selisih/i),
      'Semua pembayaran non-tunai hari ini'
    )
    await expect.element(confirmBtn).toBeEnabled()
    await userEvent.click(confirmBtn)

    expect(tutupSpy).toHaveBeenCalledWith(41, {
      uangFisik: 0,
      selisih: -198000,
      catatan: 'Semua pembayaran non-tunai hari ini',
    })
    expect(getCloseSessionLock(sampleSesi)).toBeNull()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSuccess).toHaveBeenCalledTimes(1)

    // Sesi berikutnya dibuka bersih di Langkah 1
    await screen.rerender(
      <CloseSessionModal
        open={true}
        onOpenChange={onOpenChange}
        sesi={{ ...sampleSesi, id: 42, tanggal: '2026-11-12' }}
        rekap={{ ...sampleRekap, sesiKasirId: 42 }}
      />
    )

    await expect
      .element(screen.getByText('Tutup Sesi Kasir Harian'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByLabelText(/Total Uang Tunai di Laci Kasir/i))
      .toHaveValue('')
  })
})
