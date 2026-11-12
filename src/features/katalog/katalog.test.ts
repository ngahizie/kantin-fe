import { describe, it, expect, beforeAll } from 'vitest'
import { setupMockAdapter } from '@/mocks/mock-adapter'
import { apiClient } from '@/lib/api-client'
import { katalogApi } from './api/katalog-api'
import {
  kategoriFormSchema,
  menuFormSchema,
  type KategoriItem,
  type MenuItem,
} from './types'
import {
  MENU_AUTO_REFRESH_INTERVAL_MS,
  matchesMenuSearchQuery,
  mergeKategoriMenuCounts,
  shouldPauseMenuAutoRefresh,
  sortMenusNewestFirst,
} from './menu-utils'

describe('Katalog Kategori Zod Validation Schema', () => {
  it('berhasil memvalidasi nama kategori yang valid', () => {
    const validData = {
      nama: 'Makanan Ringan & Snack',
      urutan: 1,
      aktif: true,
    }
    const result = kategoriFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nama).toBe('Makanan Ringan & Snack')
      expect(result.data.urutan).toBe(1)
      expect(result.data.aktif).toBe(true)
    }
  })

  it('gagal jika nama kategori kosong', () => {
    const invalidData = {
      nama: '   ',
      urutan: 0,
      aktif: true,
    }
    const result = kategoriFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Nama kategori wajib diisi')
    }
  })

  it('gagal jika nama kategori melebihi 100 karakter', () => {
    const invalidData = {
      nama: 'A'.repeat(101),
      urutan: 0,
      aktif: true,
    }
    const result = kategoriFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Nama kategori maksimal 100 karakter')
    }
  })

  it('mendukung status aktif pada form kategori untuk reaktivasi', () => {
    const nonaktifData = {
      nama: 'Kategori Lama',
      urutan: 5,
      aktif: false,
    }
    const parsedNonaktif = kategoriFormSchema.safeParse(nonaktifData)
    expect(parsedNonaktif.success).toBe(true)
    if (parsedNonaktif.success) {
      expect(parsedNonaktif.data.aktif).toBe(false)
    }

    const reaktifData = {
      nama: 'Kategori Lama',
      urutan: 5,
      aktif: true,
    }
    const parsedReaktif = kategoriFormSchema.safeParse(reaktifData)
    expect(parsedReaktif.success).toBe(true)
    if (parsedReaktif.success) {
      expect(parsedReaktif.data.aktif).toBe(true)
    }
  })
})

