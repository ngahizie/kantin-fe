/**
 * Tipe Data Terpadu untuk Modul Laporan SKOOLIA Kantin
 * PRD §9.5 & Invariant Akuntansi §5
 */

export interface LaporanFilterParams {
  tanggal?: string
  dari?: string
  sampai?: string
  kategoriId?: number
  titikKasirId?: number
  search?: string
  batas?: number
  halaman?: number
  ukuran?: number
  simulasiSelisih?: boolean
}

// ─────────────────────────────────────────────────────────────
// REKONSILIASI HARIAN & INVARIANT SALDO
// ─────────────────────────────────────────────────────────────

export interface RingkasanRekonsiliasi {
  dari: string
  sampai: string
  // Arus Kas Periode
  topupOnline: number
  topupTunai: number
  penjualan: number
  voidPenjualan: number
  penjualanBersih: number
  koreksiMasuk: number
  koreksiKeluar: number
  refund: number
  transfer: number

  // Saldo Mengendap & Kumulatif Ledger
  saldoMengendap: number
  saldoSiswa: number
  totalKreditSemua: number
  totalDebitSemua: number

  // Pemeriksaan Invariant Akuntansi
  selisih: number
  seimbang: boolean

  // Metrik Evaluasi Invariant (Topup - Refund = Saldo Siswa + Penjualan Bersih)
  totalTopupSemua: number
  totalRefundSemua: number
  topupBersih: number
  totalPenggunaan: number
}

export interface ArusPosRekonsiliasiItem {
  id: string
  pos: string
  arah: 'MASUK' | 'KELUAR' | 'TETAP' | 'EVALUASI'
  kategori?: 'MASUK' | 'KELUAR' | 'TETAP' | 'EVALUASI'
  nominal: number
  keterangan: string
}

// ─────────────────────────────────────────────────────────────
// PENJUALAN & LABA KOTOR
// ─────────────────────────────────────────────────────────────

/**
 * Ringkasan penjualan — nama field mengikuti BE (PRD §9.5 revisi):
 * refund (bukan void), modal (bukan HPP), laba, dan margin sudah dihitung
 * server sehingga FE tidak perlu menghitung sendiri.
 */
export interface RingkasanPenjualan {
  dari: string
  sampai: string
  jumlahTransaksi: number
  penjualanBruto: number
  jumlahRefund: number
  nilaiRefund: number
  penjualanBersih: number
  totalModal: number
  laba: number
  marginPersen: number
}

export interface BarisPenjualanItem {
  kunciId: number
  menuId: number
  nama: string
  kategoriId: number
  kategoriNama: string
  qty: number
  hargaSatuan: number
  hargaJual: number
  hpp: number
  total: number
  penjualanBersih: number
  modal: number
  totalHpp: number
  laba: number
  labaKotor: number
  marginPersen: number
  margin: number
}

export interface BarisPenjualanKategori {
  kunciId: number
  kategoriId: number
  nama: string
  jumlahItem: number | null
  qty: number
  hargaSatuan: number | null
  total: number
  penjualanBersih: number
  modal: number
  totalHpp: number
  laba: number
  labaKotor: number
  marginPersen: number
  margin: number
}

export interface BarisPenjualanKasir {
  titikKasirId: number
  namaTitikKasir: string
  petugas: string
  jumlahTransaksi: number
  penjualanBruto: number
  nilaiVoid: number
  penjualanBersih: number
}

// ─────────────────────────────────────────────────────────────
// SALDO MENGENDAP & KEWAJIBAN SEKOLAH
// ─────────────────────────────────────────────────────────────

export interface RingkasanSaldoMengendap {
  saldoSiswa: number
  total: number
  jumlahSiswa: number
}

export interface SiswaSaldoDetail {
  siswaId: number
  nis: string
  nisn?: string
  nama: string
  kelas: string
  fotoUrl?: string | null
  saldo: number
  belanjaHariIni: number
  limitHarian: number
  isBlocked: boolean
  parentName: string
  parentPhone: string
  terakhirTransaksi?: string
}

// ─────────────────────────────────────────────────────────────
// RIWAYAT TRANSAKSI & BELANJA SISWA (KOMPLAIN ORTU)
// ─────────────────────────────────────────────────────────────

