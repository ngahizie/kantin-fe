export interface MenuItemMock {
  id: number
  nama: string
  kode_barcode?: string | null
  kategori_id: number
  kategori_nama: string
  harga_jual: number
  stok: number
  stok_minimum: number
  satuan: string
  foto_url?: string
  is_active: boolean
  hpp: number
}

export interface KategoriMock {
  id: number
  nama: string
  is_active: boolean
  jumlah_item: number
}

export interface KartuSiswaMock {
  uid: string
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

export interface SiblingMock {
  siswa_id: number
  nis: string
  nama: string
  kelas: string
  foto_url?: string
  saldo: number
  rfid_uid: string
  is_blocked: boolean
}

export interface SiswaNonaktifMock {
  siswa_id: number
  nis: string
  nama: string
  kelas_terakhir: string
  foto_url: string
  saldo: number
  status_siswa: 'LULUS' | 'PINDAH' | 'KELUAR'
  tanggal_nonaktif: string
  alasan_nonaktif: string
  rfid_uid: string
  is_card_blocked: boolean
  nama_ortu: string
  kontak_ortu: string
  no_rekening_ortu?: string
  bank_ortu?: string
  saudara_kandung?: SiblingMock[]
  is_refunded?: boolean
  refund_info?: {
    tipe: 'REFUND_ORTU' | 'TRANSFER_SAUDARA'
    metode?: 'TUNAI' | 'TRANSFER_BANK'
    nominal: number
    tanggal: string
    referensi_id: string
    keterangan: string
    bank?: string
    nomor_rekening?: string
    nama_rekening?: string
    bukti_url?: string
    saudara_tujuan_id?: number
    saudara_tujuan_nama?: string
  }
}
