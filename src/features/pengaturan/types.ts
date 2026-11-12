import { z } from 'zod'

export type KebijakanSaldoMengendap =
  | 'REFUND'
  | 'PINDAH_SAUDARA'
  | 'TETAP_MENGENDAP'

export interface PengaturanKantin {
  sekolahId?: number
  namaKantin: string
  jamTutupOtomatis: string
  konfirmasiManual: boolean
  durasiFotoDetik: number
  minTopup: number
  maksTopup: number
  batasSaldoSiswa: number
  kebijakanSaldoMengendap: KebijakanSaldoMengendap
  ambangHari: number
  disimpan?: boolean
  updatedAt?: string
  updatedBy?: string
}

export interface TitikKasir {
  id: number
  sekolahId: number
  nama: string
  kode: string
  aktif: boolean
  createdAt: string
  updatedAt: string
}

export const DEFAULT_PENGATURAN_KANTIN: PengaturanKantin = {
  sekolahId: 1,
  namaKantin: 'Kantin Sehat SKOOLIA',
  jamTutupOtomatis: '23:59',
  konfirmasiManual: false,
  durasiFotoDetik: 3,
  minTopup: 5000,
  maksTopup: 500000,
  batasSaldoSiswa: 1000000,
  kebijakanSaldoMengendap: 'REFUND',
  ambangHari: 90,
  disimpan: false,
}

export const pengaturanKantinSchema = z
  .object({
    namaKantin: z
      .string()
      .min(3, 'Nama kantin sekolah minimal 3 karakter')
      .max(100, 'Nama kantin sekolah maksimal 100 karakter'),
    jamTutupOtomatis: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
        'Format jam tutup kasir harus HH:mm (contoh: 23:59)'
      ),
    konfirmasiManual: z.boolean(),
    durasiFotoDetik: z
      .number({ message: 'Durasi harus berupa angka' })
      .int('Durasi harus berupa angka bulat')
      .min(1, 'Durasi tampil foto minimal 1 detik')
      .max(10, 'Durasi tampil foto maksimal 10 detik'),
    minTopup: z
      .number({ message: 'Nominal harus berupa angka' })
      .min(1000, 'Batas minimum top-up minimal Rp 1.000'),
    maksTopup: z
      .number({ message: 'Nominal harus berupa angka' })
      .min(1000, 'Batas maksimum top-up minimal Rp 1.000'),
    batasSaldoSiswa: z
      .number({ message: 'Nominal harus berupa angka' })
      .min(10000, 'Batas saldo maksimum siswa minimal Rp 10.000'),
    kebijakanSaldoMengendap: z.enum([
      'REFUND',
      'PINDAH_SAUDARA',
      'TETAP_MENGENDAP',
    ]),
    ambangHari: z
      .number({ message: 'Ambang hari harus berupa angka' })
      .int('Ambang hari harus berupa angka bulat')
      .min(0, 'Ambang hari tidak boleh negatif'),
  })
  .refine((data) => data.maksTopup >= data.minTopup, {
    message: 'Batas maksimum top-up tidak boleh lebih kecil dari batas minimum top-up',
    path: ['maksTopup'],
  })
  .refine((data) => data.batasSaldoSiswa >= data.maksTopup, {
    message: 'Batas saldo maksimal siswa tidak boleh lebih kecil dari batas maksimum sekali top-up',
    path: ['batasSaldoSiswa'],
  })

export type PengaturanKantinFormValues = z.infer<typeof pengaturanKantinSchema>

export const titikKasirFormSchema = z.object({
  nama: z
    .string()
    .min(3, 'Nama titik kasir minimal 3 karakter')
    .max(100, 'Nama titik kasir maksimal 100 karakter'),
  kode: z
    .string()
    .min(2, 'Kode perangkat minimal 2 karakter')
    .max(30, 'Kode perangkat maksimal 30 karakter')
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Kode perangkat hanya boleh huruf, angka, tanda minus (-), atau garis bawah (_)'
    ),
  aktif: z.boolean(),
})

export type TitikKasirFormValues = z.infer<typeof titikKasirFormSchema>