describe('Katalog Menu Zod Validation Schema', () => {
  it('berhasil memvalidasi payload menu dengan harga jual integer rupiah', () => {
    const validData = {
      nama: 'Nasi Kuning Komplit',
      kategoriId: 1,
      hargaJual: 15000,
      satuan: 'PORSI',
      stokMinimum: 5,
      fotoUrl: 'https://images.unsplash.com/photo-1',
      aktif: true,
    }
    const result = menuFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hargaJual).toBe(15000)
      expect(Number.isInteger(result.data.hargaJual)).toBe(true)
      expect(result.data.satuan).toBe('PORSI')
    }
  })

  it('gagal jika harga jual bernilai float / bukan integer rupiah', () => {
    const invalidData = {
      nama: 'Nasi Kuning Komplit',
      kategoriId: 1,
      hargaJual: 15000.75, // float tidak diperbolehkan
      satuan: 'PORSI',
      stokMinimum: 5,
    }
    const result = menuFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Harga jual harus berupa bilangan bulat rupiah')
    }
  })

  it('gagal jika harga jual bernilai negatif', () => {
    const invalidData = {
      nama: 'Nasi Kuning',
      kategoriId: 1,
      hargaJual: -5000,
      satuan: 'PORSI',
    }
    const result = menuFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('gagal jika satuan tidak sesuai enum (PCS/PORSI/BOTOL)', () => {
    const invalidData = {
      nama: 'Jus Alpukat',
      kategoriId: 2,
      hargaJual: 8000,
      satuan: 'LITER', // tidak ada di enum
    }
    const result = menuFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('berhasil memvalidasi payload menu minimal dengan stokMinimum 0 dan aktif true', () => {
    const minimalData = {
      nama: 'Air Putih',
      kategoriId: 3,
      hargaJual: 3000,
      satuan: 'BOTOL',
      stokMinimum: 0,
      aktif: true,
    }
    const result = menuFormSchema.safeParse(minimalData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stokMinimum).toBe(0)
      expect(result.data.aktif).toBe(true)
      expect(result.data.fotoUrl).toBeUndefined()
    }
  })

  it('mendukung status aktif boolean untuk reaktivasi menu yang nonaktif', () => {
    const nonaktifMenu = {
      nama: 'Menu Diarsipkan',
      kategoriId: 1,
      hargaJual: 5000,
      satuan: 'PCS',
      stokMinimum: 2,
      aktif: false,
    }
    const res1 = menuFormSchema.safeParse(nonaktifMenu)
    expect(res1.success).toBe(true)
    if (res1.success) {
      expect(res1.data.aktif).toBe(false)
    }

    const reaktifMenu = {
      ...nonaktifMenu,
      aktif: true,
    }
    const res2 = menuFormSchema.safeParse(reaktifMenu)
    expect(res2.success).toBe(true)
    if (res2.success) {
      expect(res2.data.aktif).toBe(true)
    }
  })
})
describe('Ekstraksi Pesan Error Respons Backend (Issue #110)', () => {
  it('memprioritaskan response.data.message spesifik dari server dibanding pesan Axios generik', () => {
    const errorWithResponse = {
      response: {
        data: {
          message: 'Gagal mengunggah berkas ke penyimpanan. Periksa konfigurasi MinIO atau coba lagi.',
        },
      },
      message: 'Request failed with status code 400',
    }

    const error = errorWithResponse as {
      response?: { data?: { message?: string } }
      message?: string
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      'Gagal mengunggah foto produk'

    expect(message).toBe(
      'Gagal mengunggah berkas ke penyimpanan. Periksa konfigurasi MinIO atau coba lagi.'
    )
  })

  it('menggunakan fallback error.message jika respons server tidak memiliki pesan spesifik', () => {
    const errorWithoutServerMsg = {
      response: { data: {} },
      message: 'Network Error',
    }

    const error = errorWithoutServerMsg as {
      response?: { data?: { message?: string } }
      message?: string
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      'Gagal mengunggah foto produk'

    expect(message).toBe('Network Error')
  })

  it('menggunakan pesan default jika error kosong', () => {
    const emptyError = {}

    const error = emptyError as {
      response?: { data?: { message?: string } }
      message?: string
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      'Gagal mengunggah foto produk'

    expect(message).toBe('Gagal mengunggah foto produk')
  })
})

describe('sortMenusNewestFirst', () => {
  const makeMenu = (id: number, nama: string): MenuItem => ({
    id,
    kategoriId: 1,
    nama,
    hargaJual: 10000,
    satuan: 'PCS',
    stokMinimum: 5,
    stokBerjalan: 10,
    aktif: true,
  })

  it('menempatkan menu baru dengan id lebih besar di posisi paling atas meski namanya berada di belakang secara alfabetis', () => {
    const input = [
      makeMenu(10, 'Ayam Goreng'),
      makeMenu(25, 'Bakso Urat'),
      makeMenu(1794362846000, 'Zebra Cake'),
    ]

    const sorted = sortMenusNewestFirst(input)
    expect(sorted.map((item) => item.nama)).toEqual([
      'Zebra Cake',
      'Bakso Urat',
      'Ayam Goreng',
    ])
  })

  it('mengurutkan alfabetis bila id bernilai sama tanpa memutasi array asal', () => {
    const input = [makeMenu(5, 'Teh Manis'), makeMenu(5, 'Air Mineral')]
    const sorted = sortMenusNewestFirst(input)

    expect(sorted.map((item) => item.nama)).toEqual(['Air Mineral', 'Teh Manis'])
    expect(input.map((item) => item.nama)).toEqual(['Teh Manis', 'Air Mineral'])
  })
})

describe('Katalog Menu API Toggle Status & Hapus Menu', () => {
  beforeAll(() => {
    setupMockAdapter(apiClient)
  })

  it('dapat menonaktifkan dan mengaktifkan kembali menu via updateMenu serta menghapus menu dari daftar', async () => {
    const created = await katalogApi.createMenu({
      nama: 'Pastel Ayam Uji',
      kategoriId: 1,
      hargaJual: 4000,
      satuan: 'PCS',
      stokMinimum: 5,
      fotoUrl: '',
      aktif: true,
    })

    const deactivated = await katalogApi.updateMenu(created.id, {
      nama: created.nama,
      kategoriId: created.kategoriId,
      hargaJual: created.hargaJual,
      satuan: created.satuan,
      stokMinimum: created.stokMinimum,
      fotoUrl: '',
      aktif: false,
    })
    expect(deactivated.aktif).toBe(false)

    const reactivated = await katalogApi.updateMenu(created.id, {
      nama: created.nama,
      kategoriId: created.kategoriId,
      hargaJual: created.hargaJual,
      satuan: created.satuan,
      stokMinimum: created.stokMinimum,
      fotoUrl: '',
      aktif: true,
    })
    expect(reactivated.aktif).toBe(true)

    await katalogApi.deleteMenu(created.id)
    const listAfterDelete = await katalogApi.getMenuList(undefined, false)
    expect(listAfterDelete.some((m) => m.id === created.id)).toBe(false)
  })
})

describe('Katalog Menu Auto-Refresh Guard & Formatting', () => {
  it('menjadwalkan auto-refresh tiap 30 detik dan hanya berjalan saat aktif & tidak ada dialog/aksi', () => {
    expect(MENU_AUTO_REFRESH_INTERVAL_MS).toBe(30_000)

    const baseState = {
      autoRefreshEnabled: true,
      isModalOpen: false,
      hasDeleteTarget: false,
      isDeleting: false,
      togglingId: null,
      isDocumentHidden: false,
    }

    expect(shouldPauseMenuAutoRefresh(baseState)).toBe(false)
    expect(shouldPauseMenuAutoRefresh({ ...baseState, autoRefreshEnabled: false })).toBe(true)
    expect(shouldPauseMenuAutoRefresh({ ...baseState, isModalOpen: true })).toBe(true)
    expect(shouldPauseMenuAutoRefresh({ ...baseState, hasDeleteTarget: true })).toBe(true)
    expect(shouldPauseMenuAutoRefresh({ ...baseState, isDeleting: true })).toBe(true)
    expect(shouldPauseMenuAutoRefresh({ ...baseState, togglingId: 12 })).toBe(true)
    expect(shouldPauseMenuAutoRefresh({ ...baseState, isDocumentHidden: true })).toBe(true)
  })
})

describe('Katalog Menu Kode Barcode — Validasi, Pencarian, & API', () => {
  beforeAll(() => {
    setupMockAdapter(apiClient)
  })

  it('menerima kodeBarcode opsional pada schema form dan menolak bila > 64 karakter', () => {
    const valid = menuFormSchema.safeParse({
      nama: 'Teh Botol',
      kodeBarcode: ' 8996001300112 ',
      kategoriId: 1,
      hargaJual: 4500,
      satuan: 'BOTOL',
      stokMinimum: 5,
      fotoUrl: '',
      aktif: true,
    })
    expect(valid.success).toBe(true)
    if (valid.success) {
      expect(valid.data.kodeBarcode).toBe('8996001300112')
    }

    const empty = menuFormSchema.safeParse({
      nama: 'Nasi Goreng',
      kodeBarcode: '',
      kategoriId: 1,
      hargaJual: 15000,
      satuan: 'PORSI',
      stokMinimum: 5,
      fotoUrl: '',
      aktif: true,
    })
    expect(empty.success).toBe(true)

    const tooLong = menuFormSchema.safeParse({
      nama: 'Teh Botol',
      kodeBarcode: 'B'.repeat(65),
      kategoriId: 1,
      hargaJual: 4500,
      satuan: 'BOTOL',
      stokMinimum: 5,
      fotoUrl: '',
      aktif: true,
    })
    expect(tooLong.success).toBe(false)
  })

  it('mencocokkan pencarian berdasarkan nama menu maupun kode barcode', () => {
    const item = { nama: 'Teh Botol Sosro', kodeBarcode: '8996001300112' }
    expect(matchesMenuSearchQuery(item, 'teh botol')).toBe(true)
    expect(matchesMenuSearchQuery(item, '8996001300112')).toBe(true)
    expect(matchesMenuSearchQuery(item, '1300112')).toBe(true)
    expect(matchesMenuSearchQuery({ nama: 'Gorengan', kodeBarcode: null }, '8996')).toBe(false)
    expect(matchesMenuSearchQuery({ nama: 'Gorengan', kodeBarcode: null }, 'goreng')).toBe(true)
  })

  it('menyimpan, menolak duplikat, dan mengosongkan kodeBarcode lewat katalogApi', async () => {
    const created = await katalogApi.createMenu({
      nama: 'Susu Kotak Uji',
      kodeBarcode: '8990001112223',
      kategoriId: 1,
      hargaJual: 5000,
      satuan: 'PCS',
      stokMinimum: 5,
      fotoUrl: '',
      aktif: true,
    })
    expect(created.kodeBarcode).toBe('8990001112223')

    await expect(
      katalogApi.createMenu({
        nama: 'Susu Duplikat',
        kodeBarcode: '8990001112223',
        kategoriId: 1,
        hargaJual: 5500,
        satuan: 'PCS',
        stokMinimum: 5,
        fotoUrl: '',
        aktif: true,
      })
    ).rejects.toThrow()

    const cleared = await katalogApi.updateMenu(created.id, {
      nama: created.nama,
      kodeBarcode: '',
      kategoriId: created.kategoriId,
      hargaJual: created.hargaJual,
      satuan: created.satuan,
      stokMinimum: created.stokMinimum,
      fotoUrl: '',
      aktif: true,
    })
    expect(cleared.kodeBarcode).toBeNull()

    await katalogApi.deleteMenu(created.id)
  })
})

describe('mergeKategoriMenuCounts', () => {
  it('menghitung jumlah menu terkait per kategori saat BE tidak mengirim jumlahItem', () => {
    const kategoris: KategoriItem[] = [
      { id: 1, nama: 'Makanan', urutan: 1, isActive: true },
      { id: 2, nama: 'Minuman', urutan: 2, isActive: true },
      { id: 3, nama: 'Snack', urutan: 3, isActive: false },
    ]
    const menus = [
      { kategoriId: 1 },
      { kategoriId: 1 },
      { kategoriId: 2 },
      { kategoriId: null },
    ]

    const result = mergeKategoriMenuCounts(kategoris, menus)
    expect(result.map((k) => ({ id: k.id, jumlahItem: k.jumlahItem }))).toEqual([
      { id: 1, jumlahItem: 2 },
      { id: 2, jumlahItem: 1 },
      { id: 3, jumlahItem: 0 },
    ])
  })

  it('mempertahankan data kategori apa adanya bila daftar menu gagal dimuat (null)', () => {
    const kategoris: KategoriItem[] = [
      { id: 1, nama: 'Makanan', urutan: 1, isActive: true, jumlahItem: 4 },
    ]

    expect(mergeKategoriMenuCounts(kategoris, null)).toEqual(kategoris)
  })
})
