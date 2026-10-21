import { z } from 'zod'
import type { SiswaNonaktifMock, SiblingMock } from '@/mocks/mock-data'

export type { SiswaNonaktifMock, SiblingMock }

// --- Types untuk Refund Siswa Keluar / Lulus (PRD §9.3 & §9.5) ---
export const refundOrangTuaSchema = z.object({
  siswaId: z.number().int().positive('ID siswa tidak valid'),
  nominal: z.number().int().positive('Nominal refund harus lebih dari 0'),
  metode: z.enum(['TUNAI', 'TRANSFER_BANK'], {
    message: 'Pilih metode refund (Tunai atau Transfer Bank)',
  }),
  namaPenerima: z
    .string()
    .trim()
    .min(3, 'Nama penerima minimal 3 karakter')
    .max(100, 'Nama penerima maksimal 100 karakter'),
  kontakPenerima: z
    .string()
    .trim()
    .min(8, 'Nomor kontak/telepon minimal 8 digit')
    .max(20, 'Nomor kontak/telepon maksimal 20 digit'),
  bank: z.string().optional(),
  noRekening: z.string().optional(),
  namaRekening: z.string().optional(),
  buktiUrl: z.string().optional(),
  catatan: z.string().trim().max(255, 'Catatan maksimal 255 karakter').optional(),
}).refine(
  (data) => {
    if (data.metode === 'TRANSFER_BANK') {
      return Boolean(data.bank && data.bank.trim().length > 0)
    }
    return true
  },
  {
    message: 'Nama bank wajib dipilih untuk transfer bank',
    path: ['bank'],
  }
).refine(
  (data) => {
    if (data.metode === 'TRANSFER_BANK') {
      return Boolean(data.noRekening && data.noRekening.trim().length >= 5)
    }
    return true
  },
  {
    message: 'Nomor rekening valid wajib diisi untuk transfer bank',
    path: ['noRekening'],
  }
).refine(
  (data) => {
    if (data.metode === 'TRANSFER_BANK') {
      return Boolean(data.namaRekening && data.namaRekening.trim().length >= 3)
    }
    return true
  },
  {
    message: 'Nama pemilik rekening wajib diisi untuk transfer bank',
    path: ['namaRekening'],
  }
)

export type RefundOrangTuaFormValues = z.infer<typeof refundOrangTuaSchema>

export const pindahSaldoSchema = z.object({
  siswaAsalId: z.number().int().positive('ID siswa asal tidak valid'),
  siswaTujuanId: z.number().int().positive('Pilih saudara kandung yang aktif'),
  nominal: z.number().int().positive('Nominal saldo yang dipindahkan harus lebih dari 0'),
  beritaAcara: z
    .string()
    .trim()
    .min(5, 'Berita acara/keterangan pemindahan minimal 5 karakter')
    .max(255, 'Berita acara maksimal 255 karakter'),
}).refine(
  (data) => data.siswaAsalId !== data.siswaTujuanId,
  {
    message: 'Siswa penerima tidak boleh sama dengan siswa asal',
    path: ['siswaTujuanId'],
  }
)

export type PindahSaldoFormValues = z.infer<typeof pindahSaldoSchema>

export interface RefundSlipData {
  type: 'REFUND_ORTU' | 'TRANSFER_SAUDARA'
  ref_no: string
  waktu: string
  petugas_nama: string
  siswa_asal: {
    siswa_id: number
    nis: string
    nama: string
    kelas_terakhir: string
    rfid_uid?: string
    status_kartu: 'DIBLOKIR_PERMANEN'
  }
  nominal: number
  metode?: 'TUNAI' | 'TRANSFER_BANK'
  nama_penerima?: string
  kontak_penerima?: string
  bank?: string
  nomor_rekening?: string
  nama_rekening?: string
  bukti_url?: string
  siswa_tujuan?: {
    siswa_id: number
    nis: string
    nama: string
    kelas: string
    saldo_awal: number
    saldo_akhir: number
    nominal_diterima: number
  }
  berita_acara?: string
}

// --- Types untuk Koreksi Bendahara (PRD §9.2) ---
export type SubjekTipe = 'SISWA' | 'KARTU_TAMU'
export type JenisKoreksi =
  | 'SALAH_INPUT_TOPUP'
  | 'PEMBALIK_TRANSAKSI_KASIR'
  | 'PENYESUAIAN_AUDIT'
export type ArahMutasi = 'DEBIT' | 'KREDIT'

