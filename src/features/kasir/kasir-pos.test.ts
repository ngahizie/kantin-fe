import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import apiClient from '@/lib/api-client'
import { useCartStore } from '@/stores/useCartStore'
import { kasirApi } from './api/kasir-api'
import type { MenuItem } from '@/features/katalog/types'

const mockMenus: MenuItem[] = [
  {
    id: 1,
    kategoriId: 1,
    nama: 'Nasi Uduk Komplit',
    hargaJual: 12000,
    satuan: 'PORSI',
    fotoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    stokMinimum: 5,
    stokBerjalan: 25,
    aktif: true,
  },
  {
    id: 2,
    kategoriId: 1,
    nama: 'Nasi Goreng Ayam',
    hargaJual: 15000,
    satuan: 'PORSI',
    fotoUrl:
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
    stokMinimum: 5,
    stokBerjalan: 18,
    aktif: true,
  },
  {
    id: 3,
    kategoriId: 1,
    nama: 'Mie Goreng Spesial',
    hargaJual: 10000,
    satuan: 'PORSI',
    fotoUrl: null,
    stokMinimum: 5,
    stokBerjalan: 0, // Stok habis
    aktif: true,
  },
  {
    id: 5,
    kategoriId: 2,
    nama: 'Roti Cokelat Keju',
    hargaJual: 5000,
    satuan: 'PCS',
    fotoUrl: null,
    stokMinimum: 8,
    stokBerjalan: 30,
    aktif: true,
  },
  {
    id: 9,
    kategoriId: 3,
    nama: 'Es Teh Manis',
    hargaJual: 4000,
    satuan: 'CUP',
    fotoUrl: null,
    stokMinimum: 10,
    stokBerjalan: 40,
    aktif: true,
  },
  {
    id: 99,
    kategoriId: 1,
    nama: 'Menu Kadaluarsa Nonaktif',
    hargaJual: 10000,
    satuan: 'PORSI',
    stokMinimum: 2,
    stokBerjalan: 5,
    aktif: false, // Tidak aktif
  },
]

describe('Katalog Menu POS Filtering & Business Logic', () => {
  it('hanya menyaring menu yang berstatus aktif', () => {
    const activeMenus = mockMenus.filter((m) => m.aktif)
    expect(activeMenus).toHaveLength(5)
    expect(activeMenus.some((m) => m.id === 99)).toBe(false)
  })

  it('menyaring menu berdasarkan kategori secara akurat', () => {
    const makananBerat = mockMenus.filter((m) => m.aktif && m.kategoriId === 1)
    expect(makananBerat).toHaveLength(3)
    expect(makananBerat.map((m) => m.nama)).toEqual([
      'Nasi Uduk Komplit',
      'Nasi Goreng Ayam',
      'Mie Goreng Spesial',
    ])

    const minuman = mockMenus.filter((m) => m.aktif && m.kategoriId === 3)
    expect(minuman).toHaveLength(1)
    expect(minuman[0].nama).toBe('Es Teh Manis')
  })

  it('melakukan pencarian menu secara case-insensitive', () => {
    const query = 'gOrEnG'
    const results = mockMenus.filter(
      (m) => m.aktif && m.nama.toLowerCase().includes(query.toLowerCase())
    )
    expect(results).toHaveLength(2)
    expect(results.map((m) => m.id)).toEqual([2, 3])
  })

  it('menghitung jumlah item aktif per kategori dengan benar', () => {
    const categoryCountMap = new Map<number, number>()
    mockMenus.forEach((m) => {
      if (m.aktif && m.kategoriId) {
        categoryCountMap.set(
          m.kategoriId,
          (categoryCountMap.get(m.kategoriId) || 0) + 1
        )
      }
    })

    expect(categoryCountMap.get(1)).toBe(3) // Nasi Uduk, Nasi Goreng, Mie Goreng (menu 99 nonaktif diabaikan)
    expect(categoryCountMap.get(2)).toBe(1) // Roti Cokelat Keju
    expect(categoryCountMap.get(3)).toBe(1) // Es Teh Manis
  })
})

