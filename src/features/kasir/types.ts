export type StatusSesiKasir = 'TERBUKA' | 'DITUTUP'

export interface SesiKasirData {
  id: number
  sekolahId?: number
  titikKasirId: number
  titikKasirNama?: string
  tanggal: string
  status: StatusSesiKasir
  totalBruto: number
  totalVoid: number
  totalBersih: number
  totalTransaksi?: number
  dibukaAt: string
  ditutupAt?: string | null
  ditutupOleh?: number | null
  autoTutup?: boolean
  uangFisik?: number | null
  selisih?: number | null
  catatan?: string | null
}

export interface TutupSesiPayload {
  uangFisik?: number
  selisih?: number
  catatan?: string
}

export interface RekapSesiData {
  sesiKasirId: number
  jumlahTransaksi: number
  jumlahVoid: number
  totalBruto: number
  totalVoid: number
  totalBersih: number
}

export type StatusTransaksi = 'SUKSES' | 'VOID'

export interface TransaksiItemDetail {
  menuId: number
  namaMenu: string
  qty: number
  hargaSatuan: number
  subtotal: number
}

export interface TransaksiSesiItem {
  id: number
  transaksiId?: number
  nomorReferensi: string
  waktu: string
  pembeliNama: string
  pembeliKelas?: string | null
  pembeliNis?: string | null
  pembeliFotoUrl?: string | null
  kartuUid?: string
  items: TransaksiItemDetail[]
  total: number
  status: StatusTransaksi
  voidAlasan?: string | null
  voidAt?: string | null
  voidOleh?: string | null
}

export const PILIHAN_ALASAN_VOID = [
  'Salah input menu',
  'Pembeli membatalkan',
  'Kartu dipakai bukan pemiliknya',
  'Lainnya',
] as const

export type AlasanVoidType = (typeof PILIHAN_ALASAN_VOID)[number]

export interface TapItemPayload {
  menuId: number
  qty: number
}

export interface TapTransaksiRequest {
  rfidUid: string
  items: TapItemPayload[]
  idempotencyKey: string
  titikKasirId?: number
}

export interface TapBuyerInfo {
  nama: string
  kelas?: string | null
  nis?: string | null
  foto_url?: string | null
  fotoUrl?: string | null
  sisa_saldo: number
  saldoSisa?: number
}

export interface TapTransaksiData {
  transaksi_id: number
  transaksiId?: number
  nomorStruk?: string | null
  titikKasir?: string | null
  namaItem?: string[]
  total: number
  waktu: string
  pembeli: TapBuyerInfo
}

export interface ReceiptLineItem {
  menuId?: number
  namaMenu: string
  qty: number
  hargaSatuan: number
  subtotal: number
}

export interface ReceiptData {
  transaksiId: number
  nomorStruk: string | null
  waktu: string
  namaKantin: string
  titikKasir?: string | null
  pembeliNama: string
  pembeliKelas?: string | null
  pembeliNis?: string | null
  pembeliFotoUrl?: string | null
  items: ReceiptLineItem[]
  namaItemFallback?: string[]
  total: number
  saldoSisa: number
}

export interface RefundTransaksiPayload {
  alasan: string
  kodeStruk: string
}

export interface ApiErrorResponse {
  message: string
  kekurangan?: number
  code?: number
}

export interface InfoSaldoData {
  id?: number
  nis?: string | null
  nama: string
  kelas?: string | null
  fotoUrl?: string | null
  saldo: number
  status?: string | null
  uid?: string | null
}

