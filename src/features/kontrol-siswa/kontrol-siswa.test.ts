import { describe, it, expect } from 'vitest'
import {
  kontrolSiswaFormSchema,
  MAX_ALASAN_BLOKIR_LENGTH,
  MIN_LIMIT_HARIAN,
  MAX_LIMIT_HARIAN,
} from './types'

describe('Kontrol Siswa Zod Validation Schema', () => {
  it('berhasil memvalidasi konfigurasi tanpa limit harian', () => {
    const validData = {
      siswaId: 101,
      limitHarianEnabled: false,
      limitHarian: 0,
      blockedCategories: [3],
      blockedItems: [1, 2],
      catatanKontrol: 'Orang tua melarang jajan minuman dingin',
    }
    const result = kontrolSiswaFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limitHarianEnabled).toBe(false)
      expect(result.data.blockedCategories).toEqual([3])
      expect(result.data.blockedItems).toEqual([1, 2])
    }
  })

  it('berhasil memvalidasi konfigurasi dengan limit harian aktif valid (>= Rp 5.000)', () => {
    const validData = {
      siswaId: 102,
      limitHarianEnabled: true,
      limitHarian: 25000,
      blockedCategories: [],
      blockedItems: [9],
      catatanKontrol: 'Limit harian Rp 25.000',
    }
    const result = kontrolSiswaFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limitHarian).toBe(25000)
    }
  })

  it('gagal jika limit harian diaktifkan tetapi nominal di bawah Rp 5.000', () => {
    const invalidData = {
      siswaId: 102,
      limitHarianEnabled: true,
      limitHarian: 3000, // < 5000
      blockedCategories: [],
      blockedItems: [],
    }
    const result = kontrolSiswaFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('limitHarian'))
      expect(issue?.message).toContain('nominal minimum adalah Rp 5.000')
    }
  })

  it('gagal jika nominal limit negatif', () => {
    const invalidData = {
      siswaId: 101,
      limitHarianEnabled: false,
      limitHarian: -10000,
      blockedCategories: [],
      blockedItems: [],
    }
    const result = kontrolSiswaFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('gagal jika nominal limit harian melebihi batas wajar Rp 100.000.000', () => {
    const invalidData = {
      siswaId: 101,
      limitHarianEnabled: true,
      limitHarian: 100_000_001,
      blockedCategories: [],
      blockedItems: [],
    }
    const result = kontrolSiswaFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('limitHarian'))
      expect(issue?.message).toContain('Nominal limit maksimal')
    }
  })

  it('berhasil memvalidasi pemblokiran kartu dengan alasan valid <= 500 karakter', () => {
    const validData = {
      siswaId: 103,
      limitHarianEnabled: false,
      limitHarian: 0,
      blockedCategories: [],
      blockedItems: [],
      isBlocked: true,
      alasanBlokir: 'Kartu hilang saat jam istirahat kedua dan sedang dalam proses penggantian kartu baru.',
    }
    const result = kontrolSiswaFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isBlocked).toBe(true)
      expect(result.data.alasanBlokir).toBe(validData.alasanBlokir)
    }
  })

  it('gagal jika alasan pemblokiran kartu melebihi 500 karakter', () => {
    const invalidData = {
      siswaId: 103,
      limitHarianEnabled: false,
      limitHarian: 0,
      blockedCategories: [],
      blockedItems: [],
      isBlocked: true,
      alasanBlokir: 'A'.repeat(MAX_ALASAN_BLOKIR_LENGTH + 1),
    }
    const result = kontrolSiswaFormSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('alasanBlokir'))
      expect(issue?.message).toContain('maksimal 500 karakter')
    }
  })

  it('menyediakan konstanta batas keamanan yang konsisten', () => {
    expect(MAX_ALASAN_BLOKIR_LENGTH).toBe(500)
    expect(MIN_LIMIT_HARIAN).toBe(5000)
    expect(MAX_LIMIT_HARIAN).toBe(100_000_000)
  })
})
