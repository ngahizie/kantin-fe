import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { beepAudioEngine } from '@/hooks/useBeepAudio'
import { kasirApi } from '../api/kasir-api'
import { SessionHistoryModal } from '../components/SessionHistoryModal'
import type { TransaksiSesiItem } from '../types'

const sampleTransactions: TransaksiSesiItem[] = [
  {
    id: 101,
    nomorReferensi: 'TRX-20261110-0001',
    waktu: '2026-11-10T09:00:00Z',
    pembeliTipe: 'SISWA',
    pembeliNama: 'Budi Santoso',
    pembeliKelas: 'VIII-A',
    pembeliNis: '2026001',
    items: [
      {
        menuId: 1,
        namaMenu: 'Air Mineral',
        qty: 2,
        hargaSatuan: 4000,
        subtotal: 8000,
      },
    ],
    total: 8000,
    status: 'SUKSES',
  },
  {
    id: 102,
    nomorReferensi: 'TRX-20261110-0002',
    waktu: '2026-11-10T09:15:00Z',
    pembeliTipe: 'KARTU_TAMU',
    pembeliNama: 'Tamu 01',
    items: [
      {
        menuId: 2,
        namaMenu: 'Ayam Geprek',
        qty: 1,
        hargaSatuan: 13000,
        subtotal: 13000,
      },
    ],
    total: 13000,
    status: 'VOID',
    voidAlasan: 'Salah input menu',
  },
]

