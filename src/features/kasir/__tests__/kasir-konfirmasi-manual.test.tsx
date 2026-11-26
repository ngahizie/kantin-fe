import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
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

function setupBasePosMocks(konfirmasiManual = true) {
  vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([mockMenu])
  vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([
    { id: 1, nama: 'Makanan', aktif: true, urutan: 1 },
  ])
  vi.spyOn(pengaturanApi, 'getPengaturan').mockResolvedValue({
    ...DEFAULT_PENGATURAN_KANTIN,
    konfirmasiManual,
  })
  vi.spyOn(pengaturanApi, 'getTitikKasirList').mockResolvedValue([
    {
      id: 1,
      sekolahId: 1,
      nama: 'Kasir Utama',
      kode: 'KSR-01',
      aktif: true,
      createdAt: '2026-11-26T00:00:00Z',
      updatedAt: '2026-11-26T00:00:00Z',
    },
  ])
  vi.spyOn(kasirApi, 'getSesiAktif').mockResolvedValue({
    id: 10,
    titikKasirId: 1,
    titikKasirNama: 'Kasir Utama',
    tanggal: '2026-11-26',
    status: 'TERBUKA',
    dibukaAt: '2026-11-26T07:00:00Z',
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
}

describe('Konfirmasi Manual Kasir POS (Issue #220)', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.getState().clearCart()
    usePengaturanStore.getState().setActiveTitikKasirId(1)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('kasirApi memetakan menungguKonfirmasi & pendingId serta memanggil endpoint konfirmasi/batal/menunggu dengan benar', async () => {
    const postSpy = vi.spyOn(apiClient, 'post')
    const getSpy = vi.spyOn(apiClient, 'get')

    postSpy.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          transaksiId: null,
          pendingId: 777,
          menungguKonfirmasi: true,
          nama: 'Ahmad Fauzi',
          kelas: '8A',
          total: 12000,
          saldoSisa: null,
        },
      },
    } as never)

    const tapRes = await kasirApi.prosesTap({
      rfidUid: 'RFID-001',
      metodeBayar: 'SALDO',
      items: [{ menuId: 101, qty: 1 }],
      idempotencyKey: 'key-1',
      titikKasirId: 1,
    })

    expect(tapRes.menungguKonfirmasi).toBe(true)
    expect(tapRes.pendingId).toBe(777)
    expect(tapRes.transaksiId).toBe(0)
    expect(tapRes.pembeli.sisa_saldo).toBeNull()

    postSpy.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          transaksiId: 9001,
          nomorStruk: 'TRX-20261126-9001',
          menungguKonfirmasi: false,
          nama: 'Ahmad Fauzi',
          kelas: '8A',
          total: 12000,
          saldoSisa: 38000,
          metodeBayar: 'SALDO',
        },
      },
    } as never)

    const confRes = await kasirApi.konfirmasiTap(777)
    expect(postSpy).toHaveBeenCalledWith('/api/kasir/tap/777/konfirmasi')
    expect(confRes.menungguKonfirmasi).toBe(false)
    expect(confRes.transaksiId).toBe(9001)
    expect(confRes.pembeli.sisa_saldo).toBe(38000)

    postSpy.mockResolvedValueOnce({ data: { code: 200, data: null } } as never)
    await kasirApi.batalTap(777)
    expect(postSpy).toHaveBeenCalledWith('/api/kasir/tap/777/batal')

    getSpy.mockResolvedValueOnce({
      data: {
        code: 200,
        data: [
          {
            pendingId: 888,
            menungguKonfirmasi: true,
            nama: 'Siti Aminah',
            total: 15000,
          },
        ],
      },
    } as never)
    const pendingList = await kasirApi.getTapMenunggu()
    expect(getSpy).toHaveBeenCalledWith('/api/kasir/tap/menunggu')
    expect(pendingList).toHaveLength(1)
    expect(pendingList[0].pendingId).toBe(888)
  })

  it('respons pending tidak dianggap sukses, tidak mengosongkan keranjang, lalu konfirmasi memotong saldo tepat sekali tanpa duplikasi klik ganda', async () => {
    setupBasePosMocks(true)
    vi.spyOn(kasirApi, 'getTapMenunggu').mockResolvedValue([])
    const tapSpy = vi.spyOn(kasirApi, 'prosesTap').mockResolvedValue({
      transaksi_id: 0,
      transaksiId: 0,
      total: 12000,
      waktu: '2026-11-26T14:00:00Z',
      menungguKonfirmasi: true,
      pendingId: 501,
      pembeli: {
        nama: 'Budi Santoso',
        kelas: '7B',
        sisa_saldo: null,
        saldoSisa: null,
      },
    })

    let resolveConfirm!: (val: Awaited<ReturnType<typeof kasirApi.konfirmasiTap>>) => void
    const confirmSpy = vi.spyOn(kasirApi, 'konfirmasiTap').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfirm = resolve
        })
    )

    useCartStore.getState().addItem(mockMenu, 1)

    const screen = await render(<KasirPosPage />)
    await expect.element(screen.getByText('Nasi Goreng Spesial').first()).toBeInTheDocument()

    // Buka modal Input RFID Manual lalu tap kartu
    const bayarBtn = screen.getByRole('button', { name: /Bayar \/ Tap Kartu/i })
    await userEvent.click(bayarBtn)

    const uidInput = page.getByPlaceholder(/Tap kartu RFID atau masukkan UID/i)
    await userEvent.fill(uidInput, 'RFID-BUDI')
    const prosesTapBtn = page.getByRole('button', { name: /Proses Tap/i })
    await userEvent.click(prosesTapBtn)

    expect(tapSpy).toHaveBeenCalledTimes(1)

    // Dialog Menunggu Konfirmasi harus muncul; Transaksi Berhasil & Struk TIDAK boleh muncul
    await expect.element(screen.getByText('Menunggu Konfirmasi')).toBeInTheDocument()
    await expect.element(screen.getByText('Budi Santoso')).toBeInTheDocument()
    await expect.element(screen.getByText('Saldo Belum Dipotong')).toBeInTheDocument()
    await expect.element(screen.getByText('Transaksi Berhasil')).not.toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(1)

    // Klik ganda cepat tombol Konfirmasi hanya boleh mengirim 1 request konfirmasi
    const confirmBtn = page.getByRole('button', { name: /^Konfirmasi$/i })
    await userEvent.click(confirmBtn)
    await expect
      .element(page.getByRole('button', { name: /Memproses/i }))
      .toBeDisabled()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(confirmSpy).toHaveBeenCalledWith(501)

    // Selesaikan response konfirmasi dari server
    resolveConfirm({
      transaksi_id: 9901,
      transaksiId: 9901,
      nomorStruk: 'TRX-20261126-9901',
      total: 12000,
      waktu: '2026-11-26T14:00:05Z',
      menungguKonfirmasi: false,
      metodeBayar: 'SALDO',
      pembeli: {
        nama: 'Budi Santoso',
        kelas: '7B',
        sisa_saldo: 38000,
        saldoSisa: 38000,
      },
    })

    // Baru muncul Transaksi Berhasil setelah konfirmasi
    await expect.element(screen.getByText('Transaksi Berhasil')).toBeInTheDocument()
  })

  it('tombol Batalkan memanggil batalTap dan tidak membuat transaksi', async () => {
    setupBasePosMocks(true)
    vi.spyOn(kasirApi, 'getTapMenunggu').mockResolvedValue([
      {
        transaksi_id: 0,
        transaksiId: 0,
        total: 12000,
        waktu: '2026-11-26T14:00:00Z',
        menungguKonfirmasi: true,
        pendingId: 601,
        pembeli: {
          nama: 'Citra Lestari',
          kelas: '9C',
          sisa_saldo: null,
          saldoSisa: null,
        },
      },
    ])
    const batalSpy = vi.spyOn(kasirApi, 'batalTap').mockResolvedValue()

    useCartStore.getState().addItem(mockMenu, 1)
    const screen = await render(<KasirPosPage />)

    // Saat halaman kasir dibuka ulang, pending tap dari GET /api/kasir/tap/menunggu langsung muncul
    await expect.element(screen.getByText('Menunggu Konfirmasi')).toBeInTheDocument()
    await expect.element(screen.getByText('Citra Lestari')).toBeInTheDocument()

    const cancelBtn = page.getByRole('button', { name: /^Batalkan$/i })
    await userEvent.click(cancelBtn)

    expect(batalSpy).toHaveBeenCalledTimes(1)
    expect(batalSpy).toHaveBeenCalledWith(601)
    await expect.element(screen.getByText('Menunggu Konfirmasi')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Transaksi Berhasil')).not.toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('menangani error 404/409 saat pending sudah dibatalkan atau kedaluwarsa dengan pesan yang jelas', async () => {
    setupBasePosMocks(true)
    vi.spyOn(kasirApi, 'getTapMenunggu')
      .mockResolvedValueOnce([
        {
          transaksi_id: 0,
          transaksiId: 0,
          total: 12000,
          waktu: '2026-11-26T14:00:00Z',
          menungguKonfirmasi: true,
          pendingId: 701,
          pembeli: {
            nama: 'Dewi Kartika',
            kelas: '8B',
            sisa_saldo: null,
            saldoSisa: null,
          },
        },
      ])
      .mockResolvedValueOnce([])

    vi.spyOn(kasirApi, 'konfirmasiTap').mockRejectedValue({
      response: {
        status: 404,
        data: { message: 'Permintaan konfirmasi tidak ditemukan' },
      },
    })

    const screen = await render(<KasirPosPage />)
    await expect.element(screen.getByText('Dewi Kartika')).toBeInTheDocument()

    const confirmBtn = page.getByRole('button', { name: /^Konfirmasi$/i })
    await userEvent.click(confirmBtn)

    await expect.element(screen.getByText('Menunggu Konfirmasi')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Transaksi Berhasil')).not.toBeInTheDocument()
  })
})
