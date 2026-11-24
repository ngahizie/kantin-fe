import { z } from 'zod'

export type HubunganWali = 'AYAH' | 'IBU' | 'WALI'

export interface SiswaManajemenItem {
  siswaId: number
  nis: string
  nisn?: string | null
  nama: string
  kelas?: string | null
  fotoUrl?: string | null
  aktif: boolean
  saldo: number
  rfidUid?: string | null
  nomorKartu?: string | null
  namaOrangTua?: string | null
  teleponOrangTua?: string | null
  hubunganOrangTua?: string | null
  updatedAt?: string | null
}

export interface SimpanSiswaAdminPayload {
  nis: string
  nisn?: string
  nama: string
  kelas?: string
  fotoUrl?: string
  rfidUid?: string
  nomorKartu?: string
  namaOrangTua?: string
  teleponOrangTua?: string
  hubunganOrangTua?: string
}

export interface PasangKartuPayload {
  rfidUid?: string
  nomorKartu?: string
  nonaktifkanKartu?: boolean
}

export interface DaftarSiswaAdminParams {
  q?: string
  aktif?: boolean
  punyaKartu?: boolean
  limit?: number
}

const FOTO_URL_REGEX = /^(https?:\/\/|\/api\/storage\/file\?path=|sekolah-[0-9]+\/).*$/i
const RFID_UID_REGEX = /^[A-Za-z0-9_-]{4,50}$/

export const siswaFormSchema = z
  .object({
    nis: z
      .string()
      .trim()
      .min(1, 'NIS wajib diisi')
      .max(30, 'NIS maksimal 30 karakter'),
    nisn: z
      .string()
      .trim()
      .max(30, 'NISN maksimal 30 karakter')
      .optional()
      .or(z.literal('')),
    nama: z
      .string()
      .trim()
      .min(1, 'Nama siswa wajib diisi')
      .max(100, 'Nama siswa maksimal 100 karakter'),
    kelas: z
      .string()
      .trim()
      .max(30, 'Kelas maksimal 30 karakter')
      .optional()
      .or(z.literal('')),
    fotoUrl: z
      .string()
      .trim()
      .max(255, 'URL foto maksimal 255 karakter')
      .refine((val) => !val || FOTO_URL_REGEX.test(val), {
        message: 'URL foto harus berupa http(s) atau path storage yang valid',
      })
      .optional()
      .or(z.literal('')),
    rfidUid: z
      .string()
      .trim()
      .refine((val) => !val || RFID_UID_REGEX.test(val), {
        message: "UID RFID 4-50 karakter (huruf, angka, '-', '_')",
      })
      .optional()
      .or(z.literal('')),
    nomorKartu: z
      .string()
      .trim()
      .max(32, 'Nomor kartu maksimal 32 karakter')
      .optional()
      .or(z.literal('')),
    namaOrangTua: z
      .string()
      .trim()
      .max(100, 'Nama orang tua/wali maksimal 100 karakter')
      .optional()
      .or(z.literal('')),
    teleponOrangTua: z
      .string()
      .trim()
      .max(30, 'Telepon orang tua/wali maksimal 30 karakter')
      .optional()
      .or(z.literal('')),
    hubunganOrangTua: z
      .enum(['', 'AYAH', 'IBU', 'WALI'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.nomorKartu?.trim() && !data.rfidUid?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rfidUid'],
        message: 'UID RFID wajib diisi jika nomor kartu disertakan',
      })
    }
    if ((data.teleponOrangTua?.trim() || data.hubunganOrangTua?.trim()) && !data.namaOrangTua?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['namaOrangTua'],
        message: 'Nama orang tua/wali wajib diisi jika data wali disertakan',
      })
    }
  })

export type SiswaFormValues = z.infer<typeof siswaFormSchema>

export const pasangKartuSchema = z.object({
  rfidUid: z
    .string()
    .trim()
    .min(4, 'UID RFID minimal 4 karakter')
    .max(50, 'UID RFID maksimal 50 karakter')
    .regex(RFID_UID_REGEX, "UID RFID hanya boleh huruf, angka, '-', atau '_'"),
  nomorKartu: z
    .string()
    .trim()
    .max(32, 'Nomor kartu maksimal 32 karakter')
    .optional()
    .or(z.literal('')),
})

export type PasangKartuFormValues = z.infer<typeof pasangKartuSchema>
