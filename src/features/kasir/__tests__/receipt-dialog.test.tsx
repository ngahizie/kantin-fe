import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import { pengaturanApi } from '@/features/pengaturan/api/pengaturan-api'
import { DEFAULT_PENGATURAN_KANTIN } from '@/features/pengaturan/types'
import { beepAudioEngine } from '@/hooks/useBeepAudio'
import { useCartStore } from '@/stores/useCartStore'
import { KasirPosPage } from '../KasirPosPage'
import { kasirApi } from '../api/kasir-api'
import { ReceiptDialog } from '../components/ReceiptDialog'
import type { ReceiptData } from '../types'

const sampleSiswaReceipt: ReceiptData = {
  transaksiId: 9988,
  nomorStruk: 'TRX-20261110-9988',
  waktu: '2026-11-10T08:30:00Z',
  namaKantin: 'Kantin Sehat SKOOLIA',
  titikKasir: 'Kasir 1 - Kantin Utama',
  pembeliNama: 'Abizard',
  pembeliKelas: '8B',
  pembeliNis: '20260801',
  pembeliFotoUrl: null,
  items: [
    {
      menuId: 1,
      namaMenu: 'Buku Tulis',
      qty: 1,
      hargaSatuan: 7000,
      subtotal: 7000,
    },
  ],
  total: 7000,
  saldoSisa: 49000,
}

const sampleFallbackReceipt: ReceiptData = {
  transaksiId: 5511,
  nomorStruk: null,
  waktu: '2026-11-10T09:15:00Z',
  namaKantin: 'Kantin Sehat SKOOLIA',
  titikKasir: 'Kasir 2',
  pembeliNama: 'Rafi Surya',
  pembeliNis: null,
  pembeliFotoUrl: null,
  items: [],
  namaItemFallback: ['2x Es Teh Manis'],
  total: 8000,
  saldoSisa: 42000,
}

describe('ReceiptDialog (Cetak Struk)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tidak merender dialog saat receipt bernilai null', async () => {
    const screen = await render(
      <ReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={null}
      />
    )

    await expect
      .element(screen.getByText('Cetak Struk'))
      .not.toBeInTheDocument()
  })

  it('menampilkan informasi kantin, kode struk, rincian item, total, dan sisa saldo siswa', async () => {
    const screen = await render(
      <ReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={sampleSiswaReceipt}
      />
    )

    await expect
      .element(screen.getByRole('heading', { name: 'Cetak Struk' }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Kantin Sehat SKOOLIA'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Kasir 1 - Kantin Utama'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Kode Struk', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('TRX-20261110-9988'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Abizard')).toBeInTheDocument()
    await expect.element(screen.getByText('Siswa (8B)')).toBeInTheDocument()
    await expect.element(screen.getByText('20260801')).toBeInTheDocument()
    await expect.element(screen.getByText('Buku Tulis')).toBeInTheDocument()
    await expect
      .element(screen.getByText('1 x Rp 7.000'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Rp 49.000')).toBeInTheDocument()
  })

  it('menampilkan fallback inisial avatar, NIS default (-), dan fallback namaItem saat items kosong', async () => {
    const screen = await render(
      <ReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={sampleFallbackReceipt}
      />
    )

    await expect
      .element(screen.getByText('TRX-5511'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Rafi Surya'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('RS')).toBeInTheDocument()
    await expect.element(screen.getByText('Siswa')).toBeInTheDocument()
    await expect.element(screen.getByText('-', { exact: true })).toBeInTheDocument()
    await expect
      .element(screen.getByText('2x Es Teh Manis'))
      .toBeInTheDocument()
  })

  it('menyalin kode struk ke clipboard, memperbarui status aksesibel, dan memanggil window.print()', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    })
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    const screen = await render(
      <ReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={sampleSiswaReceipt}
      />
    )

    const copyButton = screen.getByRole('button', { name: /Salin kode struk/i })
    await userEvent.click(copyButton)

    expect(writeTextSpy).toHaveBeenCalledWith('TRX-20261110-9988')
    await expect.element(screen.getByRole('status')).toHaveTextContent(/Tersalin/)
    await expect.element(copyButton).not.toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /Cetak Struk/i }))
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('menampilkan pesan gagal pada live region saat clipboard ditolak', async () => {
    const writeTextSpy = vi.fn().mockRejectedValue(new Error('Denied'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    })

    const screen = await render(
      <ReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={sampleSiswaReceipt}
      />
    )

    const copyButton = screen.getByRole('button', { name: /Salin kode struk/i })
    await userEvent.click(copyButton)

    await expect
      .element(screen.getByRole('status'))
      .toHaveTextContent(/Gagal menyalin/)
    await expect.element(copyButton).not.toBeDisabled()
  })

  it('mempertahankan isi kertas struk selama animasi tutup dialog', async () => {
    const screen = await render(
      <ReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        receipt={sampleSiswaReceipt}
      />
    )

    await expect
      .element(screen.getByText('TRX-20261110-9988'))
      .toBeInTheDocument()

    await screen.rerender(
      <ReceiptDialog
        open={false}
        onOpenChange={vi.fn()}
        receipt={sampleSiswaReceipt}
      />
    )

    const headerStillMounted = Boolean(
      document.querySelector('[data-slot="dialog-header"]')
    )
    const paperStillMounted = Boolean(
      document.querySelector('[data-receipt-printable]')
    )
    if (headerStillMounted) {
      expect(paperStillMounted).toBe(true)
    }

    await expect
      .element(screen.getByText('TRX-20261110-9988'))
      .not.toBeInTheDocument()
  })
})