describe('Integrasi Keranjang Kasir POS & Aturan Stok', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart()
  })

  it('menolak menambahkan menu dengan stok 0 ke keranjang', () => {
    const menuHabis = mockMenus.find((m) => m.id === 3)!
    expect(menuHabis.stokBerjalan).toBe(0)

    const res = useCartStore.getState().addItem(menuHabis, 1)
    expect(res.success).toBe(false)
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().totalItems()).toBe(0)
  })

  it('menolak menambahkan menu yang tidak aktif', () => {
    const menuNonaktif = mockMenus.find((m) => m.id === 99)!
    const res = useCartStore.getState().addItem(menuNonaktif, 1)
    expect(res.success).toBe(false)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('menghitung total belanja dengan presisi integer rupiah', () => {
    const menuNasi = mockMenus.find((m) => m.id === 1)! // 12000
    const menuRoti = mockMenus.find((m) => m.id === 5)! // 5000
    const menuTeh = mockMenus.find((m) => m.id === 9)! // 4000

    useCartStore.getState().addItem(menuNasi, 2) // 24000
    useCartStore.getState().addItem(menuRoti, 3) // 15000
    useCartStore.getState().addItem(menuTeh, 4) // 16000

    expect(useCartStore.getState().totalItems()).toBe(9)
    // 24000 + 15000 + 16000 = 55000
    expect(useCartStore.getState().totalHarga()).toBe(55000)
    expect(Number.isInteger(useCartStore.getState().totalHarga())).toBe(true)
  })

  it('membatasi increment kuantitas tidak melebihi stok tersedia', () => {
    const menuLimited: MenuItem = {
      id: 100,
      kategoriId: 1,
      nama: 'Paket Terbatas',
      hargaJual: 20000,
      satuan: 'PORSI',
      stokMinimum: 1,
      stokBerjalan: 2, // hanya 2 porsi
      aktif: true,
    }

    useCartStore.getState().addItem(menuLimited, 2)
    expect(useCartStore.getState().getItemQty(100)).toBe(2)

    // Coba increment melebihi stok
    useCartStore.getState().incrementQty(100)
    expect(useCartStore.getState().getItemQty(100)).toBe(2)
  })
})

describe('Fitur Cek Saldo Siswa', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('berhasil menemukan data siswa dan sisa saldo berdasarkan RFID UID', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/siswa') {
        return {
          data: {
            data: [
              {
                siswaId: 1,
                nis: '2026001',
                nama: 'Budi Santoso',
                kelas: 'X IPA 1',
                rfidUid: '04A1B2C3D4',
                saldo: 50000,
              },
            ],
          },
        }
      }
      if (url === '/api/saldo') {
        return { data: { data: { saldo: 55000 } } }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    const res = await kasirApi.cekSaldo('04A1B2C3D4')
    expect(res.nama).toBe('Budi Santoso')
    expect(res.nis).toBe('2026001')
    expect(res.kelas).toBe('X IPA 1')
    expect(res.saldo).toBe(55000)
    expect(res.status).toBe('ACTIVE')
    expect(getSpy).toHaveBeenCalledWith(
      '/api/saldo',
      expect.objectContaining({ params: { siswaId: 1 } })
    )
  })

  it('berhasil menemukan data siswa dan sisa saldo berdasarkan NIS', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/siswa') {
        return {
          data: {
            data: [
              {
                siswaId: 2,
                nis: '2026002',
                nama: 'Siti Rahmawati',
                kelas: 'XI IPS 2',
                saldo: 75000,
              },
            ],
          },
        }
      }
      if (url === '/api/saldo') {
        return { data: { data: { saldo: 75000 } } }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    const res = await kasirApi.cekSaldo('2026002')
    expect(res.nama).toBe('Siti Rahmawati')
    expect(res.nis).toBe('2026002')
    expect(res.kelas).toBe('XI IPS 2')
    expect(res.saldo).toBe(75000)
  })

  it('menolak pencarian dengan melempar error saat UID atau NIS siswa tidak terdaftar', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: [] } })

    await expect(kasirApi.cekSaldo('INVALID_UID_99999')).rejects.toThrow(
      'Kartu atau siswa tidak ditemukan'
    )
  })
})

