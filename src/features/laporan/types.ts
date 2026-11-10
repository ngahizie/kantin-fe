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
  saldoKartuTamu: number
  totalKreditSemua: number
  totalDebitSemua: number

  // Pemeriksaan Invariant Akuntansi
  selisih: number
  seimbang: boolean

  // Metrik Evaluasi Invariant (Topup - Refund = Saldo Siswa + Saldo Kartu Tamu + Penjualan Bersih)
  totalTopupSemua: number
  totalRefundSemua: number
  topupBersih: number
  totalPenggunaan: number
}

export interface ArusPosRekonsiliasiItem {
  id: string
  pos: string
  kategori: 'MASUK' | 'KELUAR' | 'SALDO' | 'EVALUASI'
  arah: 'KREDIT' | 'DEBIT' | 'NETTO' | 'STATUS'
  nominal: number
  keterangan: string
}

// ─────────────────────────────────────────────────────────────
// PENJUALAN & LABA KOTOR
// ─────────────────────────────────────────────────────────────

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
  saldoKartuTamu: number
  total: number
  jumlahSiswa: number
  jumlahKartuTamu: number
}

export interface SiswaSaldoDetail {
  siswaId: number
  nis: string
  nisn?: string
  nama: string
  kelas: string
  saldo: number
  belanjaHariIni: number
  limitHarian: number
  isBlocked: boolean
  parentName: string
  parentPhone: string
  terakhirTransaksi?: string
}

export interface KartuTamuSaldoDetail {
  id: number
  nomorKartu: string
  uid: string
  labelPemegang: string
  saldo: number
  status: string
  createdAt: string
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
      titik: hasTitik ? trx.titikKasir! : 'Loket TU',
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
      petugas: hasPetugas ? trx.petugas! : 'Bendahara Sekolah',
    }
  }
  if (jenis === 'REFUND') {
    return {
      titik: hasTitik ? trx.titikKasir! : 'Loket TU',
      petugas: hasPetugas ? trx.petugas! : 'Petugas TU',
    }
  }

  return {
    titik: hasTitik ? trx.titikKasir! : 'Kasir Kantin',
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

export interface RingkasanKerugianStok {
  totalKerugian: number
  totalQtyHilang: number
  jumlahKejadian: number
  kerugianOpname: number
  qtyOpname: number
  kerugianBarangRusak: number
  qtyBarangRusak: number
}
