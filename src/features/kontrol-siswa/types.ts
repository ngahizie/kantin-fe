import { z } from 'zod'
import type { KartuSiswaMock, MenuItemMock, KategoriMock } from '@/types/kantin'

export type { KartuSiswaMock, MenuItemMock, KategoriMock }

export const MAX_ALASAN_BLOKIR_LENGTH = 500
export const MIN_LIMIT_HARIAN = 5000
export const MAX_LIMIT_HARIAN = 100_000_000

export const kontrolSiswaFormSchema = z.object({
  siswaId: z.number().int().positive('ID siswa tidak valid'),
  limitHarianEnabled: z.boolean(),
  limitHarian: z
    .number()
    .int('Nominal limit harus bilangan bulat')
    .min(0, 'Nominal limit tidak boleh negatif')
    .max(MAX_LIMIT_HARIAN, `Nominal limit maksimal Rp ${MAX_LIMIT_HARIAN.toLocaleString('id-ID')}`),
  blockedCategories: z.array(z.number().int()),
  blockedItems: z.array(z.number().int()),
  isBlocked: z.boolean().optional(),
  alasanBlokir: z
    .string()
    .trim()
    .max(MAX_ALASAN_BLOKIR_LENGTH, `Alasan pemblokiran maksimal ${MAX_ALASAN_BLOKIR_LENGTH} karakter`)
    .optional(),
  catatanKontrol: z
    .string()
    .trim()
    .max(255, 'Catatan kontrol maksimal 255 karakter')
    .optional(),
}).refine(
  (data) => {
    if (data.limitHarianEnabled) {
      return data.limitHarian >= MIN_LIMIT_HARIAN
    }
    return true
  },
  {
    message: 'Jika limit aktif, nominal minimum adalah Rp 5.000',
    path: ['limitHarian'],
  }
)

export type KontrolSiswaFormValues = z.infer<typeof kontrolSiswaFormSchema>

export interface StudentControlDTO {
  siswa_id: number
  nis: string
  nama: string
  kelas: string
  foto_url: string
  saldo: number
  limit_harian: number
  limit_harian_enabled?: boolean
  belanja_hari_ini: number
  is_blocked: boolean
  blocked_items?: number[]
  blocked_categories?: number[]
  parent_name?: string
  parent_phone?: string
  parent_app_registered?: boolean
  catatan_kontrol?: string
  updated_at?: string
}
