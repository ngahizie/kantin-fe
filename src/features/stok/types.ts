import { z } from 'zod'

export type ArahStok = 'MASUK' | 'KELUAR'

export type JenisMutasiStok =
  | 'BARANG_MASUK'
  | 'BARANG_MASUK_PEMBALIK'
  | 'PENJUALAN'
  | 'PENJUALAN_VOID'
  | 'OPNAME_MASUK'
  | 'OPNAME_KELUAR'
  | 'BARANG_RUSAK'

export interface RiwayatStokItem {
  id: number
  menuId: number
  menuNama?: string | null
  arah: ArahStok
  jenis: JenisMutasiStok
  qty: number
  hargaBeliSatuan?: number | null
  totalNilai?: number | null
  hppSnapshot?: number | null
  stokSetelah: number
  referensiTipe?: string | null
  referensiId: string
  alasan?: string | null
  mutasiAsalId?: number | null
  sudahDibalik?: number | null
  sisaDapatDibalik?: number | null
  dapatDibalik: boolean
  aktorId?: number | null
  aktorNama?: string | null
  waktu: string
}

export interface HalamanResponse<T> {
  items: T[]
  total: number
  halaman: number
  ukuran: number
  totalHalaman: number
}

export interface StokResponse {
  menuId: number
  stok: number
  stokMinimum: number
  hpp: number
  nilaiPersediaan: number
  menipis: boolean
}

export interface InventarisItem {
  menuId: number
  nama: string
  kategoriId?: number | null
  stok: number
  stokMinimum: number
  hpp: number
  nilaiPersediaan: number
  menipis: boolean
  namaMenu?: string
  stokBerjalan?: number
}

export interface HasilMutasiStok {
  mutasiId: number
  menuId: number
  stokSebelum: number
  stokSesudah: number
  hppSebelum: number
  hppSesudah: number
  jenis: JenisMutasiStok
  waktu: string
}

export interface BarangMasukSingleRequest {
  menuId: number
  qty: number
  hargaBeliPerUnit: number
  referensiId: string
  alasan?: string
}

export interface BarangMasukPembalikRequest {
  mutasiId: number
  qty?: number | null
  alasan: string
  referensiId: string
}

export interface RestockItemRow {
  rowId: string
  menuId: number | ''
  qty: number
  hargaBeliPerUnit: number
  // Snapshot data menu saat ini
  stokSekarang: number
  hppSekarang: number
}

export interface BarangMasukFormValues {
  tanggal: string
  referensiId: string
  namaPemasok?: string
  notaFotoUrl?: string
  items: {
    menuId: number
    qty: number
    hargaBeliPerUnit: number
  }[]
}

// Zod schemas
export const restockItemSchema = z.object({
  menuId: z.number().min(1, 'Menu wajib dipilih'),
  qty: z.number().int('Qty harus bilangan bulat').min(1, 'Qty minimal 1 unit'),
  hargaBeliPerUnit: z
    .number()
    .int('Harga beli harus bilangan bulat')
    .min(0, 'Harga beli tidak boleh negatif'),
})

export const barangMasukFormSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal pembelian wajib diisi'),
  referensiId: z
    .string()
    .trim()
    .min(1, 'Nomor bukti/faktur wajib diisi')
    .max(60, 'Nomor bukti maksimal 60 karakter'),
  namaPemasok: z
    .string()
    .trim()
    .max(100, 'Nama pemasok maksimal 100 karakter')
    .optional(),
  notaFotoUrl: z.string().optional(),
  items: z
    .array(restockItemSchema)
    .min(1, 'Minimal harus ada 1 barang yang dicatat'),
})

export const barangMasukPembalikSchema = z.object({
  mutasiId: z.number().min(1, 'ID mutasi tidak valid'),
  qty: z
    .number()
    .int('Qty harus bilangan bulat')
    .min(1, 'Qty pembalik minimal 1')
    .optional()
    .nullable(),
  alasan: z
    .string()
    .trim()
    .min(3, 'Alasan pembalik wajib diisi (minimal 3 karakter)')
    .max(255, 'Alasan maksimal 255 karakter'),
  referensiId: z
    .string()
    .trim()
    .min(1, 'Nomor bukti pembalik wajib diisi')
    .max(60, 'Nomor bukti maksimal 60 karakter'),
})

export type BarangMasukPembalikFormValues = z.infer<
  typeof barangMasukPembalikSchema
>

// --- STOK OPNAME & BARANG RUSAK (PRD §7.3) ---

export interface OpnameRequest {
  menuId: number
  qtyFisik: number
  alasan: string
  referensiId: string
}

export interface OpnameBatchItemRequest {
  menuId: number
  qtyFisik: number
  alasan: string
  rusak?: boolean
}

export interface OpnameBatchRequest {
  referensiId: string
  items: OpnameBatchItemRequest[]
}

export interface OpnameBatchHasilItem {
  menuId: number
  stokSebelum: number
  stokFisik: number
  selisih: number
  jenis?: JenisMutasiStok | null
  mutasiId?: number | null
  stokSetelah: number
}

export interface OpnameBatchResponse {
  referensiId: string
  jumlahBerubah: number
  jumlahTanpaSelisih: number
  items: OpnameBatchHasilItem[]
}

export const KATEGORI_ALASAN_OPNAME = [
  { value: 'Rusak', label: 'Barang Rusak / Kemasan Rusak', isRusak: true },
  { value: 'Kedaluwarsa', label: 'Kedaluwarsa / Basi', isRusak: true },
  { value: 'Hilang', label: 'Barang Hilang / Selisih Kurang', isRusak: false },
  { value: 'Salah Hitung', label: 'Koreksi Salah Hitung', isRusak: false },
  { value: 'Lainnya', label: 'Lainnya (Perlu Keterangan)', isRusak: false },
] as const

export type KategoriAlasanOpnameValue =
  (typeof KATEGORI_ALASAN_OPNAME)[number]['value']

export interface OpnameRowState {
  menuId: number
  nama: string
  kategoriNama?: string
  satuan: string
  stokSistem: number
  hpp: number
  hargaJual: number
  qtyFisik: number | ''
  selisih: number // qtyFisik - stokSistem
  nilaiSelisih: number // |selisih| * hpp
  alasan: string
  keterangan: string
  rusak: boolean
}

export const barangRusakFormSchema = z.object({
  menuId: z.number().min(1, 'Menu wajib dipilih'),
  qtyRusak: z
    .number()
    .int('Qty harus bilangan bulat')
    .min(1, 'Qty minimal 1 unit'),
  kategoriAlasan: z.string().min(1, 'Kategori alasan wajib dipilih'),
  keterangan: z
    .string()
    .trim()
    .max(255, 'Catatan maksimal 255 karakter')
    .optional(),
  referensiId: z
    .string()
    .trim()
    .min(1, 'Nomor referensi wajib diisi')
    .max(60, 'Nomor referensi maksimal 60 karakter'),
})

export type BarangRusakFormValues = z.infer<typeof barangRusakFormSchema>

