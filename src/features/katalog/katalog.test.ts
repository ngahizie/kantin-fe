import { describe, it, expect } from 'vitest'
import {
  kategoriFormSchema,
  menuFormSchema,
} from './types'

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