export interface MutasiKoreksiItem {
  id: string | number
  referensi_id: string
  waktu: string
  subjek_tipe: SubjekTipe
  subjek_id: number
  subjek_nama: string
  subjek_info: string
  jenis_koreksi: JenisKoreksi
  arah: ArahMutasi
  nominal: number
  saldo_sebelum: number
  saldo_setelah: number
  alasan: string
  bendahara_id: number
  bendahara_nama: string
  transaksi_terkait_id?: string | number
  sesi_kasir_id?: number
}

export interface KoreksiSaldoPayload {
  subjekTipe: SubjekTipe
  subjekId: number
  arah: ArahMutasi
  nominal: number
  alasan: string
  referensiId: string
  jenisKoreksi?: JenisKoreksi
  transaksiTerkaitId?: string | number
}

export interface TransaksiSesiTutupItem {
  id: string
  waktu: string
  sesi_kasir_id: number
  titik_kasir: string
  petugas_kasir: string
  subjek_tipe: SubjekTipe
  subjek_id: number
  subjek_nama: string
  subjek_info: string
  kartu_uid?: string
  total: number
  items?: Array<{
    menu_id: number
    nama: string
    qty: number
    harga: number
    subtotal: number
  }>
  status: 'SELESAI' | 'DIKOREKSI' | 'VOID' | 'SUKSES'
  koreksi_referensi_id?: string
  dapat_dikoreksi?: boolean
  dapatDikoreksi?: boolean
  alasan_void?: string | null
  alasanVoid?: string | null
  void_at?: string | null
  voidAt?: string | null
}

export interface HalamanResponse<T> {
  items: T[]
  total: number
  halaman: number
  ukuran: number
  totalHalaman: number
}

export interface TransaksiKasirItemResponse {
  id: number
  waktu: string
  sesiKasirId: number
  titikKasirId?: number | null
  titikKasirNama?: string | null
  petugasId?: number | null
  subjekTipe: SubjekTipe
  subjekId: number
  subjekNama?: string | null
  kartuUid?: string | null
  total: number
  status: 'SUKSES' | 'VOID'
  alasanVoid?: string | null
  voidAt?: string | null
  dapatDikoreksi: boolean
}

export function mapTransaksiKasirItemToSesiTutup(
  raw: any,
  siswaList?: Array<{ siswa_id: number; nama: string; kelas?: string; nis?: string }>
): TransaksiSesiTutupItem {
  const id = raw?.id !== undefined ? String(raw.id) : ''
  const sesiKasirId = Number(raw?.sesiKasirId ?? raw?.sesi_kasir_id ?? 0)
  const titikKasir =
    raw?.titikKasirNama ??
    raw?.titik_kasir ??
    (raw?.titikKasirId ? `Titik #${raw.titikKasirId}` : 'Kantin')
  const petugasKasir =
    raw?.petugas_kasir ??
    (raw?.petugasId ? `Petugas #${raw.petugasId}` : 'Kasir')
  const subjekTipe = (raw?.subjekTipe ?? raw?.subjek_tipe ?? 'SISWA') as SubjekTipe
  const subjekId = Number(raw?.subjekId ?? raw?.subjek_id ?? 0)
  const kartuUid = raw?.kartuUid ?? raw?.kartu_uid ?? undefined

  const matchedSiswa = siswaList?.find((s) => s.siswa_id === subjekId)
  let subjekNama = raw?.subjekNama ?? raw?.subjek_nama ?? ''
  if (!subjekNama) {
    if (subjekTipe === 'SISWA') {
      subjekNama = matchedSiswa?.nama || `Siswa #${subjekId}`
    } else {
      subjekNama = `Kartu Tamu #${subjekId}`
    }
  }

  let subjekInfo = raw?.subjekInfo ?? raw?.subjek_info ?? ''
  if (!subjekInfo) {
    if (subjekTipe === 'SISWA') {
      subjekInfo = matchedSiswa
        ? `${matchedSiswa.kelas || ''} (NIS: ${matchedSiswa.nis || '-'})`.trim()
        : kartuUid
          ? `Kartu: ${kartuUid}`
          : `ID: ${subjekId}`
    } else {
      subjekInfo = kartuUid ? `Kartu: ${kartuUid}` : `ID: ${subjekId}`
    }
  }

  const rawStatus = String(raw?.status || '').toUpperCase()
  let status: 'SELESAI' | 'DIKOREKSI' | 'VOID' | 'SUKSES' = 'SELESAI'
  if (rawStatus === 'VOID') {
    status = 'VOID'
  } else if (rawStatus === 'DIKOREKSI') {
    status = 'DIKOREKSI'
  } else if (rawStatus === 'SUKSES') {
    status = 'SUKSES'
  }

  const dapatDikoreksi =
    raw?.dapatDikoreksi !== undefined
      ? Boolean(raw.dapatDikoreksi)
      : raw?.dapat_dikoreksi !== undefined
        ? Boolean(raw.dapat_dikoreksi)
        : status === 'SUKSES' || status === 'SELESAI'

  return {
    id,
    waktu: raw?.waktu || new Date().toISOString(),
    sesi_kasir_id: sesiKasirId,
    titik_kasir: titikKasir,
    petugas_kasir: petugasKasir,
    subjek_tipe: subjekTipe,
    subjek_id: subjekId,
    subjek_nama: subjekNama,
    subjek_info: subjekInfo,
    kartu_uid: kartuUid,
    total: Number(raw?.total) || 0,
    items: Array.isArray(raw?.items) ? raw.items : [],
    status,
    koreksi_referensi_id: raw?.koreksi_referensi_id ?? raw?.koreksiReferensiId,
    dapat_dikoreksi: dapatDikoreksi,
    dapatDikoreksi,
    alasan_void: raw?.alasanVoid ?? raw?.alasan_void ?? null,
    alasanVoid: raw?.alasanVoid ?? raw?.alasan_void ?? null,
    void_at: raw?.voidAt ?? raw?.void_at ?? null,
    voidAt: raw?.voidAt ?? raw?.void_at ?? null,
  }
}

