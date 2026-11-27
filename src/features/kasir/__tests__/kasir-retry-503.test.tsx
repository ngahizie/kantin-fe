import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import { AxiosError, type AxiosResponse } from 'axios'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import { DEFAULT_PENGATURAN_KANTIN } from '@/features/pengaturan/types'
import { pengaturanApi } from '@/features/pengaturan/api/pengaturan-api'
import { useCartStore } from '@/stores/use-cart-store'
import { usePengaturanStore } from '@/stores/use-pengaturan-store'
import { kasirApi } from '../api/kasir-api'
import { KasirPosPage } from '../kasir-pos-page'

const mockMenu = {
  id: 101,
  kategoriId: 1,
  nama: 'Nasi Goreng Spesial',
  hargaJual: 12000,
  satuan: 'PORSI',
  fotoUrl: null,
  stokMinimum: 2,
  stokBerjalan: 10,
  aktif: true,
}

function setupBasePosMocks() {
  vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([mockMenu])
  vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([
    { id: 1, nama: 'Makanan', aktif: true, urutan: 1 },
  ])
  vi.spyOn(pengaturanApi, 'getPengaturan').mockResolvedValue({
    ...DEFAULT_PENGATURAN_KANTIN,
    konfirmasiManual: false,
  })
  vi.spyOn(pengaturanApi, 'getTitikKasirList').mockResolvedValue([
    {
      id: 1,
      sekolahId: 1,
      nama: 'Kasir Utama',
      kode: 'KSR-01',
      aktif: true,
      createdAt: '2026-11-27T00:00:00Z',
      updatedAt: '2026-11-27T00:00:00Z',
    },
  ])
  vi.spyOn(kasirApi, 'getSesiAktif').mockResolvedValue({
    id: 10,
    titikKasirId: 1,
    titikKasirNama: 'Kasir Utama',
    tanggal: '2026-11-27',
    status: 'TERBUKA',
    dibukaAt: '2026-11-27T07:00:00Z',
    totalBruto: 0,
    totalVoid: 0,
    totalBersih: 0,
  })
  vi.spyOn(kasirApi, 'getRekapSesi').mockResolvedValue({
    sesiKasirId: 10,
    jumlahTransaksi: 0,
    jumlahVoid: 0,
    totalBruto: 0,
    totalVoid: 0,
    totalBersih: 0,
    totalSaldo: 0,
    totalTunai: 0,
  })
  vi.spyOn(kasirApi, 'getRiwayatTransaksiSesi').mockResolvedValue([])
  vi.spyOn(kasirApi, 'getTapMenunggu').mockResolvedValue([])
}

describe('Kasir POS HTTP 503 & Retry Idempoten (Sync BE #449 / FE #227)', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.getState().clearCart()
    usePengaturanStore.getState().setActiveTitikKasirId(1)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('menampilkan dialog Server Sedang Sibuk pada HTTP 503 dan mengulang tap dengan idempotencyKey yang sama saat klik Coba Lagi', async () => {
    setupBasePosMocks()

    const busyError = new AxiosError('Service Unavailable')
    busyError.response = {
      status: 503,
      data: {
        code: 503,
        status: 'LAYANAN SEDANG SIBUK',
        message: 'Server sedang sibuk: data sedang dipakai transaksi lain. Silakan ulangi.',
      },
    } as AxiosResponse

    const tapSpy = vi
      .spyOn(kasirApi, 'prosesTap')
      .mockRejectedValueOnce(busyError)
      .mockResolvedValueOnce({
        transaksi_id: 9501,
        transaksiId: 9501,
        nomorStruk: 'TRX-20261127-9501',
        total: 12000,
        waktu: '2026-11-27T12:30:00Z',
        menungguKonfirmasi: false,
        metodeBayar: 'SALDO',
        pembeli: {
          nama: 'Siti Aminah',
          kelas: '8B',
          sisa_saldo: 38000,
          saldoSisa: 38000,
        },
      })

    useCartStore.getState().addItem(mockMenu, 1)

    const screen = await render(<KasirPosPage />)
    await expect.element(screen.getByText('Nasi Goreng Spesial').first()).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Bayar \/ Tap Kartu/i }))
    await userEvent.fill(
      page.getByPlaceholder(/Tap kartu RFID atau masukkan UID/i),
      'RFID-503'
    )
    await userEvent.click(page.getByRole('button', { name: /Proses Tap/i }))

    expect(tapSpy).toHaveBeenCalledTimes(1)
    const firstKey = tapSpy.mock.calls[0][0].idempotencyKey
    expect(firstKey).toBeTruthy()

    await expect
      .element(page.getByRole('heading', { name: 'Server Sedang Sibuk' }))
      .toBeInTheDocument()
    await expect
      .element(
        page.getByText('Server sedang sibuk: data sedang dipakai transaksi lain. Silakan ulangi.')
      )
      .toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(1)

    const retryBtn = page.getByRole('button', { name: /Coba Lagi/i })
    await expect.element(retryBtn).toBeInTheDocument()
    await userEvent.click(retryBtn)

    await vi.waitFor(() => {
      expect(tapSpy).toHaveBeenCalledTimes(2)
    })

    // Kontrak idempotensi BE #449: percobaan ulang memakai idempotencyKey yang sama
    expect(tapSpy.mock.calls[1][0].idempotencyKey).toBe(firstKey)
    expect(tapSpy.mock.calls[1][0].rfidUid).toBe('RFID-503')

    await expect.element(page.getByText('Transaksi Berhasil')).toBeInTheDocument()
    await expect.element(page.getByText('Siti Aminah')).toBeInTheDocument()
  })

  it('tetap menampilkan Transaksi Kasir Ditolak tanpa tombol Coba Lagi pada penolakan validasi 400', async () => {
    setupBasePosMocks()

    const saldoError = new AxiosError('Bad Request')
    saldoError.response = {
      status: 400,
      data: {
        code: 400,
        message: 'Saldo kurang',
        kekurangan: 5000,
      },
    } as AxiosResponse

    vi.spyOn(kasirApi, 'prosesTap').mockRejectedValueOnce(saldoError)

    useCartStore.getState().addItem(mockMenu, 1)

    const screen = await render(<KasirPosPage />)
    await expect.element(screen.getByText('Nasi Goreng Spesial').first()).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Bayar \/ Tap Kartu/i }))
    await userEvent.fill(
      page.getByPlaceholder(/Tap kartu RFID atau masukkan UID/i),
      'RFID-400'
    )
    await userEvent.click(page.getByRole('button', { name: /Proses Tap/i }))

    await expect.element(page.getByText('Transaksi Kasir Ditolak')).toBeInTheDocument()
    await expect.element(page.getByRole('button', { name: /Coba Lagi/i })).not.toBeInTheDocument()
  })
})
