import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import { pengaturanApi } from '@/features/pengaturan/api/pengaturan-api'
import { DEFAULT_PENGATURAN_KANTIN } from '@/features/pengaturan/types'
import { beepAudioEngine } from '@/hooks/useBeepAudio'
import { KasirPosPage } from '../KasirPosPage'
import { kasirApi } from '../api/kasir-api'
import { RefundDialog } from '../components/RefundDialog'
import type { TransaksiSesiItem } from '../types'

const sampleTransactions: TransaksiSesiItem[] = [
  {
    id: 201,
    transaksiId: 201,
    nomorReferensi: 'TRX-20261110-201',
    waktu: '2026-11-10T08:30:00Z',
    pembeliNama: 'Bima Aditya Pratama',
    pembeliKelas: 'XII RPL 1',
    pembeliNis: '2026001',
    items: [
      {
        menuId: 1,
        namaMenu: 'Nasi Goreng Ayam',
        qty: 1,
        hargaSatuan: 15000,
        subtotal: 15000,
      },
    ],
    total: 15000,
    status: 'SUKSES',
  },
  {
    id: 202,
    transaksiId: 202,
    nomorReferensi: 'TRX-20261110-202',
    waktu: '2026-11-10T09:05:00Z',
    pembeliNama: 'Dewi Lestari',
    items: [
      {
        menuId: 2,
        namaMenu: 'Air Mineral',
        qty: 2,
        hargaSatuan: 4000,
        subtotal: 8000,
      },
    ],
    total: 8000,
    status: 'SUKSES',
  },
]

