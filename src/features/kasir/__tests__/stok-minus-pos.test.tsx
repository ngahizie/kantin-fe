import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import type { MenuItem } from '@/features/katalog/types'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import { DEFAULT_PENGATURAN_KANTIN } from '@/features/pengaturan/types'
import { pengaturanApi } from '@/features/pengaturan/api/pengaturan-api'
import { useCartStore } from '@/stores/useCartStore'
import { kasirApi } from '../api/kasir-api'
import MenuItemCard from '../components/MenuItemCard'
import CartSidebar from '../components/CartSidebar'
import StokMinusConfirmDialog from '../components/StokMinusConfirmDialog'
import KasirPosPage from '../KasirPosPage'

const menuHabisAktif: MenuItem = {
  id: 301,
  kategoriId: 1,
  nama: 'Risoles Mayo',
  hargaJual: 5000,
  satuan: 'PCS',
  fotoUrl: null,
  stokMinimum: 3,
  stokBerjalan: 0,
  aktif: true,
}

const menuNonaktif: MenuItem = {
  id: 302,
  kategoriId: 1,
  nama: 'Menu Arsip',
  hargaJual: 8000,
  satuan: 'PCS',
  fotoUrl: null,
  stokMinimum: 2,
  stokBerjalan: 0,
  aktif: false,
}

const menuTerbatas: MenuItem = {
  id: 303,
  kategoriId: 1,
  nama: 'Lemper Ayam',
  hargaJual: 4000,
  satuan: 'PCS',
  fotoUrl: null,
  stokMinimum: 1,
  stokBerjalan: 2,
  aktif: true,
}

