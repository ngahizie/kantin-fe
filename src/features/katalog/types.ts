import { z } from 'zod'

export type SatuanType = 'PCS' | 'PORSI' | 'BOTOL'

export interface KategoriItem {
  id: number
  sekolahId?: number
  nama: string
  urutan: number
  isActive?: boolean
  aktif?: boolean
  jumlahItem?: number
  createdAt?: string
  updatedAt?: string
}

export interface MenuItem {
  id: number
  kategoriId: number | null
  nama: string
  hargaJual: number
  satuan: SatuanType | string
  fotoUrl?: string | null
  stokMinimum: number
  stokBerjalan: number
  aktif: boolean
}

export const kategoriFormSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(1, 'Nama kategori wajib diisi')
    .max(100, 'Nama kategori maksimal 100 karakter'),
  urutan: z.number().int().min(0, 'Urutan minimal 0'),
  aktif: z.boolean(),
})

export type KategoriFormValues = z.infer<typeof kategoriFormSchema>

export const menuFormSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(1, 'Nama menu wajib diisi')
    .max(150, 'Nama menu maksimal 150 karakter'),
  kategoriId: z.number().min(1, 'Pilih kategori menu'),
  hargaJual: z
    .number()
    .int('Harga jual harus berupa bilangan bulat rupiah')
    .min(0, 'Harga jual tidak boleh negatif'),
  satuan: z.enum(['PCS', 'PORSI', 'BOTOL'] as const, {
    message: 'Pilih satuan menu (PCS, PORSI, atau BOTOL)',
  }),
  stokMinimum: z
    .number()
    .int('Stok minimum harus berupa bilangan bulat')
    .min(0, 'Stok minimum tidak boleh negatif'),
  fotoUrl: z.string().max(500, 'URL foto maksimal 500 karakter').optional().or(z.literal('')),
  aktif: z.boolean(),
})

export type MenuFormValues = z.infer<typeof menuFormSchema>

export interface UploadResponseData {
  path: string
  url: string
  namaAsli: string
  ukuran: number
}
