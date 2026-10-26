import type { KartuTamuMock } from '@/mocks/mock-data'

export interface KartuTamuBackendDto {
  id: number
  sekolahId?: number
  nomorKartu?: string
  nomor_kartu?: string
  rfidUid?: string | null
  uid?: string
  aktif?: boolean
  is_active?: boolean
  catatan?: string | null
  labelPemegang?: string | null
  label_pemegang?: string | null
  saldo?: number
  dibuatOleh?: number
  dibuatPada?: string
  created_at?: string
  diubahOleh?: number | null
  diubahPada?: string | null
  last_used_at?: string
  status?: 'ACTIVE' | 'BLOCKED' | 'AVAILABLE'
}

/**
 * Normalisasi data kartu tamu dari response backend (camelCase)
 * atau mock data (snake_case) ke interface standar UI KartuTamuMock.
 */
export function mapBackendToKartuTamu(
  raw: KartuTamuBackendDto,
  currentSaldo?: number
): KartuTamuMock {
  const isActive = raw.aktif ?? raw.is_active ?? true
  const label = (raw.labelPemegang ?? raw.label_pemegang ?? raw.catatan ?? '').trim()

  let status: 'ACTIVE' | 'BLOCKED' | 'AVAILABLE'
  if (!isActive) {
    status = 'BLOCKED'
  } else if (label.length > 0) {
    status = 'ACTIVE'
  } else {
    status = 'AVAILABLE'
  }

  return {
    id: raw.id,
    nomor_kartu: raw.nomorKartu || raw.nomor_kartu || '',
    uid: raw.rfidUid || raw.uid || '',
    label_pemegang: label,
    saldo: raw.saldo ?? currentSaldo ?? 0,
    is_active: isActive,
    status: raw.status || status,
    created_at: raw.dibuatPada || raw.created_at || new Date().toISOString(),
    last_used_at: raw.diubahPada || raw.last_used_at,
  }
}

export interface TransaksiItemRingkas {
  menuId?: number
  namaMenu: string
  hargaJual: number
  qty: number
  subtotal: number
}

export interface RiwayatTransaksiItem {
  transaksiId: number
  waktu: string
  total: number
  totalHpp?: number
  status: 'BERHASIL' | 'VOID' | 'PENDING' | string
  kartuUid?: string
  petugasId?: number
  titikKasirId?: number
  alasanVoid?: string
  voidAt?: string
  items?: TransaksiItemRingkas[]
}

export interface MutasiSaldoItem {
  id: number
  jenis: 'TOPUP' | 'BELANJA' | 'REFUND' | 'KOREKSI' | 'PINDAH_KARTU_HILANG' | string
  arah: 'MASUK' | 'KELUAR'
  nominal: number
  saldoSetelah: number
  keterangan: string
  waktu: string
}

export interface RiwayatKartuTamuData {
  kartuId: number
  nomorKartu: string
  labelPemegang: string
  aktif: boolean
  saldo: number
  transaksi?: {
    items: RiwayatTransaksiItem[]
    total: number
    halaman: number
    ukuran: number
    totalHalaman: number
  }
  mutasi?: MutasiSaldoItem[]
}

