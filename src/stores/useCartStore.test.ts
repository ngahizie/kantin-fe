import { describe, it, expect, beforeEach } from 'vitest'
import type { MenuItem } from '@/features/katalog/types'
import { useCartStore } from './useCartStore'

const dummyMenu1: MenuItem = {
  id: 1,
  kategoriId: 1,
  nama: 'Nasi Uduk Komplit',
  hargaJual: 12000,
  satuan: 'PORSI',
  fotoUrl: 'https://example.com/nasi-uduk.jpg',
  stokMinimum: 5,
  stokBerjalan: 10,
  aktif: true,
}

const dummyMenu2: MenuItem = {
  id: 2,
  kategoriId: 1,
  nama: 'Mie Goreng Spesial',
  hargaJual: 10000,
  satuan: 'PORSI',
  fotoUrl: null,
  stokMinimum: 5,
  stokBerjalan: 0, // Stok habis
  aktif: true,
}

const dummyMenu3: MenuItem = {
  id: 3,
  kategoriId: 2,
  nama: 'Es Teh Manis',
  hargaJual: 3500,
  satuan: 'BOTOL',
  fotoUrl: null,
  stokMinimum: 2,
  stokBerjalan: 2, // Stok tinggal 2
  aktif: true,
}

const dummyMenuNonaktif: MenuItem = {
  id: 4,
  kategoriId: 1,
  nama: 'Menu Discontinued',
  hargaJual: 8000,
  satuan: 'PCS',
  stokMinimum: 2,
  stokBerjalan: 15,
  aktif: false, // Non-aktif
}

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart()
  })

  it('berhasil menambahkan menu dengan stok tersedia ke keranjang', () => {
    const res = useCartStore.getState().addItem(dummyMenu1, 1)
    expect(res.success).toBe(true)

    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].menu.id).toBe(1)
    expect(items[0].qty).toBe(1)
    expect(items[0].subtotal).toBe(12000)
    expect(useCartStore.getState().totalItems()).toBe(1)
    expect(useCartStore.getState().totalHarga()).toBe(12000)
  })

  it('gagal menambahkan menu dengan stok 0 ke keranjang', () => {
    const res = useCartStore.getState().addItem(dummyMenu2, 1)
    expect(res.success).toBe(false)
    expect(res.reason).toContain('habis')

    const items = useCartStore.getState().items
    expect(items).toHaveLength(0)
    expect(useCartStore.getState().totalItems()).toBe(0)
  })

  it('gagal menambahkan menu yang berstatus non-aktif', () => {
    const res = useCartStore.getState().addItem(dummyMenuNonaktif, 1)
    expect(res.success).toBe(false)
    expect(res.reason).toContain('tidak aktif')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('membatasi kuantitas keranjang tidak melebihi stok yang tersedia', () => {
    // Menu 3 hanya punya stok 2
    useCartStore.getState().addItem(dummyMenu3, 1)
    expect(useCartStore.getState().getItemQty(3)).toBe(1)

    // Tambah 1 lagi -> qty jadi 2 (maksimal)
    const res2 = useCartStore.getState().addItem(dummyMenu3, 1)
    expect(res2.success).toBe(true)
    expect(useCartStore.getState().getItemQty(3)).toBe(2)

    // Coba tambah lagi saat sudah di batas maksimal
    const res3 = useCartStore.getState().addItem(dummyMenu3, 1)
    expect(res3.success).toBe(false)
    expect(useCartStore.getState().getItemQty(3)).toBe(2)

    // Coba panggil incrementQty saat sudah di batas maksimal
    useCartStore.getState().incrementQty(3)
    expect(useCartStore.getState().getItemQty(3)).toBe(2)
  })

  it('dapat melakukan increment dan decrement qty serta auto-remove bila qty mencapai 0', () => {
    useCartStore.getState().addItem(dummyMenu1, 2)
    expect(useCartStore.getState().getItemQty(1)).toBe(2)
    expect(useCartStore.getState().totalHarga()).toBe(24000)

    useCartStore.getState().incrementQty(1)
    expect(useCartStore.getState().getItemQty(1)).toBe(3)
    expect(useCartStore.getState().totalHarga()).toBe(36000)

    useCartStore.getState().decrementQty(1)
    expect(useCartStore.getState().getItemQty(1)).toBe(2)
    expect(useCartStore.getState().totalHarga()).toBe(24000)

    useCartStore.getState().decrementQty(1)
    expect(useCartStore.getState().getItemQty(1)).toBe(1)

    // Decrement saat qty = 1 akan menghapus item dari keranjang
    useCartStore.getState().decrementQty(1)
    expect(useCartStore.getState().getItemQty(1)).toBe(0)
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().totalHarga()).toBe(0)
  })

  it('dapat menghapus item tertentu dengan removeItem dan mengosongkan seluruh keranjang dengan clearCart', () => {
    useCartStore.getState().addItem(dummyMenu1, 1)
    useCartStore.getState().addItem(dummyMenu3, 2)
    expect(useCartStore.getState().items).toHaveLength(2)
    expect(useCartStore.getState().totalItems()).toBe(3)

    // Hapus menu 1
    useCartStore.getState().removeItem(1)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().getItemQty(1)).toBe(0)
    expect(useCartStore.getState().getItemQty(3)).toBe(2)

    // Clear cart
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().totalItems()).toBe(0)
    expect(useCartStore.getState().totalHarga()).toBe(0)
  })

  it('menghitung total harga dan subtotal secara presisi tanpa floating point error', () => {
    // 3 x dummyMenu1 (12.000) = 36.000
    // 2 x dummyMenu3 (3.500) = 7.000
    // Total = 43.000
    useCartStore.getState().addItem(dummyMenu1, 3)
    useCartStore.getState().addItem(dummyMenu3, 2)

    expect(useCartStore.getState().items[0].subtotal).toBe(36000)
    expect(useCartStore.getState().items[1].subtotal).toBe(7000)
    expect(useCartStore.getState().totalHarga()).toBe(43000)
    expect(Number.isInteger(useCartStore.getState().totalHarga())).toBe(true)
  })

  it('mengosongkan keranjang saat pemilik kasir atau sesi kasir berubah (issue #143)', () => {
    // Set pemilik kasir1 dengan sesi 101
    useCartStore.getState().setCartOwner({
      kasirId: 1,
      sesiKasirId: 101,
      titikKasirId: 1,
    })

    useCartStore.getState().addItem(dummyMenu1, 2)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().kasirId).toBe(1)
    expect(useCartStore.getState().sesiKasirId).toBe(101)

    // Set pemilik yang sama tidak mengosongkan keranjang
    useCartStore.getState().setCartOwner({
      kasirId: 1,
      sesiKasirId: 101,
    })
    expect(useCartStore.getState().items).toHaveLength(1)

    // Ganti kasir ke kasir 2 -> keranjang otomatis dikosongkan
    useCartStore.getState().setCartOwner({
      kasirId: 2,
      sesiKasirId: 102,
    })
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().kasirId).toBe(2)
    expect(useCartStore.getState().sesiKasirId).toBe(102)

    // Tambah item lagi untuk kasir 2
    useCartStore.getState().addItem(dummyMenu3, 1)
    expect(useCartStore.getState().items).toHaveLength(1)

    // clearCart mereset items dan owner
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().kasirId).toBeNull()
    expect(useCartStore.getState().sesiKasirId).toBeNull()
  })
})