export interface RincianItemBelanja {
  menuId?: number
  nama: string
  qty: number
  harga: number
  subtotal: number
}

export interface RiwayatBelanjaSiswaItem {
  id: string | number
  waktu: string
  jenis:
    | 'BELANJA'
    | 'TOPUP_TUNAI'
    | 'TOPUP_ONLINE'
    | 'VOID'
    | 'REFUND'
    | 'KOREKSI'
    | 'TRANSFER'
  arah: 'DEBIT' | 'KREDIT'
  nominal: number
  saldoSetelah: number
  titikKasir: string
  petugas: string
  metodeBayar?: 'SALDO' | 'TUNAI' | string | null
  referensiId: string
  keterangan: string
  items?: RincianItemBelanja[]
}

/**
 * Memastikan nilai Titik Kasir/Lokasi dan Nama Petugas selalu terisi secara bermakna
 * meskipun backend mengembalikan nilai placeholder '-' untuk mutasi non-kasir (seperti Top-up TU atau Koreksi).
 */
export function resolveTitikDanPetugas(trx: {
  jenis?: string
  titikKasir?: string | null
  petugas?: string | null
}): { titik: string; petugas: string } {
  const hasTitik = Boolean(trx.titikKasir && trx.titikKasir !== '-' && trx.titikKasir.trim() !== '')
  const hasPetugas = Boolean(trx.petugas && trx.petugas !== '-' && trx.petugas.trim() !== '')

  if (hasTitik && hasPetugas) {
    return { titik: trx.titikKasir!, petugas: trx.petugas! }
  }

  const jenis = trx.jenis || ''
  if (jenis === 'TOPUP_TUNAI') {
    return {
      titik: hasTitik ? trx.titikKasir! : 'Layanan TU',
      petugas: hasPetugas ? trx.petugas! : 'Petugas TU',
    }
  }
  if (jenis === 'TOPUP_ONLINE') {
    return {
      titik: hasTitik ? trx.titikKasir! : 'Aplikasi SKOOLIA',
      petugas: hasPetugas ? trx.petugas! : 'Sistem Online',
    }
  }
  if (jenis === 'KOREKSI') {
    return {
      titik: hasTitik ? trx.titikKasir! : 'Ruang Bendahara',
      petugas: hasPetugas ? trx.petugas! : 'Bendahara',
    }
  }
  if (jenis === 'REFUND' || jenis === 'VOID') {
    return {
      titik: hasTitik ? trx.titikKasir! : 'Titik Kasir',
      petugas: hasPetugas ? trx.petugas! : 'Petugas Kasir',
    }
  }

  return {
    titik: hasTitik ? trx.titikKasir! : 'Kasir Kantin Utama',
    petugas: hasPetugas ? trx.petugas! : 'Petugas Kasir',
  }
}

export interface RiwayatTransaksiKeseluruhanItem extends RiwayatBelanjaSiswaItem {
  siswaId: number
  siswaNama: string
  siswaNis: string
  siswaKelas: string
}

export interface ProfilSiswaRiwayat {
  siswaId: number
  nis: string
  nama: string
  kelas: string
  fotoUrl?: string
  saldo: number
  belanjaHariIni: number
  limitHarian: number
  isBlocked: boolean
  parentName: string
  parentPhone: string
  catatanKontrol?: string
}

// ─────────────────────────────────────────────────────────────
// KERUGIAN STOK (OPNAME KELUAR & BARANG RUSAK)
// ─────────────────────────────────────────────────────────────

export interface BarisKerugianStok {
  id: number
  waktu: string
  menuId: number
  namaMenu: string
  kategoriNama: string
  jenis: 'OPNAME_KELUAR' | 'BARANG_RUSAK'
  qty: number
  hppSnapshot: number
  totalNilai: number
  alasan: string
  beritaAcaraId: string
  petugas: string
}

export interface KerugianStokHalamanResponse {
  items: BarisKerugianStok[]
  total: number
  showing: number
  totalPages: number
  currentPage: number
}

export interface RingkasanKerugianStok {
  totalKerugian: number
  totalQtyHilang: number
  jumlahKejadian: number
  kerugianOpname: number
  qtyOpname: number
  kerugianBarangRusak: number
  qtyBarangRusak: number
}

