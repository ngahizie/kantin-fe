import { describe, it, expect } from 'vitest'
import { barangMasukFormSchema, barangMasukPembalikSchema } from '../types'

describe('Validasi Zod Form Barang Masuk & Pembalik', () => {
  it('berhasil memvalidasi form barang masuk yang benar', () => {
    const valid = {
      tanggal: '2026-10-06',
      referensiId: 'BM-20261006-0001',
      namaPemasok: 'PT Sumber Pangan Sejahtera',
      items: [
        {
          menuId: 1,
          qty: 20,
          hargaBeliPerUnit: 4000,
        },
      ],
    }
    const result = barangMasukFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('gagal jika form barang masuk tanpa item barang', () => {
    const invalid = {
      tanggal: '2026-10-06',
      referensiId: 'BM-001',
      items: [],
    }
    const result = barangMasukFormSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('berhasil memvalidasi form pembalik dengan alasan wajib', () => {
    const valid = {
      mutasiId: 12,
      qty: 5,
      alasan: 'Salah input jumlah stok saat penerimaan',
      referensiId: 'BMP-20261006-0001',
    }
    const result = barangMasukPembalikSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('gagal memvalidasi form pembalik jika alasan kosong', () => {
    const invalid = {
      mutasiId: 12,
      qty: 5,
      alasan: '  ',
      referensiId: 'BMP-20261006-0001',
    }
    const result = barangMasukPembalikSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