describe('RefundDialog (BE #292)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tidak merender dialog saat transaction bernilai null', async () => {
    const screen = await render(
      <RefundDialog
        open={true}
        onOpenChange={vi.fn()}
        transaction={null}
      />
    )

    await expect
      .element(screen.getByText('Refund Transaksi Kasir'))
      .not.toBeInTheDocument()
  })

  it('menampilkan ringkasan transaksi terpilih tanpa mengisi otomatis kodeStruk dan memvalidasi setelah interaksi beserta manajemen fokus', async () => {
    const refundSpy = vi
      .spyOn(kasirApi, 'refundTransaksi')
      .mockResolvedValue(undefined)

    const screen = await render(
      <RefundDialog
        open={true}
        onOpenChange={vi.fn()}
        transaction={sampleTransactions[0]}
      />
    )

    await expect
      .element(screen.getByText('Refund Transaksi Kasir'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Bima Aditya Pratama'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('1x Nasi Goreng Ayam'))
      .toBeInTheDocument()

    // nomorReferensi transaksi dan banner peringatan Perhatian tidak ditampilkan di dialog
    await expect
      .element(screen.getByText('TRX-20261110-201'))
      .not.toBeInTheDocument()
    await expect
      .element(
        screen.getByText(/Proses refund akan mengembalikan saldo/i)
      )
      .not.toBeInTheDocument()

    const kodeInput = screen.getByLabelText(/Kode Struk/i)
    await expect.element(kodeInput).toHaveValue('')
    await expect.element(kodeInput).toHaveAttribute('aria-invalid', 'false')
    const initialDescribedBy = kodeInput.element().getAttribute('aria-describedby')
    expect(initialDescribedBy?.split(/\s+/).filter(Boolean)).toHaveLength(1)

    // Submit kosong: tombol submit tetap aktif, lalu error tampil & fokus pindah ke Kode Struk
    const submitBtn = screen.getByRole('button', { name: /Konfirmasi Refund/i })
    await userEvent.click(submitBtn)

    expect(refundSpy).not.toHaveBeenCalled()
    await expect.element(kodeInput).toHaveAttribute('aria-invalid', 'true')
    await expect
      .element(screen.getByText(/Kode struk wajib diisi/i))
      .toBeInTheDocument()
    const invalidDescribedBy = kodeInput.element().getAttribute('aria-describedby')
    expect(invalidDescribedBy?.split(/\s+/).filter(Boolean)).toHaveLength(2)
    expect(document.activeElement).toBe(kodeInput.element())

    // Saat user memperbaiki input, error langsung dibersihkan dan aria-describedby kembali ke hint saja
    await userEvent.fill(kodeInput, 'TRX-20261110-201')
    await expect.element(kodeInput).toHaveAttribute('aria-invalid', 'false')
    await expect
      .element(screen.getByText(/Kode struk wajib diisi/i))
      .not.toBeInTheDocument()
    expect(kodeInput.element().getAttribute('aria-describedby')).toBe(
      initialDescribedBy
    )
  })

  it('memvalidasi alasan detail minimal 3 karakter saat opsi Lainnya dipilih', async () => {
    const refundSpy = vi
      .spyOn(kasirApi, 'refundTransaksi')
      .mockResolvedValue(undefined)

    const screen = await render(
      <RefundDialog
        open={true}
        onOpenChange={vi.fn()}
        transaction={sampleTransactions[0]}
      />
    )

    const kodeInput = screen.getByLabelText(/Kode Struk/i)
    await userEvent.fill(kodeInput, 'TRX-20261110-201')

    await userEvent.click(screen.getByRole('radio', { name: 'Lainnya' }))
    const detailTextarea = screen.getByLabelText(/Detail Alasan Refund/i)
    await expect.element(detailTextarea).toHaveAttribute('aria-invalid', 'false')

    await userEvent.fill(detailTextarea, 'ab')
    await userEvent.click(
      screen.getByRole('button', { name: /Konfirmasi Refund/i })
    )

    expect(refundSpy).not.toHaveBeenCalled()
    await expect.element(detailTextarea).toHaveAttribute('aria-invalid', 'true')
    await expect
      .element(screen.getByText(/minimal 3 karakter/i).first())
      .toBeInTheDocument()
    expect(document.activeElement).toBe(detailTextarea.element())
  })

  it('mempertahankan dialog terbuka dan menampilkan error bersih tanpa tag PRD serta tanpa banner di bawah alasan refund saat kode struk ditolak BE #292', async () => {
    vi.spyOn(beepAudioEngine, 'playError').mockImplementation(() => {})
    const toastErrorSpy = vi
      .spyOn(toast, 'error')
      .mockImplementation(() => 'toast-err-1')
    const refundSpy = vi
      .spyOn(kasirApi, 'refundTransaksi')
      .mockRejectedValue({
        response: {
          status: 400,
          data: {
            message: 'Kode struk tidak cocok dengan transaksi ini (PRD §6.3)',
          },
        },
      })

    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()

    const screen = await render(
      <RefundDialog
        open={true}
        onOpenChange={onOpenChange}
        transaction={sampleTransactions[0]}
        onSuccess={onSuccess}
      />
    )

    const kodeInput = screen.getByLabelText(/Kode Struk/i)
    await userEvent.fill(kodeInput, 'TRX-SALAH-999')
    await userEvent.click(
      screen.getByRole('button', { name: /Konfirmasi Refund/i })
    )

    expect(refundSpy).toHaveBeenCalledWith(
      201,
      'Salah input menu',
      'TRX-SALAH-999'
    )
    expect(toastErrorSpy).toHaveBeenCalledWith('Gagal Memproses Refund', {
      description: 'Kode struk tidak cocok dengan transaksi ini',
    })
    await expect.element(kodeInput).toHaveAttribute('aria-invalid', 'true')
    await expect
      .element(screen.getByText('Kode struk tidak cocok dengan transaksi ini'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(/\(PRD/i))
      .not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('tidak merender banner error di bawah daftar alasan refund dan menghapus teks PRD dalam kurung untuk error server lain', async () => {
    vi.spyOn(beepAudioEngine, 'playError').mockImplementation(() => {})
    const toastErrorSpy = vi
      .spyOn(toast, 'error')
      .mockImplementation(() => 'toast-err-2')
    vi.spyOn(kasirApi, 'refundTransaksi').mockRejectedValue({
      response: {
        status: 400,
        data: {
          message:
            'Sesi kasir sudah ditutup — koreksi hanya oleh bendahara (PRD §6.3)',
        },
      },
    })

    const screen = await render(
      <RefundDialog
        open={true}
        onOpenChange={vi.fn()}
        transaction={sampleTransactions[0]}
      />
    )

    const kodeInput = screen.getByLabelText(/Kode Struk/i)
    await userEvent.fill(kodeInput, 'TRX-20261110-201')
    await userEvent.click(
      screen.getByRole('button', { name: /Konfirmasi Refund/i })
    )

    expect(toastErrorSpy).toHaveBeenCalledWith('Gagal Memproses Refund', {
      description: 'Sesi kasir sudah ditutup — koreksi hanya oleh bendahara',
    })
    await expect
      .element(screen.getByText(/\(PRD/i))
      .not.toBeInTheDocument()

    // Tidak ada banner alert error terlihat di bawah fieldset alasan refund
    const form = document.querySelector(
      'form[aria-label="Formulir refund transaksi kasir"]'
    )
    const fieldset = form?.querySelector('fieldset')
    const afterFieldsetSibling = fieldset?.nextElementSibling
    expect(afterFieldsetSibling?.getAttribute('data-slot')).toBe(
      'dialog-footer'
    )
  })

  it('mengirim transaksiId, alasan, dan kodeStruk yang dipangkas lalu memanggil onSuccess saat sukses', async () => {
    vi.spyOn(beepAudioEngine, 'playVoid').mockImplementation(() => {})
    const refundSpy = vi
      .spyOn(kasirApi, 'refundTransaksi')
      .mockResolvedValue(undefined)

    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()

    const screen = await render(
      <RefundDialog
        open={true}
        onOpenChange={onOpenChange}
        transaction={sampleTransactions[1]}
        onSuccess={onSuccess}
      />
    )

    await expect
      .element(screen.getByText('Dewi Lestari'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Siswa')).toBeInTheDocument()

    const kodeInput = screen.getByLabelText(/Kode Struk/i)
    await userEvent.fill(kodeInput, '  TRX-20261110-202  ')
    await userEvent.click(
      screen.getByRole('radio', { name: 'Pembeli membatalkan' })
    )

    await userEvent.click(
      screen.getByRole('button', { name: /Konfirmasi Refund/i })
    )

    expect(refundSpy).toHaveBeenCalledWith(
      202,
      'Pembeli membatalkan',
      'TRX-20261110-202'
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('mempertahankan isi formulir selama animasi tutup dan mereset input saat dibuka ulang untuk transaksi yang sama', async () => {
    const screen = await render(
      <RefundDialog
        open={true}
        onOpenChange={vi.fn()}
        transaction={sampleTransactions[0]}
      />
    )

    const kodeInput = screen.getByLabelText(/Kode Struk/i)
    await userEvent.fill(kodeInput, 'TRX-TEMP-123')
    await userEvent.click(
      screen.getByRole('radio', { name: 'Pembeli membatalkan' })
    )

    // Saat open berubah false, isi form tidak langsung dicopot mendahului header dialog
    await screen.rerender(
      <RefundDialog
        open={false}
        onOpenChange={vi.fn()}
        transaction={sampleTransactions[0]}
      />
    )
    const headerStillMounted = Boolean(
      document.querySelector('[data-slot="dialog-header"]')
    )
    const formStillMounted = Boolean(
      document.querySelector('form[aria-label="Formulir refund transaksi kasir"]')
    )
    if (headerStillMounted) {
      expect(formStillMounted).toBe(true)
    }

    // Tunggu sampai portal dialog selesai animasi tutup, lalu buka kembali
    await expect
      .element(screen.getByText('Refund Transaksi Kasir'))
      .not.toBeInTheDocument()

    await screen.rerender(
      <RefundDialog
        open={true}
        onOpenChange={vi.fn()}
        transaction={sampleTransactions[0]}
      />
    )

    await expect.element(screen.getByLabelText(/Kode Struk/i)).toHaveValue('')
    await expect
      .element(screen.getByRole('radio', { name: 'Salah input menu' }))
      .toBeChecked()
  })
})

describe('Integrasi alur Refund melalui Riwayat Sesi di KasirPosPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tidak menampilkan tombol Refund terpisah di top bar dan membuka dialog Refund dari Riwayat Sesi', async () => {
    vi.spyOn(beepAudioEngine, 'playVoid').mockImplementation(() => {})
    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([])
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([])
    vi.spyOn(pengaturanApi, 'getPengaturan').mockResolvedValue({
      ...DEFAULT_PENGATURAN_KANTIN,
      updatedAt: '2026-11-10T07:00:00Z',
      updatedBy: 'Sistem',
    })
    vi.spyOn(pengaturanApi, 'getTitikKasirList').mockResolvedValue([])
    vi.spyOn(kasirApi, 'getSesiAktif').mockResolvedValue({
      id: 1,
      titikKasirId: 1,
      titikKasirNama: 'Kasir 1',
      tanggal: '2026-11-10',
      status: 'TERBUKA',
      totalBruto: 23000,
      totalVoid: 0,
      totalBersih: 23000,
      dibukaAt: '2026-11-10T07:00:00Z',
    })
    vi.spyOn(kasirApi, 'getRekapSesi').mockResolvedValue({
      sesiKasirId: 1,
      jumlahTransaksi: 2,
      jumlahVoid: 0,
      totalBruto: 23000,
      totalVoid: 0,
      totalBersih: 23000,
    })
    vi.spyOn(kasirApi, 'getRiwayatTransaksiSesi').mockResolvedValue(
      sampleTransactions
    )
    const refundSpy = vi
      .spyOn(kasirApi, 'refundTransaksi')
      .mockResolvedValue(undefined)

    const screen = await render(<KasirPosPage />)

    // Tombol Refund mandiri di top bar sudah dihapus
    await expect
      .element(screen.getByRole('button', { name: 'Refund' }))
      .not.toBeInTheDocument()

    // Buka Riwayat Sesi -> klik tombol Refund Transaksi pada transaksi kedua
    const historyBtn = screen.getByRole('button', { name: /Riwayat Sesi/i })
    await expect.element(historyBtn).toBeInTheDocument()
    await userEvent.click(historyBtn)

    await expect
      .element(screen.getByText('Riwayat Transaksi Sesi Kasir'))
      .toBeInTheDocument()

    const refundButtons = screen.getByRole('button', {
      name: /Refund Transaksi/i,
    })
    await expect.element(refundButtons.nth(1)).toBeInTheDocument()
    await userEvent.click(refundButtons.nth(1))

    await expect
      .element(screen.getByText('Refund Transaksi Kasir'))
      .toBeInTheDocument()

    const kodeInput = screen.getByLabelText(/Kode Struk/i)
    await expect.element(kodeInput).toHaveValue('')

    await userEvent.fill(kodeInput, 'TRX-20261110-202')
    await userEvent.click(
      screen.getByRole('button', { name: /Konfirmasi Refund/i })
    )

    expect(refundSpy).toHaveBeenCalledWith(
      202,
      'Salah input menu',
      'TRX-20261110-202'
    )
  })
})