// ─────────────────────────────────────────────────────────────
// PEMBATALAN KASIR (VOID / REFUND KASIR - PRD §9.5)
// ─────────────────────────────────────────────────────────────

export interface BarisPembatalanKasir {
  transaksiId: number
  subjekTipe?: string
  siswaId: number
  siswaNama?: string
  siswaNis?: string
  siswaKelas?: string
  kartuUid?: string | null
  total: number
  alasanVoid: string
  voidAt: string
  voidOleh?: number
  voidOlehNama?: string
  petugasId?: number
  petugasNama?: string
  titikKasirId?: number
  titikKasirNama?: string
  waktu: string
}

// ─────────────────────────────────────────────────────────────
// PENJUALAN DIMENSI (PER TITIK KASIR & PER PETUGAS - PRD §9.5)
// ─────────────────────────────────────────────────────────────

export interface BarisPenjualanDimensi {
  kunciId: number
  nama: string | null
  jumlahTransaksi: number
  nilai: number
  hpp: number | null
  labaKotor: number | null
}

// ─────────────────────────────────────────────────────────────
// LAPORAN PER SISWA (RINGKASAN & TRANSAKSI - PRD §9.5)
// ─────────────────────────────────────────────────────────────

export interface LaporanPerSiswaRingkasan {
  jumlahTransaksiSukses: number
  nilaiBelanjaSukses: number
  jumlahTransaksiVoid: number
  nilaiVoid: number
  totalTopup: number
  totalHpp: number | null
}

export interface LaporanPerSiswaTransaksi {
  id: number
  status: string
  total: number
  totalHpp: number | null
  petugasId?: number | null
  titikKasirId?: number | null
  alasanVoid?: string | null
  waktu: string
}

export interface LaporanPerSiswaMutasi {
  id: number
  jenis: string
  arah: 'KREDIT' | 'DEBIT' | string
  nominal: number
  saldoSetelah: number
  transaksiId?: number | null
  keterangan?: string | null
  waktu: string
}

export interface LaporanPerSiswa {
  subjekTipe: string
  siswaId: number
  saldo: number
  periode: string
  ringkasan: LaporanPerSiswaRingkasan
  transaksi: LaporanPerSiswaTransaksi[]
  mutasiSaldo: LaporanPerSiswaMutasi[]
}

// ─────────────────────────────────────────────────────────────
// KARTU STOK PER ITEM & SETORAN TU (PRD §9.5)
// ─────────────────────────────────────────────────────────────

export interface KartuStokBarisMutasi {
  id: number
  waktu: string
  jenis: string
  arah: 'MASUK' | 'KELUAR' | string
  qty: number
  stokSetelah: number
  hppSnapshot?: number | null
  hargaBeliSatuan?: number | null
  referensiId?: string | null
  alasan?: string | null
  aktorNama?: string | null
}

export interface KartuStokLaporan {
  menuId: number
  namaMenu: string
  satuan: string
  stokSekarang: number
  mutasi: KartuStokBarisMutasi[]
}

export interface RekapSetoranLaporanItem {
  petugasId: number
  tanggal: string
  totalTopup: number
  jumlahDisetor: number
  selisih: number
  referensiId?: string | null
}

// ─────────────────────────────────────────────────────────────
// EKSPOR EXCEL RESMI BACKEND (/api/laporan/ekspor - PRD §9.5)
// ─────────────────────────────────────────────────────────────

export type JenisLaporanEkspor =
  | 'PENJUALAN'
  | 'PENJUALAN_ITEM'
  | 'PENJUALAN_KATEGORI'
  | 'PENJUALAN_TITIK'
  | 'PENJUALAN_PETUGAS'
  | 'PENJUALAN_KASIR'
  | 'SALDO_MENGENDAP'
  | 'REKONSILIASI'
  | 'STOK'
  | 'KERUGIAN_STOK'
  | 'BARANG_MASUK'
  | 'PEMBATALAN'
  | 'KARTU_STOK'
  | 'SETORAN_TU'
  | 'PER_SISWA'

export interface EksporLaporanParams extends LaporanFilterParams {
  jenis: JenisLaporanEkspor
  menuId?: number
  siswaId?: number
}