describe('Alur berurutan Transaksi Berhasil -> Cetak Struk di KasirPosPage', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart()
  })

  afterEach(() => {
    useCartStore.getState().clearCart()
    vi.restoreAllMocks()
  })

  it('menyembunyikan kode struk di dialog Transaksi Berhasil lalu membuka dialog Cetak Struk setelah klik Selesai', async () => {
    vi.spyOn(beepAudioEngine, 'playSuccess').mockImplementation(() => {})
    vi.spyOn(beepAudioEngine, 'playError').mockImplementation(() => {})

    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([
      {
        id: 1,
        kategoriId: 1,
        nama: 'Buku Tulis',
        hargaJual: 7000,
        satuan: 'pcs',
        fotoUrl: null,
        stokMinimum: 5,
        stokBerjalan: 20,
        aktif: true,
      },
    ])
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([
      { id: 1, nama: 'Alat Tulis', urutan: 1, aktif: true },
    ])
    vi.spyOn(pengaturanApi, 'getPengaturan').mockResolvedValue({
      ...DEFAULT_PENGATURAN_KANTIN,
      konfirmasiManual: false,
      durasiFotoDetik: 10,
      updatedAt: '2026-11-10T07:00:00Z',
      updatedBy: 'Sistem',
    })
    vi.spyOn(pengaturanApi, 'getTitikKasirList').mockResolvedValue([
      {
        id: 1,
        sekolahId: 1,
        nama: 'Kasir Utama 1',
        kode: 'KSR-01',
        aktif: true,
        createdAt: '2026-11-10T07:00:00Z',
        updatedAt: '2026-11-10T07:00:00Z',
      },
    ])
    vi.spyOn(kasirApi, 'getSesiAktif').mockResolvedValue({
      id: 1,
      titikKasirId: 1,
      titikKasirNama: 'Kasir Utama 1',
      tanggal: '2026-11-10',
      status: 'TERBUKA',
      totalBruto: 0,
      totalVoid: 0,
      totalBersih: 0,
      dibukaAt: '2026-11-10T07:00:00Z',
    })
    vi.spyOn(kasirApi, 'getRekapSesi').mockResolvedValue({
      sesiKasirId: 1,
      jumlahTransaksi: 1,
      jumlahVoid: 0,
      totalBruto: 7000,
      totalVoid: 0,
      totalBersih: 7000,
    })
    vi.spyOn(kasirApi, 'getRiwayatTransaksiSesi').mockResolvedValue([])
    vi.spyOn(kasirApi, 'prosesTap').mockResolvedValue({
      transaksi_id: 4322,
      transaksiId: 4322,
      nomorStruk: 'TRX-20261110-4322',
      titikKasir: 'Kasir Utama 1',
      total: 7000,
      waktu: '2026-11-10T08:40:00Z',
      pembeli: {
        nama: 'Abizard',
        kelas: '8B',
        nis: '20260801',
        foto_url: null,
        fotoUrl: null,
        sisa_saldo: 49000,
        saldoSisa: 49000,
      },
    })

    const screen = await render(<KasirPosPage />)

    // 1. Pilih item ke keranjang dan buka pembayaran manual RFID
    const menuBtn = screen.getByText('Buku Tulis').first()
    await expect.element(menuBtn).toBeInTheDocument()
    await userEvent.click(menuBtn)

    await userEvent.click(
      screen.getByRole('button', { name: /Bayar \/ Tap Kartu/i })
    )

    const uidInput = screen.getByPlaceholder(
      /Tap kartu RFID atau masukkan UID/i
    )
    await userEvent.fill(uidInput, 'RFID001')
    await userEvent.click(screen.getByRole('button', { name: /Proses Tap/i }))

    // 2. Dialog Transaksi Berhasil terbuka TANPA kode struk dan BELUM membuka dialog Cetak Struk
    await expect
      .element(screen.getByText('Transaksi Berhasil'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Abizard')).toBeInTheDocument()
    await expect.element(screen.getByText('Kode Struk')).not.toBeInTheDocument()
    await expect
      .element(screen.getByText('TRX-20261110-4322'))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByRole('heading', { name: 'Cetak Struk' }))
      .not.toBeInTheDocument()

    // 3. Klik Selesai -> dialog Transaksi Berhasil menutup & dialog Cetak Struk muncul membawa kode struk + rincian item
    await userEvent.click(screen.getByRole('button', { name: /Selesai/i }))

    await expect
      .element(screen.getByText('Transaksi Berhasil'))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByRole('heading', { name: 'Cetak Struk' }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Kode Struk', { exact: true }))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('TRX-20261110-4322'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('1 x Rp 7.000'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /^Cetak Struk$/i }))
      .toBeInTheDocument()

    // Klik Tutup -> dialog Cetak Struk menutup kembali
    await userEvent.click(screen.getByRole('button', { name: /^Tutup$/i }))
    await expect
      .element(screen.getByRole('heading', { name: 'Cetak Struk' }))
      .not.toBeInTheDocument()
  })

  it('tetap membuka dialog Cetak Struk secara otomatis setelah hitung mundur Transaksi Berhasil selesai', async () => {
    vi.spyOn(beepAudioEngine, 'playSuccess').mockImplementation(() => {})
    vi.spyOn(beepAudioEngine, 'playError').mockImplementation(() => {})

    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([
      {
        id: 2,
        kategoriId: 1,
        nama: 'Es Teh Manis',
        hargaJual: 4000,
        satuan: 'gelas',
        fotoUrl: null,
        stokMinimum: 5,
        stokBerjalan: 30,
        aktif: true,
      },
    ])
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([
      { id: 1, nama: 'Minuman', urutan: 1, aktif: true },
    ])
    vi.spyOn(pengaturanApi, 'getPengaturan').mockResolvedValue({
      ...DEFAULT_PENGATURAN_KANTIN,
      konfirmasiManual: false,
      durasiFotoDetik: 1,
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
      totalBruto: 0,
      totalVoid: 0,
      totalBersih: 0,
      dibukaAt: '2026-11-10T07:00:00Z',
    })
    vi.spyOn(kasirApi, 'getRekapSesi').mockResolvedValue({
      sesiKasirId: 1,
      jumlahTransaksi: 1,
      jumlahVoid: 0,
      totalBruto: 4000,
      totalVoid: 0,
      totalBersih: 4000,
    })
    vi.spyOn(kasirApi, 'getRiwayatTransaksiSesi').mockResolvedValue([])
    vi.spyOn(kasirApi, 'prosesTap').mockResolvedValue({
      transaksi_id: 4399,
      transaksiId: 4399,
      nomorStruk: 'TRX-20261110-4399',
      titikKasir: 'Kasir 1',
      total: 4000,
      waktu: '2026-11-10T08:45:00Z',
      pembeli: {
        nama: 'Rania Putri',
        kelas: '7A',
        sisa_saldo: 16000,
        saldoSisa: 16000,
      },
    })

    const screen = await render(<KasirPosPage />)

    const menuBtn = screen.getByText('Es Teh Manis').first()
    await expect.element(menuBtn).toBeInTheDocument()
    await userEvent.click(menuBtn)

    await userEvent.click(
      screen.getByRole('button', { name: /Bayar \/ Tap Kartu/i })
    )
    const uidInput = screen.getByPlaceholder(
      /Tap kartu RFID atau masukkan UID/i
    )
    await userEvent.fill(uidInput, 'RFID002')
    await userEvent.click(screen.getByRole('button', { name: /Proses Tap/i }))

    await expect
      .element(screen.getByText('Transaksi Berhasil'))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Kode Struk')).not.toBeInTheDocument()

    // Tunggu 1 detik hitung mundur selesai otomatis -> dialog Cetak Struk muncul
    await expect
      .element(screen.getByRole('heading', { name: 'Cetak Struk' }), {
        timeout: 4000,
      })
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('TRX-20261110-4399'))
      .toBeInTheDocument()
  })
})