describe('UI Penjualan Stok Gudang / Minus (C.1)', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('MenuItemCard menampilkan badge gudang & tetap bisa diklik saat stok 0 namun aktif, sementara menu nonaktif tetap mati', async () => {
    const onAddToCart = vi.fn()

    const { getByText, rerender, unmount } = await render(
      <MenuItemCard menu={menuHabisAktif} onAddToCart={onAddToCart} />
    )

    await expect.element(getByText('Habis · bisa dijual dari gudang')).toBeInTheDocument()
    await userEvent.click(getByText('Risoles Mayo'))
    expect(onAddToCart).toHaveBeenCalledWith(menuHabisAktif, {
      jualMelebihiCatatan: true,
    })

    onAddToCart.mockClear()
    await rerender(<MenuItemCard menu={menuNonaktif} onAddToCart={onAddToCart} />)
    await expect.element(getByText('Menu Arsip')).toBeInTheDocument()
    const disabledCard = getByText('Menu Arsip')
    await userEvent.click(disabledCard, { force: true })
    expect(onAddToCart).not.toHaveBeenCalled()

    await unmount()
  })

  it('CartSidebar menampilkan badge "Lewat catatan" untuk item bertanda dan membolehkan tambah qty melewati stok', async () => {
    useCartStore.getState().addItem(menuHabisAktif, 1, { jualMelebihiCatatan: true })
    useCartStore.getState().addItem(menuTerbatas, 2)

    const { getByText, getByTitle, unmount } = await render(
      <CartSidebar
        onCheckout={vi.fn()}
        onCashCheckout={vi.fn()}
        onManualRfidOpen={vi.fn()}
      />
    )

    await expect.element(getByText('Lewat catatan')).toBeInTheDocument()
    await expect.element(getByText('Maksimal stok')).toBeInTheDocument()

    const allowedPlus = getByTitle('Tambah jumlah')
    const cappedPlus = getByTitle('Maksimal stok tercapai')

    // Item bertanda (Risoles Mayo) boleh dinaikkan qty-nya; item biasa (Lemper Ayam) terkunci
    await expect.element(allowedPlus).toBeEnabled()
    await expect.element(cappedPlus).toBeDisabled()

    await userEvent.click(allowedPlus)
    expect(useCartStore.getState().getItemQty(301)).toBe(2)

    await unmount()
  })

  it('StokMinusConfirmDialog menyebut semua item minus, mewajibkan alasan cepat, dan mendukung isian Lain-lain', async () => {
    useCartStore.getState().addItem(menuHabisAktif, 2, { jualMelebihiCatatan: true })
    useCartStore.getState().addItem(menuTerbatas, 3, { jualMelebihiCatatan: true })
    const minusItems = useCartStore.getState().items

    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    const { getByText, getByRole, getByPlaceholder, unmount } = await render(
      <StokMinusConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        minusItems={minusItems}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    // Kedua item disebut dalam satu dialog
    await expect.element(getByText(/Risoles Mayo, Lemper Ayam/)).toBeInTheDocument()
    await expect.element(getByText(/Barang masih ada di gudang\?/)).toBeInTheDocument()

    // Tombol lanjutkan terkunci sebelum memilih alasan
    const submitBtn = getByRole('button', { name: /Ya, Lanjutkan Pembayaran/i })
    await expect.element(submitBtn).toBeDisabled()

    // Pilih Lain-lain tanpa isi -> tetap terkunci
    await userEvent.click(getByRole('button', { name: 'Lain-lain' }))
    await expect.element(submitBtn).toBeDisabled()

    // Isi alasan bebas
    const textarea = getByPlaceholder(/Tuliskan alasan barang dijual dari gudang/i)
    await textarea.fill('Stok cadangan baru datang dari supplier')
    await expect.element(submitBtn).toBeEnabled()

    // Pilih preset cepat & kirim
    await userEvent.click(getByRole('button', { name: 'Barang ada di gudang' }))
    await userEvent.click(submitBtn)
    expect(onConfirm).toHaveBeenCalledWith('Barang ada di gudang')

    await unmount()
  })

  it('KasirPosPage menampilkan dialog konfirmasi sebelum bayar dan mengirim izinkanStokMinus + alasan hanya bila ada item minus', async () => {
    await page.viewport(1440, 900)
    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([menuHabisAktif, menuTerbatas])
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([])
    vi.spyOn(pengaturanApi, 'getPengaturan').mockResolvedValue({
      ...DEFAULT_PENGATURAN_KANTIN,
      namaKantin: 'Kantin Uji',
      konfirmasiManual: false,
      durasiFotoDetik: 1,
      updatedAt: '2026-11-20T00:00:00Z',
      updatedBy: 'Admin',
    })
    vi.spyOn(pengaturanApi, 'getTitikKasirList').mockResolvedValue([
      {
        id: 1,
        sekolahId: 1,
        nama: 'Kasir Utama',
        kode: 'KSR-01',
        aktif: true,
        createdAt: '2026-11-20T00:00:00Z',
        updatedAt: '2026-11-20T00:00:00Z',
      },
    ])
    vi.spyOn(kasirApi, 'getSesiAktif').mockResolvedValue({
      id: 88,
      titikKasirId: 1,
      titikKasirNama: 'Kasir Utama',
      tanggal: '2026-11-20',
      status: 'TERBUKA',
      totalBruto: 0,
      totalVoid: 0,
      totalBersih: 0,
      totalTransaksi: 0,
      dibukaAt: '2026-11-20T07:00:00Z',
    })
    vi.spyOn(kasirApi, 'getRekapSesi').mockResolvedValue({
      sesiKasirId: 88,
      jumlahTransaksi: 0,
      jumlahVoid: 0,
      totalBruto: 0,
      totalVoid: 0,
      totalBersih: 0,
    })
    vi.spyOn(kasirApi, 'getRiwayatTransaksiSesi').mockResolvedValue([])

    const prosesTapSpy = vi.spyOn(kasirApi, 'prosesTap').mockResolvedValue({
      transaksi_id: 777,
      transaksiId: 777,
      nomorStruk: 'TRX-777',
      total: 5000,
      metodeBayar: 'TUNAI',
      uangDiterima: 5000,
      kembalian: 0,
      waktu: '2026-11-20T09:00:00Z',
      pembeli: { nama: 'Tamu (Tunai)', sisa_saldo: null },
    })

    const { getByText, getByRole, unmount } = await render(
      <div className='h-[700px] w-full'>
        <KasirPosPage />
      </div>
    )

    // Klik menu stok 0
    await expect.element(getByText('Risoles Mayo')).toBeInTheDocument()
    await userEvent.click(getByText('Risoles Mayo'))
    await expect.element(getByText('Lewat catatan')).toBeInTheDocument()

    // Pilih Tunai & nominal Uang Pas, lalu bayar
    await userEvent.click(getByRole('radio', { name: /Tunai/i }))
    await userEvent.click(getByRole('button', { name: 'Uang Pas' }))
    await userEvent.click(getByRole('button', { name: /Bayar Tunai/i }))

    // Dialog konfirmasi stok minus muncul sebelum API tap dipanggil
    await expect.element(getByText(/Konfirmasi Penjualan Stok Gudang/i)).toBeInTheDocument()
    expect(prosesTapSpy).not.toHaveBeenCalled()

    await userEvent.click(getByRole('button', { name: 'Belum dicatat barang masuk' }))
    await userEvent.click(getByRole('button', { name: /Ya, Lanjutkan Pembayaran/i }))

    expect(prosesTapSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metodeBayar: 'TUNAI',
        izinkanStokMinus: true,
        alasanStokMinus: 'Belum dicatat barang masuk',
      })
    )

    await unmount()
  })
})
