/**
 * Initial Mock Data untuk pengembangan lokal kantin-fe
 */

export interface MenuItemMock {
  id: number
  nama: string
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

export interface KartuTamuMock {
  id: number
  nomor_kartu: string
  uid: string
  label_pemegang: string
  saldo: number
  is_active: boolean
  status: 'ACTIVE' | 'BLOCKED' | 'AVAILABLE'
  created_at: string
  last_used_at?: string
}

export const MOCK_KATEGORI: KategoriMock[] = [
  { id: 1, nama: 'Makanan Berat', is_active: true, jumlah_item: 4 },
  { id: 2, nama: 'Snack & Roti', is_active: true, jumlah_item: 4 },
  { id: 3, nama: 'Minuman Dingin', is_active: true, jumlah_item: 4 },
  { id: 4, nama: 'Minuman Hangat', is_active: true, jumlah_item: 2 },
]

export const MOCK_MENU: MenuItemMock[] = [
  {
    id: 1,
    nama: 'Nasi Uduk Komplit',
    kategori_id: 1,
    kategori_nama: 'Makanan Berat',
    harga_jual: 12000,
    stok: 25,
    stok_minimum: 5,
    satuan: 'porsi',
    foto_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    is_active: true,
    hpp: 8000,
  },
  {
    id: 2,
    nama: 'Nasi Goreng Ayam',
    kategori_id: 1,
    kategori_nama: 'Makanan Berat',
    harga_jual: 15000,
    stok: 18,
    stok_minimum: 5,
    satuan: 'porsi',
    foto_url:
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
    is_active: true,
    hpp: 10000,
  },
  {
    id: 3,
    nama: 'Mie Goreng Spesial',
    kategori_id: 1,
    kategori_nama: 'Makanan Berat',
    harga_jual: 10000,
    stok: 0, // Habis untuk test badge "Habis"
    stok_minimum: 5,
    satuan: 'porsi',
    foto_url:
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400',
    is_active: true,
    hpp: 6500,
  },
  {
    id: 4,
    nama: 'Ayam Geprek Sambal Bawang',
    kategori_id: 1,
    kategori_nama: 'Makanan Berat',
    harga_jual: 14000,
    stok: 12,
    stok_minimum: 5,
    satuan: 'porsi',
    foto_url:
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400',
    is_active: true,
    hpp: 9500,
  },
  {
    id: 5,
    nama: 'Roti Cokelat Keju',
    kategori_id: 2,
    kategori_nama: 'Snack & Roti',
    harga_jual: 5000,
    stok: 30,
    stok_minimum: 8,
    satuan: 'pcs',
    foto_url:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    is_active: true,
    hpp: 3200,
  },
  {
    id: 6,
    nama: 'Pastel Goreng Renyah',
    kategori_id: 2,
    kategori_nama: 'Snack & Roti',
    harga_jual: 3500,
    stok: 15,
    stok_minimum: 5,
    satuan: 'pcs',
    foto_url:
      'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400',
    is_active: true,
    hpp: 2200,
  },
  {
    id: 7,
    nama: 'Risoles Mayo',
    kategori_id: 2,
    kategori_nama: 'Snack & Roti',
    harga_jual: 4000,
    stok: 3, // Stok menipis (< stok_minimum)
    stok_minimum: 5,
    satuan: 'pcs',
    foto_url:
      'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400',
    is_active: true,
    hpp: 2500,
  },
  {
    id: 8,
    nama: 'Donat Gula Halus',
    kategori_id: 2,
    kategori_nama: 'Snack & Roti',
    harga_jual: 4000,
    stok: 20,
    stok_minimum: 5,
    satuan: 'pcs',
    foto_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400',
    is_active: true,
    hpp: 2400,
  },
  {
    id: 9,
    nama: 'Es Teh Manis',
    kategori_id: 3,
    kategori_nama: 'Minuman Dingin',
    harga_jual: 4000,
    stok: 40,
    stok_minimum: 10,
    satuan: 'cup',
    foto_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    is_active: true,
    hpp: 1800,
  },
  {
    id: 10,
    nama: 'Air Mineral 600ml',
    kategori_id: 3,
    kategori_nama: 'Minuman Dingin',
    harga_jual: 4000,
    stok: 50,
    stok_minimum: 12,
    satuan: 'botol',
    foto_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400',
    is_active: true,
    hpp: 2800,
  },
  {
    id: 11,
    nama: 'Jus Jeruk Segar',
    kategori_id: 3,
    kategori_nama: 'Minuman Dingin',
    harga_jual: 7000,
    stok: 15,
    stok_minimum: 5,
    satuan: 'cup',
    foto_url:
      'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400',
    is_active: true,
    hpp: 4200,
  },
  {
    id: 12,
    nama: 'Susu UHT Cokelat',
    kategori_id: 3,
    kategori_nama: 'Minuman Dingin',
    harga_jual: 6000,
    stok: 24,
    stok_minimum: 8,
    satuan: 'kotak',
    foto_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    is_active: true,
    hpp: 4500,
  },
]

export const MOCK_SISWA: KartuSiswaMock[] = [
  {
    uid: '04A1B2C3D4',
    siswa_id: 101,
    nis: '2026001',
    nama: 'Budi Santoso',
    kelas: 'X IPA 1',
    foto_url:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    saldo: 45000,
    limit_harian: 30000,
    limit_harian_enabled: true,
    belanja_hari_ini: 10000,
    is_blocked: false,
    blocked_items: [1], // Nasi Uduk Komplit
    blocked_categories: [],
    parent_name: 'Hendra Santoso',
    parent_phone: '0812-3456-7890',
    parent_app_registered: false, // Belum instal mobile app -> butuh kontrol admin
    catatan_kontrol: 'Permintaan via WA: Kurangi konsumsi nasi berlebihan.',
    updated_at: '2026-10-05T14:20:00Z',
  },
  {
    uid: '04B2C3D4E5',
    siswa_id: 102,
    nis: '2026002',
    nama: 'Siti Rahmawati',
    kelas: 'XI IPS 2',
    foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    saldo: 200000, // Sinkron dengan saldo riil database kantin_db (hasil top-up)
    limit_harian: 25000,
    limit_harian_enabled: true,
    belanja_hari_ini: 0,
    is_blocked: false,
    blocked_items: [],
    blocked_categories: [3], // Minuman Dingin diblokir kategori
    parent_name: 'Rahmawati Ibu',
    parent_phone: '0813-9876-5432',
    parent_app_registered: false, // Belum instal mobile app -> butuh kontrol admin
    catatan_kontrol: 'Siswa batuk pilek kronis, larang semua minuman dingin.',
    updated_at: '2026-10-04T09:15:00Z',
  },
  {
    uid: '04C3D4E5F6',
    siswa_id: 103,
    nis: '2026003',
    nama: 'Ahmad Fauzi',
    kelas: 'XII IPA 3',
    foto_url:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    saldo: 80000,
    limit_harian: 35000,
    limit_harian_enabled: true,
    belanja_hari_ini: 0,
    is_blocked: true, // Untuk test validasi "Kartu diblokir"
    blocked_items: [],
    blocked_categories: [],
    parent_name: 'Fauzi Bapak',
    parent_phone: '0811-2233-4455',
    parent_app_registered: true, // Sudah instal mobile app
    updated_at: '2026-10-02T11:00:00Z',
  },
  {
    uid: '04D4E5F6A1',
    siswa_id: 104,
    nis: '2026004',
    nama: 'Cantika Kirana',
    kelas: 'X IPS 1',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    saldo: 65000,
    limit_harian: 0,
    limit_harian_enabled: false, // Tanpa Limit
    belanja_hari_ini: 5000,
    is_blocked: false,
    blocked_items: [],
    blocked_categories: [],
    parent_name: 'Dewi Lestari',
    parent_phone: '0857-1234-5678',
    parent_app_registered: false, // Belum instal mobile app
    catatan_kontrol: 'Orang tua memperbolehkan belanja tanpa batasan nominal.',
    updated_at: '2026-10-06T08:00:00Z',
  },
  {
    uid: '04E5F6A1B2',
    siswa_id: 105,
    nis: '2026005',
    nama: 'Rizky Ramadhan',
    kelas: 'XI IPA 1',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    saldo: 75000,
    limit_harian: 20000,
    limit_harian_enabled: true,
    belanja_hari_ini: 15000,
    is_blocked: false,
    blocked_items: [3, 9], // Mie Goreng & Es Teh Manis
    blocked_categories: [],
    parent_name: 'Bambang Ramadhan',
    parent_phone: '0878-5544-3322',
    parent_app_registered: false, // Belum instal mobile app
    catatan_kontrol: 'Batasan jajan ketat maksimal Rp 20.000 / hari.',
    updated_at: '2026-10-05T16:45:00Z',
  },
]

export const MOCK_SISWA_NONAKTIF: SiswaNonaktifMock[] = [
  {
    siswa_id: 201,
    nis: '2023015',
    nama: 'Raditya Pratama',
    kelas_terakhir: 'XII IPA 1 (Lulus 2026)',
    foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    saldo: 125000,
    status_siswa: 'LULUS',
    tanggal_nonaktif: '2026-06-25',
    alasan_nonaktif: 'Lulus Tahun Ajaran 2025/2026',
    rfid_uid: '04RD01A9',
    is_card_blocked: false, // Kartu lama belum diblokir, wajib diblokir otomatis saat refund
    nama_ortu: 'Hendra Santoso',
    kontak_ortu: '0812-3456-7890',
    bank_ortu: 'BCA',
    no_rekening_ortu: '8830192831',
    saudara_kandung: [
      {
        siswa_id: 101,
        nis: '2026001',
        nama: 'Budi Santoso',
        kelas: 'X IPA 1',
        foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        saldo: 45000,
        rfid_uid: '04A1B2C3D4',
        is_blocked: false,
      },
    ],
    is_refunded: false,
  },
  {
    siswa_id: 202,
    nis: '2024088',
    nama: 'Nadya Putri',
    kelas_terakhir: 'XI IPS 1 (Pindah Sekolah)',
    foto_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    saldo: 85000,
    status_siswa: 'PINDAH',
    tanggal_nonaktif: '2026-09-12',
    alasan_nonaktif: 'Pindah Domisili ke SMAN 2 Surabaya',
    rfid_uid: '04ND02B8',
    is_card_blocked: false,
    nama_ortu: 'Rahmawati Ibu',
    kontak_ortu: '0813-9876-5432',
    bank_ortu: 'BRI',
    no_rekening_ortu: '012901004928503',
    saudara_kandung: [
      {
        siswa_id: 102,
        nis: '2026002',
        nama: 'Siti Rahmawati',
        kelas: 'XI IPS 2',
        foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
        saldo: 5000,
        rfid_uid: '04B2C3D4E5',
        is_blocked: false,
      },
    ],
    is_refunded: false,
  },
  {
    siswa_id: 203,
    nis: '2023042',
    nama: 'Kevin Sanjaya',
    kelas_terakhir: 'XII IPA 2 (Lulus 2026)',
    foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    saldo: 210000,
    status_siswa: 'LULUS',
    tanggal_nonaktif: '2026-06-25',
    alasan_nonaktif: 'Lulus Tahun Ajaran 2025/2026',
    rfid_uid: '04KV03C7',
    is_card_blocked: false,
    nama_ortu: 'Sanjaya Putra',
    kontak_ortu: '0812-1122-3344',
    bank_ortu: 'MANDIRI',
    no_rekening_ortu: '1420019283741',
    saudara_kandung: [], // Tanpa saudara kandung aktif di sekolah ini -> opsi refund ke ortu
    is_refunded: false,
  },
  {
    siswa_id: 204,
    nis: '2025102',
    nama: 'Dimas Anggara',
    kelas_terakhir: 'X IPS 3 (Keluar)',
    foto_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
    saldo: 35000,
    status_siswa: 'KELUAR',
    tanggal_nonaktif: '2026-08-19',
    alasan_nonaktif: 'Pengunduran Diri Siswa',
    rfid_uid: '04DM04D6',
    is_card_blocked: false,
    nama_ortu: 'Linda Sari',
    kontak_ortu: '0815-6677-8899',
    bank_ortu: 'BNI',
    no_rekening_ortu: '0982341234',
    saudara_kandung: [],
    is_refunded: false,
  },
  {
    siswa_id: 205,
    nis: '2023099',
    nama: 'Cantika Dewi',
    kelas_terakhir: 'XII IPS 3 (Lulus 2026)',
    foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    saldo: 0,
    status_siswa: 'LULUS',
    tanggal_nonaktif: '2026-06-25',
    alasan_nonaktif: 'Lulus Tahun Ajaran 2025/2026',
    rfid_uid: '04CD05E5',
    is_card_blocked: true, // Sudah diblokir
    nama_ortu: 'Hendra Saputra',
    kontak_ortu: '0812-8877-6655',
    is_refunded: true,
    refund_info: {
      tipe: 'REFUND_ORTU',
      metode: 'TRANSFER_BANK',
      nominal: 150000,
      tanggal: '2026-07-01T10:30:00Z',
      referensi_id: 'REFUND-LULUS-20260701-1002',
      keterangan: 'Refund sisa saldo kelulusan via transfer BCA',
      bank: 'BCA',
      nomor_rekening: '5220192831',
      nama_rekening: 'Hendra Saputra',
    },
  },
]

export const MOCK_KARTU_TAMU: KartuTamuMock[] = [
  {
    id: 1,
    nomor_kartu: 'KT-001',
    uid: '04KT01A1',
    label_pemegang: 'Pak Hartono (Guru Fisika)',
    saldo: 75000,
    is_active: true,
    status: 'ACTIVE',
    created_at: '2026-10-01T08:00:00Z',
    last_used_at: '2026-10-04T12:30:00Z',
  },
  {
    id: 2,
    nomor_kartu: 'KT-002',
    uid: '04KT02B2',
    label_pemegang: 'Ibu Ratna (Staf TU)',
    saldo: 50000,
    is_active: true,
    status: 'ACTIVE',
    created_at: '2026-10-01T08:30:00Z',
    last_used_at: '2026-10-05T08:10:00Z',
  },
  {
    id: 3,
    nomor_kartu: 'KT-003',
    uid: '04KT03C3',
    label_pemegang: 'Tamu Seminar Pengawas',
    saldo: 20000,
    is_active: true,
    status: 'ACTIVE',
    created_at: '2026-10-02T09:00:00Z',
    last_used_at: '2026-10-02T13:45:00Z',
  },
  {
    id: 4,
    nomor_kartu: 'KT-004',
    uid: '04KT04D4',
    label_pemegang: 'Pak Bambang (Satpam)',
    saldo: 0,
    is_active: false,
    status: 'BLOCKED',
    created_at: '2026-10-01T09:00:00Z',
    last_used_at: '2026-10-03T11:00:00Z',
  },
  {
    id: 5,
    nomor_kartu: 'KT-005',
    uid: '04KT05E5',
    label_pemegang: '',
    saldo: 0,
    is_active: false,
    status: 'AVAILABLE',
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 6,
    nomor_kartu: 'KT-006',
    uid: '04KT06F6',
    label_pemegang: 'Ibu Sari (Kepala TU)',
    saldo: 100000,
    is_active: true,
    status: 'ACTIVE',
    created_at: '2026-10-03T07:30:00Z',
    last_used_at: '2026-10-05T07:55:00Z',
  },
]

export interface TransaksiTopupDetail {
  id: string | number
  waktu: string
  subjek_tipe: 'SISWA' | 'KARTU_TAMU'
  subjek_nama: string
  subjek_info: string
  nominal: number
  penyetor: string
  referensi_id: string
}

export interface SetoranKasTUMock {
  id: string
  tanggal: string
  petugas_id: number
  petugas_nama: string
  petugas_nip?: string
  total_transaksi: number
  total_topup_siswa: number
  total_topup_kartu_tamu: number
  total_sistem: number
  uang_fisik: number | null
  selisih: number | null
  status: 'MENUNGGU_KONFIRMASI' | 'TERKONFIRMASI'
  catatan?: string
  bendahara_id?: number | null
  bendahara_nama?: string | null
  konfirmasi_pada?: string | null
  rincian_transaksi: TransaksiTopupDetail[]
}

export interface MutasiKoreksiMock {
  id: string | number
  referensi_id: string
  waktu: string
  subjek_tipe: 'SISWA' | 'KARTU_TAMU'
  subjek_id: number
  subjek_nama: string
  subjek_info: string
  jenis_koreksi:
    | 'SALAH_INPUT_TOPUP'
    | 'PEMBALIK_TRANSAKSI_KASIR'
    | 'PENYESUAIAN_AUDIT'
  arah: 'DEBIT' | 'KREDIT'
  nominal: number
  saldo_sebelum: number
  saldo_setelah: number
  alasan: string
  bendahara_id: number
  bendahara_nama: string
  transaksi_terkait_id?: string | number
  sesi_kasir_id?: number
}

export interface TransaksiSesiTutupMock {
  id: string
  waktu: string
  sesi_kasir_id: number
  titik_kasir: string
  petugas_kasir: string
  subjek_tipe: 'SISWA' | 'KARTU_TAMU'
  subjek_id: number
  subjek_nama: string
  subjek_info: string
  total: number
  items: Array<{
    menu_id: number
    nama: string
    qty: number
    harga: number
    subtotal: number
  }>
  status: 'SELESAI' | 'DIKOREKSI'
  koreksi_referensi_id?: string
}

export const MOCK_SETORAN_KAS: SetoranKasTUMock[] = [
  {
    id: 'SETOR-20261006-001',
    tanggal: '2026-10-06',
    petugas_id: 1,
    petugas_nama: 'Andika Pratama (Petugas TU 1)',
    petugas_nip: '198805122011011002',
    total_transaksi: 4,
    total_topup_siswa: 170000,
    total_topup_kartu_tamu: 50000,
    total_sistem: 220000,
    uang_fisik: null,
    selisih: null,
    status: 'MENUNGGU_KONFIRMASI',
    rincian_transaksi: [
      {
        id: 'TX-TOPUP-001',
        waktu: '2026-10-06T07:45:12Z',
        subjek_tipe: 'SISWA',
        subjek_nama: 'Budi Santoso',
        subjek_info: 'X IPA 1 (NIS: 2026001)',
        nominal: 50000,
        penyetor: 'Orang Tua (Ibu Hendra)',
        referensi_id: 'TU-TOPUP-20261006-1021',
      },
      {
        id: 'TX-TOPUP-002',
        waktu: '2026-10-06T08:15:30Z',
        subjek_tipe: 'SISWA',
        subjek_nama: 'Siti Rahmawati',
        subjek_info: 'XI IPS 2 (NIS: 2026002)',
        nominal: 100000,
        penyetor: 'Siswa Langsung',
        referensi_id: 'TU-TOPUP-20261006-1022',
      },
      {
        id: 'TX-TOPUP-003',
        waktu: '2026-10-06T09:05:00Z',
        subjek_tipe: 'KARTU_TAMU',
        subjek_nama: 'Tamu Seminar Pengawas',
        subjek_info: 'Kartu: KT-003',
        nominal: 50000,
        penyetor: 'Panitia Acara',
        referensi_id: 'TU-TOPUP-20261006-1023',
      },
      {
        id: 'TX-TOPUP-004',
        waktu: '2026-10-06T10:20:15Z',
        subjek_tipe: 'SISWA',
        subjek_nama: 'Ahmad Fauzi',
        subjek_info: 'XII IPA 3 (NIS: 2026003)',
        nominal: 20000,
        penyetor: 'Siswa Langsung',
        referensi_id: 'TU-TOPUP-20261006-1024',
      },
    ],
  },
  {
    id: 'SETOR-20261006-002',
    tanggal: '2026-10-06',
    petugas_id: 2,
    petugas_nama: 'Ibu Ratna (Staf TU 2)',
    petugas_nip: '199203152018012003',
    total_transaksi: 2,
    total_topup_siswa: 75000,
    total_topup_kartu_tamu: 25000,
    total_sistem: 100000,
    uang_fisik: 100000,
    selisih: 0,
    status: 'TERKONFIRMASI',
    catatan: 'Uang fisik pas sesuai total sistem',
    bendahara_id: 10,
    bendahara_nama: 'Siti Rahma (Bendahara)',
    konfirmasi_pada: '2026-10-06T11:45:00Z',
    rincian_transaksi: [
      {
        id: 'TX-TOPUP-005',
        waktu: '2026-10-06T08:30:00Z',
        subjek_tipe: 'SISWA',
        subjek_nama: 'Budi Santoso',
        subjek_info: 'X IPA 1 (NIS: 2026001)',
        nominal: 75000,
        penyetor: 'Orang Tua',
        referensi_id: 'TU-TOPUP-20261006-1025',
      },
      {
        id: 'TX-TOPUP-006',
        waktu: '2026-10-06T09:40:00Z',
        subjek_tipe: 'KARTU_TAMU',
        subjek_nama: 'Pak Hartono (Guru Fisika)',
        subjek_info: 'Kartu: KT-001',
        nominal: 25000,
        penyetor: 'Pak Hartono',
        referensi_id: 'TU-TOPUP-20261006-1026',
      },
    ],
  },
  {
    id: 'SETOR-20261005-001',
    tanggal: '2026-10-05',
    petugas_id: 1,
    petugas_nama: 'Andika Pratama (Petugas TU 1)',
    petugas_nip: '198805122011011002',
    total_transaksi: 5,
    total_topup_siswa: 250000,
    total_topup_kartu_tamu: 100000,
    total_sistem: 350000,
    uang_fisik: 348000,
    selisih: -2000,
    status: 'TERKONFIRMASI',
    catatan: 'Kurang Rp2.000 karena selisih kembalian koin fisik',
    bendahara_id: 10,
    bendahara_nama: 'Siti Rahma (Bendahara)',
    konfirmasi_pada: '2026-10-05T15:30:00Z',
    rincian_transaksi: [
      {
        id: 'TX-TOPUP-007',
        waktu: '2026-10-05T08:10:00Z',
        subjek_tipe: 'SISWA',
        subjek_nama: 'Siti Rahmawati',
        subjek_info: 'XI IPS 2 (NIS: 2026002)',
        nominal: 150000,
        penyetor: 'Wali Murid',
        referensi_id: 'TU-TOPUP-20261005-0912',
      },
      {
        id: 'TX-TOPUP-008',
        waktu: '2026-10-05T10:00:00Z',
        subjek_tipe: 'KARTU_TAMU',
        subjek_nama: 'Ibu Sari (Kepala TU)',
        subjek_info: 'Kartu: KT-006',
        nominal: 100000,
        penyetor: 'Ibu Sari',
        referensi_id: 'TU-TOPUP-20261005-0913',
      },
      {
        id: 'TX-TOPUP-009',
        waktu: '2026-10-05T13:20:00Z',
        subjek_tipe: 'SISWA',
        subjek_nama: 'Ahmad Fauzi',
        subjek_info: 'XII IPA 3 (NIS: 2026003)',
        nominal: 100000,
        penyetor: 'Siswa Langsung',
        referensi_id: 'TU-TOPUP-20261005-0914',
      },
    ],
  },
  {
    id: 'SETOR-20261005-002',
    tanggal: '2026-10-05',
    petugas_id: 2,
    petugas_nama: 'Ibu Ratna (Staf TU 2)',
    petugas_nip: '199203152018012003',
    total_transaksi: 3,
    total_topup_siswa: 120000,
    total_topup_kartu_tamu: 30000,
    total_sistem: 150000,
    uang_fisik: 155000,
    selisih: 5000,
    status: 'TERKONFIRMASI',
    catatan: 'Kelebihan uang fisik Rp5.000 tanpa keterangan',
    bendahara_id: 10,
    bendahara_nama: 'Siti Rahma (Bendahara)',
    konfirmasi_pada: '2026-10-05T15:45:00Z',
    rincian_transaksi: [
      {
        id: 'TX-TOPUP-010',
        waktu: '2026-10-05T09:30:00Z',
        subjek_tipe: 'SISWA',
        subjek_nama: 'Budi Santoso',
        subjek_info: 'X IPA 1 (NIS: 2026001)',
        nominal: 120000,
        penyetor: 'Orang Tua',
        referensi_id: 'TU-TOPUP-20261005-0915',
      },
      {
        id: 'TX-TOPUP-011',
        waktu: '2026-10-05T11:15:00Z',
        subjek_tipe: 'KARTU_TAMU',
        subjek_nama: 'Pak Bambang (Satpam)',
        subjek_info: 'Kartu: KT-004',
        nominal: 30000,
        penyetor: 'Pak Bambang',
        referensi_id: 'TU-TOPUP-20261005-0916',
      },
    ],
  },
]

export const MOCK_KOREKSI_BENDAHARA: MutasiKoreksiMock[] = [
  {
    id: 'KOR-20261005-001',
    referensi_id: 'BA-KOR-20261005-001',
    waktu: '2026-10-05T16:00:00Z',
    subjek_tipe: 'SISWA',
    subjek_id: 101,
    subjek_nama: 'Budi Santoso',
    subjek_info: 'X IPA 1 (NIS: 2026001)',
    jenis_koreksi: 'SALAH_INPUT_TOPUP',
    arah: 'DEBIT',
    nominal: 50000,
    saldo_sebelum: 95000,
    saldo_setelah: 45000,
    alasan:
      'Koreksi salah input petugas TU: tertulis Rp100.000 seharusnya Rp50.000 pada bukti TU-TOPUP-20261005-0910',
    bendahara_id: 10,
    bendahara_nama: 'Siti Rahma (Bendahara)',
  },
  {
    id: 'KOR-20261004-001',
    referensi_id: 'BA-KOR-20261004-001',
    waktu: '2026-10-04T17:30:00Z',
    subjek_tipe: 'SISWA',
    subjek_id: 102,
    subjek_nama: 'Siti Rahmawati',
    subjek_info: 'XI IPS 2 (NIS: 2026002)',
    jenis_koreksi: 'PEMBALIK_TRANSAKSI_KASIR',
    arah: 'KREDIT',
    nominal: 15000,
    saldo_sebelum: 20000,
    saldo_setelah: 35000,
    alasan:
      'Pembalik transaksi TRX-20261004-8901 pada sesi kasir #88 yang sudah ditutup (kartu tersenggol ganda)',
    bendahara_id: 10,
    bendahara_nama: 'Siti Rahma (Bendahara)',
    transaksi_terkait_id: 'TRX-20261004-8901',
    sesi_kasir_id: 88,
  },
  {
    id: 'KOR-20261003-001',
    referensi_id: 'BA-KOR-20261003-001',
    waktu: '2026-10-03T14:15:00Z',
    subjek_tipe: 'KARTU_TAMU',
    subjek_id: 1,
    subjek_nama: 'Pak Hartono (Guru Fisika)',
    subjek_info: 'Kartu: KT-001',
    jenis_koreksi: 'PENYESUAIAN_AUDIT',
    arah: 'KREDIT',
    nominal: 25000,
    saldo_sebelum: 50000,
    saldo_setelah: 75000,
    alasan: 'Penyesuaian audit saldo awal migrasi data kartu tamu guru',
    bendahara_id: 10,
    bendahara_nama: 'Siti Rahma (Bendahara)',
  },
]

export const MOCK_TRANSAKSI_SESI_TUTUP: TransaksiSesiTutupMock[] = [
  {
    id: 'TRX-20261005-9011',
    waktu: '2026-10-05T11:30:20Z',
    sesi_kasir_id: 98,
    titik_kasir: 'Kasir 1 - Kantin Utama',
    petugas_kasir: 'Ahmad Kasir',
    subjek_tipe: 'SISWA',
    subjek_id: 101,
    subjek_nama: 'Budi Santoso',
    subjek_info: 'X IPA 1 (NIS: 2026001)',
    total: 19000,
    items: [
      {
        menu_id: 2,
        nama: 'Nasi Goreng Ayam',
        qty: 1,
        harga: 15000,
        subtotal: 15000,
      },
      { menu_id: 9, nama: 'Es Teh Manis', qty: 1, harga: 4000, subtotal: 4000 },
    ],
    status: 'SELESAI',
  },
  {
    id: 'TRX-20261005-9012',
    waktu: '2026-10-05T12:05:10Z',
    sesi_kasir_id: 98,
    titik_kasir: 'Kasir 1 - Kantin Utama',
    petugas_kasir: 'Ahmad Kasir',
    subjek_tipe: 'SISWA',
    subjek_id: 102,
    subjek_nama: 'Siti Rahmawati',
    subjek_info: 'XI IPS 2 (NIS: 2026002)',
    total: 14000,
    items: [
      {
        menu_id: 4,
        nama: 'Ayam Geprek Sambal Bawang',
        qty: 1,
        harga: 14000,
        subtotal: 14000,
      },
    ],
    status: 'SELESAI',
  },
  {
    id: 'TRX-20261005-9013',
    waktu: '2026-10-05T12:20:45Z',
    sesi_kasir_id: 98,
    titik_kasir: 'Kasir 1 - Kantin Utama',
    petugas_kasir: 'Ahmad Kasir',
    subjek_tipe: 'KARTU_TAMU',
    subjek_id: 2,
    subjek_nama: 'Ibu Ratna (Staf TU)',
    subjek_info: 'Kartu: KT-002',
    total: 20000,
    items: [
      {
        menu_id: 1,
        nama: 'Nasi Uduk Komplit',
        qty: 1,
        harga: 12000,
        subtotal: 12000,
      },
      {
        menu_id: 5,
        nama: 'Roti Cokelat Keju',
        qty: 1,
        harga: 5000,
        subtotal: 5000,
      },
      {
        menu_id: 10,
        nama: 'Air Mineral 600ml',
        qty: 1,
        harga: 3000,
        subtotal: 3000,
      },
    ],
    status: 'SELESAI',
  },
  {
    id: 'TRX-20261004-8901',
    waktu: '2026-10-04T12:45:00Z',
    sesi_kasir_id: 88,
    titik_kasir: 'Kasir 2 - Pujasera Samping',
    petugas_kasir: 'Ahmad Kasir',
    subjek_tipe: 'SISWA',
    subjek_id: 102,
    subjek_nama: 'Siti Rahmawati',
    subjek_info: 'XI IPS 2 (NIS: 2026002)',
    total: 15000,
    items: [
      {
        menu_id: 2,
        nama: 'Nasi Goreng Ayam',
        qty: 1,
        harga: 15000,
        subtotal: 15000,
      },
    ],
    status: 'DIKOREKSI',
    koreksi_referensi_id: 'BA-KOR-20261004-001',
  },
]

// ==========================================
// PENGATURAN OPERASIONAL KANTIN & TITIK KASIR (PRD §9.1 & §10)
// ==========================================

export interface PengaturanKantinMock {
  sekolah_id?: number
  nama_kantin: string
  jam_tutup_kasir: string
  jam_tutup_otomatis?: string
  konfirmasi_manual: boolean
  durasi_foto_detik: number
  min_topup: number
  max_topup: number
  max_saldo_siswa: number
  max_saldo_kartu_tamu: number
  disimpan?: boolean
  updated_at?: string
  updated_by?: string
}

export interface TitikKasirMock {
  id: number
  sekolah_id: number
  nama: string
  kode: string
  is_active: boolean
  aktif?: boolean
  created_at: string
  updated_at: string
}

export const MOCK_PENGATURAN_KANTIN: PengaturanKantinMock = {
  sekolah_id: 1,
  nama_kantin: 'Kantin Sehat SKOOLIA',
  jam_tutup_kasir: '23:59',
  jam_tutup_otomatis: '23:59:00',
  konfirmasi_manual: false,
  durasi_foto_detik: 3,
  min_topup: 5000,
  max_topup: 500000,
  max_saldo_siswa: 1000000,
  max_saldo_kartu_tamu: 500000,
  disimpan: true,
  updated_at: '2026-10-01T08:00:00Z',
  updated_by: 'Admin Sekolah',
}

export const MOCK_TITIK_KASIR: TitikKasirMock[] = [
  {
    id: 1,
    sekolah_id: 1,
    nama: 'Kasir 1 - Kantin Utama',
    kode: 'POS-01',
    is_active: true,
    aktif: true,
    created_at: '2026-09-01T07:00:00Z',
    updated_at: '2026-09-01T07:00:00Z',
  },
  {
    id: 2,
    sekolah_id: 1,
    nama: 'Kasir 2 - Pujasera Samping',
    kode: 'POS-02',
    is_active: true,
    aktif: true,
    created_at: '2026-09-10T07:00:00Z',
    updated_at: '2026-09-10T07:00:00Z',
  },
  {
    id: 3,
    sekolah_id: 1,
    nama: 'Kasir 3 - Koperasi & Snack',
    kode: 'POS-03',
    is_active: false,
    aktif: false,
    created_at: '2026-09-15T07:00:00Z',
    updated_at: '2026-09-15T07:00:00Z',
  },
]

// ==========================================
// MOCK DATA LAPORAN & REKONSILIASI (PRD §9.5, §5)
// ==========================================

export interface KerugianStokMock {
  id: number
  waktu: string
  menu_id: number
  nama_menu: string
  kategori_nama: string
  jenis: 'OPNAME_KELUAR' | 'BARANG_RUSAK'
  qty: number
  hpp_snapshot: number
  total_nilai: number
  alasan: string
  berita_acara_id: string
  petugas: string
}

export const MOCK_KERUGIAN_STOK: KerugianStokMock[] = [
  {
    id: 1,
    waktu: '2026-10-06T15:45:00Z',
    menu_id: 1,
    nama_menu: 'Nasi Uduk Komplit',
    kategori_nama: 'Makanan Berat',
    jenis: 'BARANG_RUSAK',
    qty: 3,
    hpp_snapshot: 9000,
    total_nilai: 27000,
    alasan: 'Sisa basi tidak terjual setelah tutup operasional',
    berita_acara_id: 'BA-RSK-20261006-001',
    petugas: 'Siti Aminah (Pengelola)',
  },
  {
    id: 2,
    waktu: '2026-10-05T16:10:00Z',
    menu_id: 5,
    nama_menu: 'Roti Cokelat Keju',
    kategori_nama: 'Snack & Roti',
    jenis: 'BARANG_RUSAK',
    qty: 4,
    hpp_snapshot: 3500,
    total_nilai: 14000,
    alasan: 'Kemasan sobek digigit tikus di gudang',
    berita_acara_id: 'BA-RSK-20261005-002',
    petugas: 'Bambang Sudiro',
  },
  {
    id: 3,
    waktu: '2026-10-04T17:00:00Z',
    menu_id: 10,
    nama_menu: 'Air Mineral 600ml',
    kategori_nama: 'Minuman',
    jenis: 'OPNAME_KELUAR',
    qty: 5,
    hpp_snapshot: 2000,
    total_nilai: 10000,
    alasan: 'Selisih fisik opname berkurang 5 botol saat audit mingguan',
    berita_acara_id: 'BA-OPN-20261004-001',
    petugas: 'Siti Aminah (Pengelola)',
  },
  {
    id: 4,
    waktu: '2026-10-02T16:30:00Z',
    menu_id: 9,
    nama_menu: 'Es Teh Manis',
    kategori_nama: 'Minuman',
    jenis: 'OPNAME_KELUAR',
    qty: 8,
    hpp_snapshot: 1500,
    total_nilai: 12000,
    alasan: 'Bahan tumpah saat penyiapan dispenser kasir',
    berita_acara_id: 'BA-OPN-20261002-003',
    petugas: 'Ahmad Kasir',
  },
  {
    id: 5,
    waktu: '2026-10-01T15:20:00Z',
    menu_id: 7,
    nama_menu: 'Pisang Goreng Crispy',
    kategori_nama: 'Snack & Roti',
    jenis: 'BARANG_RUSAK',
    qty: 6,
    hpp_snapshot: 2000,
    total_nilai: 12000,
    alasan: 'Gosong saat penggorengan jam istirahat pertama',
    berita_acara_id: 'BA-RSK-20261001-001',
    petugas: 'Nurul Hidayah',
  },
]

export interface RiwayatSiswaDetailMock {
  id: string
  waktu: string
  jenis: 'BELANJA' | 'TOPUP_TUNAI' | 'TOPUP_ONLINE' | 'VOID' | 'REFUND' | 'KOREKSI'
  arah: 'DEBIT' | 'KREDIT'
  nominal: number
  saldo_setelah: number
  titik_kasir: string
  petugas: string
  referensi_id: string
  keterangan: string
  items?: {
    nama: string
    qty: number
    harga: number
    subtotal: number
  }[]
}

export const MOCK_RIWAYAT_SISWA: Record<number, RiwayatSiswaDetailMock[]> = {
  101: [
    {
      id: 'TRX-20261008-0101',
      waktu: '2026-10-08T09:45:00Z',
      jenis: 'BELANJA',
      arah: 'DEBIT',
      nominal: 19000,
      saldo_setelah: 45000,
      titik_kasir: 'Kasir 1 - Kantin Utama',
      petugas: 'Ahmad Kasir',
      referensi_id: 'TRX-20261008-0101',
      keterangan: 'Pembelian makan istirahat 1',
      items: [
        { nama: 'Nasi Goreng Ayam', qty: 1, harga: 15000, subtotal: 15000 },
        { nama: 'Es Teh Manis', qty: 1, harga: 4000, subtotal: 4000 },
      ],
    },
    {
      id: 'TOP-20261007-0045',
      waktu: '2026-10-07T08:15:00Z',
      jenis: 'TOPUP_TUNAI',
      arah: 'KREDIT',
      nominal: 50000,
      saldo_setelah: 64000,
      titik_kasir: 'Loket TU Lantai 1',
      petugas: 'Siti Rahayu (TU)',
      referensi_id: 'TU-TOP-20261007-0045',
      keterangan: 'Top-up tunai siswa via wali murid',
    },
    {
      id: 'TRX-20261006-0089',
      waktu: '2026-10-06T12:10:00Z',
      jenis: 'BELANJA',
      arah: 'DEBIT',
      nominal: 14000,
      saldo_setelah: 14000,
      titik_kasir: 'Kasir 1 - Kantin Utama',
      petugas: 'Ahmad Kasir',
      referensi_id: 'TRX-20261006-0089',
      keterangan: 'Pembelian makan siang',
      items: [
        { nama: 'Ayam Geprek Sambal Bawang', qty: 1, harga: 14000, subtotal: 14000 },
      ],
    },
    {
      id: 'TRX-20261005-9011',
      waktu: '2026-10-05T11:30:20Z',
      jenis: 'BELANJA',
      arah: 'DEBIT',
      nominal: 19000,
      saldo_setelah: 28000,
      titik_kasir: 'Kasir 1 - Kantin Utama',
      petugas: 'Ahmad Kasir',
      referensi_id: 'TRX-20261005-9011',
      keterangan: 'Makan siang kantin utama',
      items: [
        { nama: 'Nasi Goreng Ayam', qty: 1, harga: 15000, subtotal: 15000 },
        { nama: 'Es Teh Manis', qty: 1, harga: 4000, subtotal: 4000 },
      ],
    },
  ],
  102: [
    {
      id: 'TRX-20261005-9012',
      waktu: '2026-10-05T12:05:10Z',
      jenis: 'BELANJA',
      arah: 'DEBIT',
      nominal: 14000,
      saldo_setelah: 5000,
      titik_kasir: 'Kasir 1 - Kantin Utama',
      petugas: 'Ahmad Kasir',
      referensi_id: 'TRX-20261005-9012',
      keterangan: 'Makan siang ayam geprek',
      items: [
        { nama: 'Ayam Geprek Sambal Bawang', qty: 1, harga: 14000, subtotal: 14000 },
      ],
    },
    {
      id: 'KOR-20261004-001',
      waktu: '2026-10-04T13:30:00Z',
      jenis: 'KOREKSI',
      arah: 'KREDIT',
      nominal: 15000,
      saldo_setelah: 19000,
      titik_kasir: 'Ruang Bendahara',
      petugas: 'Dra. Hj. Nurul (Bendahara)',
      referensi_id: 'BA-KOR-20261004-001',
      keterangan: 'Pengembalian dana pembatalan kartu tersenggol ganda TRX-20261004-8901',
    },
  ],
}