describe('SessionHistoryModal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('menampilkan search bar dan filter status di riwayat transaksi tanpa kode struk di kartu serta hanya menampilkan Refund Transaksi untuk status SUKSES', async () => {
    const screen = await render(
      <SessionHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        transactions={sampleTransactions}
      />
    )

    await expect
      .element(screen.getByText('Riwayat Transaksi Sesi Kasir'))
      .toBeInTheDocument()
    // Kode struk / nomor referensi tetap tidak ditampilkan di kartu riwayat transaksi
    await expect
      .element(screen.getByText('TRX-20261110-0001'))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByText('TRX-20261110-0002'))
      .not.toBeInTheDocument()
    await expect.element(screen.getByText('Budi Santoso')).toBeInTheDocument()
    await expect.element(screen.getByText('2x Air Mineral')).toBeInTheDocument()
    await expect.element(screen.getByText('Tamu 01')).toBeInTheDocument()
    await expect.element(screen.getByText(/Alasan Refund:/i)).toBeInTheDocument()

    // Search bar dan filter status tersedia; tombol lama "Void Transaksi" tetap tidak ada
    await expect
      .element(screen.getByRole('button', { name: /Void Transaksi/i }))
      .not.toBeInTheDocument()
    await expect
      .element(
        screen.getByRole('searchbox', {
          name: /Cari nama pembeli, kelas, NIS, atau item menu/i,
        })
      )
      .toBeInTheDocument()
    await expect
      .element(
        screen.getByRole('combobox', {
          name: /Filter status transaksi.*Semua Status/i,
        })
      )
      .toBeInTheDocument()

    // Hanya transaksi berstatus SUKSES yang punya tombol Refund Transaksi (jumlah tepat 1)
    const refundBtn = screen.getByRole('button', { name: /Refund Transaksi/i })
    await expect.element(refundBtn).toBeInTheDocument()
    await expect.element(refundBtn).toBeEnabled()
  })

  it('dapat memfilter riwayat transaksi berdasarkan pencarian nama/item, filter status, reset filter, dan mereset ulang saat drawer dibuka kembali', async () => {
    const screen = await render(
      <SessionHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        transactions={sampleTransactions}
      />
    )

    const searchInput = screen.getByRole('searchbox', {
      name: /Cari nama pembeli, kelas, NIS, atau item menu/i,
    })

    // Cari berdasarkan nama item menu transaksi VOID ("Ayam Geprek")
    await userEvent.fill(searchInput, 'Ayam Geprek')
    await expect.element(screen.getByText('Tamu 01')).toBeInTheDocument()
    await expect
      .element(screen.getByText('Budi Santoso'))
      .not.toBeInTheDocument()

    // Bersihkan pencarian lewat tombol X -> kedua transaksi muncul lagi
    await userEvent.click(
      screen.getByRole('button', { name: /Bersihkan pencarian/i })
    )
    await expect.element(screen.getByText('Budi Santoso')).toBeInTheDocument()
    await expect.element(screen.getByText('Tamu 01')).toBeInTheDocument()

    // Filter status "Hanya Sukses"
    const statusFilter = screen.getByRole('combobox', {
      name: /Filter status transaksi/i,
    })
    await userEvent.click(statusFilter)
    await userEvent.click(screen.getByRole('option', { name: 'Hanya Sukses' }))

    await expect.element(screen.getByText('Budi Santoso')).toBeInTheDocument()
    await expect.element(screen.getByText('Tamu 01')).not.toBeInTheDocument()

    // Filter status "Hanya Void" + query yang tidak cocok -> tampil tombol Reset Filter
    await userEvent.click(statusFilter)
    await userEvent.click(screen.getByRole('option', { name: 'Hanya Void' }))
    await expect.element(screen.getByText('Tamu 01')).toBeInTheDocument()
    await expect
      .element(screen.getByText('Budi Santoso'))
      .not.toBeInTheDocument()

    await userEvent.fill(searchInput, 'Menu Tidak Ada')
    await expect
      .element(screen.getByText('Tidak Ada Transaksi Ditemukan'))
      .toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reset Filter' }))
    await expect.element(screen.getByText('Budi Santoso')).toBeInTheDocument()
    await expect.element(screen.getByText('Tamu 01')).toBeInTheDocument()

    // Terapkan filter lagi, tutup lalu buka ulang drawer -> filter kembali default
    await userEvent.fill(searchInput, 'Budi')
    await screen.rerender(
      <SessionHistoryModal
        open={false}
        onOpenChange={vi.fn()}
        transactions={sampleTransactions}
      />
    )
    await screen.rerender(
      <SessionHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        transactions={sampleTransactions}
      />
    )
    await expect.element(searchInput).toHaveValue('')
    await expect.element(screen.getByText('Tamu 01')).toBeInTheDocument()
  })

  it('menonaktifkan tombol Refund Transaksi saat offline atau sesi kasir telah ditutup', async () => {
    const screen = await render(
      <SessionHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        transactions={sampleTransactions}
        isOffline={true}
      />
    )

    await expect
      .element(screen.getByRole('button', { name: /Refund Transaksi/i }))
      .toBeDisabled()

    await screen.rerender(
      <SessionHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        transactions={sampleTransactions}
        isOffline={false}
        isSessionClosed={true}
      />
    )

    await expect
      .element(screen.getByRole('button', { name: /Refund Transaksi/i }))
      .toBeDisabled()
  })

  it('membuka RefundDialog dari tombol Refund Transaksi, mempertahankan drawer terbuka saat dibatalkan, dan memanggil onTransactionRefunded saat refund berhasil', async () => {
    vi.spyOn(beepAudioEngine, 'playVoid').mockImplementation(() => {})
    const refundSpy = vi
      .spyOn(kasirApi, 'refundTransaksi')
      .mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    const onTransactionRefunded = vi.fn()

    const screen = await render(
      <SessionHistoryModal
        open={true}
        onOpenChange={onOpenChange}
        transactions={sampleTransactions}
        onTransactionRefunded={onTransactionRefunded}
      />
    )

    await userEvent.click(
      screen.getByRole('button', { name: /Refund Transaksi/i })
    )

    await expect
      .element(screen.getByText('Refund Transaksi Kasir'))
      .toBeInTheDocument()

    // Menutup RefundDialog via Escape tidak boleh ikut menutup Sheet Riwayat Sesi
    await userEvent.keyboard('{Escape}')
    await expect
      .element(screen.getByText('Refund Transaksi Kasir'))
      .not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    await expect
      .element(screen.getByText('Riwayat Transaksi Sesi Kasir'))
      .toBeInTheDocument()

    // Buka ulang dan kirim refund dengan kodeStruk valid
    await userEvent.click(
      screen.getByRole('button', { name: /Refund Transaksi/i })
    )
    const kodeInput = screen.getByLabelText(/Kode Struk/i)
    await userEvent.fill(kodeInput, 'TRX-20261110-0001')
    await userEvent.click(
      screen.getByRole('radio', { name: 'Pembeli membatalkan' })
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Konfirmasi Refund/i })
    )

    expect(refundSpy).toHaveBeenCalledWith(
      101,
      'Pembeli membatalkan',
      'TRX-20261110-0001'
    )
    expect(onTransactionRefunded).toHaveBeenCalledTimes(1)
  })
})