export function mapMutasiKoreksiItem(
  raw: any,
  siswaList?: Array<{ siswa_id: number; nama: string; kelas?: string; nis?: string }>
): MutasiKoreksiItem {
  const id = raw?.id !== undefined ? raw.id : ''
  const referensiId = String(raw?.referensiId ?? raw?.referensi_id ?? '')
  const subjekTipe = (raw?.subjekTipe ?? raw?.subjek_tipe ?? 'SISWA') as SubjekTipe
  const subjekId = Number(raw?.subjekId ?? raw?.subjek_id ?? 0)

  const matchedSiswa = siswaList?.find((s) => s.siswa_id === subjekId)
  let subjekNama = raw?.subjekNama ?? raw?.subjek_nama ?? ''
  if (!subjekNama) {
    if (subjekTipe === 'SISWA') {
      subjekNama = matchedSiswa?.nama || `Siswa #${subjekId}`
    } else {
      subjekNama = `Kartu Tamu #${subjekId}`
    }
  }

  let subjekInfo = raw?.subjekInfo ?? raw?.subjek_info ?? ''
  if (!subjekInfo) {
    if (subjekTipe === 'SISWA') {
      subjekInfo = matchedSiswa
        ? `${matchedSiswa.kelas || ''} (NIS: ${matchedSiswa.nis || '-'})`.trim()
        : `ID: ${subjekId}`
    } else {
      subjekInfo = `ID: ${subjekId}`
    }
  }

  const arah = (raw?.arah ?? 'DEBIT') as ArahMutasi
  const nominal = Number(raw?.nominal) || 0
  const saldoSebelum = Number(raw?.saldoSebelum ?? raw?.saldo_sebelum ?? 0)
  const saldoSetelah = Number(raw?.saldoSetelah ?? raw?.saldo_setelah ?? 0)
  const alasan = raw?.keterangan ?? raw?.alasan ?? ''
  const bendaharaId = Number(raw?.aktorId ?? raw?.bendahara_id ?? 0)
  const bendaharaNama =
    raw?.bendahara_nama ?? (bendaharaId ? `Bendahara #${bendaharaId}` : 'Bendahara')
  const transaksiId = raw?.transaksiId ?? raw?.transaksi_terkait_id

  const jenisKoreksi =
    raw?.jenis_koreksi ??
    raw?.jenisKoreksi ??
    (transaksiId ? 'PEMBALIK_TRANSAKSI_KASIR' : 'PENYESUAIAN_AUDIT')

  return {
    id,
    referensi_id: referensiId,
    waktu: raw?.waktu || new Date().toISOString(),
    subjek_tipe: subjekTipe,
    subjek_id: subjekId,
    subjek_nama: subjekNama,
    subjek_info: subjekInfo,
    jenis_koreksi: jenisKoreksi,
    arah,
    nominal,
    saldo_sebelum: saldoSebelum,
    saldo_setelah: saldoSetelah,
    alasan,
    bendahara_id: bendaharaId,
    bendahara_nama: bendaharaNama,
    transaksi_terkait_id: transaksiId,
    sesi_kasir_id: raw?.sesiKasirId ?? raw?.sesi_kasir_id,
  }
}
