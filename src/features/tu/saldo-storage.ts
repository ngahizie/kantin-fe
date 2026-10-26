import { MOCK_SISWA, type KartuSiswaMock } from '@/mocks/mock-data'

export const KANTIN_SALDO_STORAGE_KEY = 'kantin_siswa_saldo_overrides'

/**
 * Membaca ID sekolah pengguna yang sedang aktif dari storage autentikasi FE.
 */
export function getCurrentSekolahId(): number | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  try {
    const raw = window.localStorage.getItem('kantin_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      const id = parsed?.sekolahId ?? parsed?.sekolah_id
      if (typeof id === 'number' && !Number.isNaN(id)) {
        return id
      }
    }
  } catch {
    // noop
  }
  return null
}

/**
 * Menghasilkan kunci storage lokal yang terisolasi per sekolah atau global sebagai fallback.
 */
export function getTenantSaldoStorageKey(sekolahId?: number | null): string {
  const sId = sekolahId ?? getCurrentSekolahId()
  if (sId) {
    return `${KANTIN_SALDO_STORAGE_KEY}_${sId}`
  }
  return KANTIN_SALDO_STORAGE_KEY
}

/**
 * Membaca peta saldo siswa yang tersimpan di localStorage.
 * Mengembalikan objek Record<number, number> berisi pasangan siswa_id -> saldo.
 */
export function getStoredSaldoOverrides(
  sekolahId?: number | null
): Record<number, number> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }

  try {
    const tenantKey = getTenantSaldoStorageKey(sekolahId)
    let raw = window.localStorage.getItem(tenantKey)
    // Jika belum ada data di tenant key khusus, coba baca dari default global key
    if (!raw && tenantKey !== KANTIN_SALDO_STORAGE_KEY) {
      raw = window.localStorage.getItem(KANTIN_SALDO_STORAGE_KEY)
    }
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}

    const result: Record<number, number> = {}
    for (const [key, val] of Object.entries(parsed)) {
      const numKey = Number(key)
      const numVal = Number(val)
      if (!Number.isNaN(numKey) && !Number.isNaN(numVal)) {
        result[numKey] = numVal
      }
    }
    return result
  } catch {
    return {}
  }
}

/**
 * Menyimpan saldo terbaru siswa ke localStorage dan memperbarui data mock di memori.
 */
export function saveStoredSaldo(
  siswaId: number,
  newSaldo: number,
  sekolahId?: number | null
): void {
  if (Number.isNaN(siswaId) || Number.isNaN(newSaldo)) return

  // 1. Update in-memory MOCK_SISWA agar komponen lain yang membaca MOCK_SISWA langsung sinkron
  const found = MOCK_SISWA.find((s) => s.siswa_id === siswaId)
  if (found) {
    found.saldo = newSaldo
  }

  // 2. Simpan ke localStorage agar tidak hilang saat pengguna melakukan refresh halaman
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const tenantKey = getTenantSaldoStorageKey(sekolahId)
      const current = getStoredSaldoOverrides(sekolahId)
      current[siswaId] = newSaldo
      window.localStorage.setItem(tenantKey, JSON.stringify(current))

      // Sinkronkan juga ke default global key untuk kompatibilitas penuh antar-komponen
      if (tenantKey !== KANTIN_SALDO_STORAGE_KEY) {
        try {
          const rawGlobal = window.localStorage.getItem(KANTIN_SALDO_STORAGE_KEY)
          const currentGlobal: Record<number, number> = rawGlobal
            ? JSON.parse(rawGlobal)
            : {}
          currentGlobal[siswaId] = newSaldo
          window.localStorage.setItem(
            KANTIN_SALDO_STORAGE_KEY,
            JSON.stringify(currentGlobal)
          )
        } catch {
          // ignore
        }
      }
    } catch {
      // Abaikan jika localStorage diblokir oleh preferensi browser pengguna
    }
  }
}

/**
 * Menerapkan saldo dari storage lokal ke daftar siswa yang diberikan.
 */
export function applyStoredSaldoOverrides<
  T extends { siswa_id: number; saldo?: number },
>(students: T[], sekolahId?: number | null): T[] {
  const overrides = getStoredSaldoOverrides(sekolahId)
  if (Object.keys(overrides).length === 0) {
    return students
  }

  return students.map((s) => {
    const stored = overrides[s.siswa_id]
    if (typeof stored === 'number') {
      return { ...s, saldo: stored }
    }
    return s
  })
}

/**
 * Mengambil daftar siswa awal dengan saldo yang telah disinkronkan dari penyimpanan lokal.
 */
export function getInitialStudents(
  sekolahId?: number | null
): KartuSiswaMock[] {
  return applyStoredSaldoOverrides(MOCK_SISWA, sekolahId)
}

/**
 * Menghapus cache saldo di storage lokal (berguna untuk pengujian unit atau reset data).
 */
export function clearStoredSaldoOverrides(sekolahId?: number | null): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const tenantKey = getTenantSaldoStorageKey(sekolahId)
      window.localStorage.removeItem(tenantKey)
      window.localStorage.removeItem(KANTIN_SALDO_STORAGE_KEY)
    } catch {
      // noop
    }
  }
}

export const KANTIN_TOPUP_TRANSACTIONS_KEY = 'kantin_topup_transactions'

export interface StoredTopupTransaction {
  id: string | number
  waktu: string
  subjek_tipe: 'SISWA' | 'KARTU_TAMU'
  subjek_nama: string
  subjek_info: string
  nominal: number
  penyetor: string
  referensi_id: string
  tanggal?: string
  petugas_id?: number
}

// Data transaksi awal hari ini (2026-10-26) yang sinkron dengan ledger database kantin_db (Total: Rp 480.000)
const SEED_TOPUP_TODAY: StoredTopupTransaction[] = [
  {
    id: 'TU-TOPUP-20261026-3746',
    waktu: '2026-10-26T03:23:23.000Z',
    subjek_tipe: 'SISWA',
    subjek_nama: 'Siti Rahmawati',
    subjek_info: 'XI IPS 2 (NIS: 2026002)',
    nominal: 200000,
    penyetor: 'Siswa Langsung',
    referensi_id: 'TU-TOPUP-20261026-3746',
    tanggal: '2026-10-26',
    petugas_id: 2,
  },
  {
    id: 'TU-TOPUP-20261026-9091',
    waktu: '2026-10-26T04:37:15.000Z',
    subjek_tipe: 'SISWA',
    subjek_nama: 'Budi Santoso',
    subjek_info: 'X IPA 1 (NIS: 2026001)',
    nominal: 100000,
    penyetor: 'Orang Tua',
    referensi_id: 'TU-TOPUP-20261026-9091',
    tanggal: '2026-10-26',
    petugas_id: 2,
  },
  {
    id: 'KT-TOPUP-20261026-1927',
    waktu: '2026-10-26T03:21:19.000Z',
    subjek_tipe: 'KARTU_TAMU',
    subjek_nama: 'Budi (Guru)',
    subjek_info: 'Kartu: KT-DEMO-001',
    nominal: 50000,
    penyetor: 'Tamu Langsung',
    referensi_id: 'KT-TOPUP-20261026-1927',
    tanggal: '2026-10-26',
    petugas_id: 2,
  },
  {
    id: 'TU-TOPUP-20261026-1340',
    waktu: '2026-10-26T03:18:42.000Z',
    subjek_tipe: 'SISWA',
    subjek_nama: 'Budi Santoso',
    subjek_info: 'X IPA 1 (NIS: 2026001)',
    nominal: 50000,
    penyetor: 'Siswa Langsung',
    referensi_id: 'TU-TOPUP-20261026-1340',
    tanggal: '2026-10-26',
    petugas_id: 2,
  },
  {
    id: 'KT-TOPUP-20261026-9285',
    waktu: '2026-10-26T03:32:45.000Z',
    subjek_tipe: 'KARTU_TAMU',
    subjek_nama: 'Sari (Staf TU)',
    subjek_info: 'Kartu: KT-DEMO-002',
    nominal: 20000,
    penyetor: 'Tamu Langsung',
    referensi_id: 'KT-TOPUP-20261026-9285',
    tanggal: '2026-10-26',
    petugas_id: 2,
  },
  {
    id: 'TU-TOPUP-20261026-7879',
    waktu: '2026-10-26T04:36:56.000Z',
    subjek_tipe: 'SISWA',
    subjek_nama: 'Budi Santoso',
    subjek_info: 'X IPA 1 (NIS: 2026001)',
    nominal: 20000,
    penyetor: 'Siswa Langsung',
    referensi_id: 'TU-TOPUP-20261026-7879',
    tanggal: '2026-10-26',
    petugas_id: 2,
  },
  {
    id: 'TU-TOPUP-20261026-9019',
    waktu: '2026-10-26T04:37:44.000Z',
    subjek_tipe: 'SISWA',
    subjek_nama: 'Budi Santoso',
    subjek_info: 'X IPA 1 (NIS: 2026001)',
    nominal: 20000,
    penyetor: 'Siswa Langsung',
    referensi_id: 'TU-TOPUP-20261026-9019',
    tanggal: '2026-10-26',
    petugas_id: 2,
  },
  {
    id: 'TEST-REF-9999',
    waktu: '2026-10-26T02:42:18.000Z',
    subjek_tipe: 'SISWA',
    subjek_nama: 'Budi Santoso',
    subjek_info: 'X IPA 1 (NIS: 2026001)',
    nominal: 20000,
    penyetor: 'Petugas TU',
    referensi_id: 'TEST-REF-9999',
    tanggal: '2026-10-26',
    petugas_id: 2,
  },
]

/**
 * Mengambil daftar rincian transaksi top-up dari localStorage (atau seed default).
 */
export function getStoredTopupTransactions(
  tanggal?: string,
  petugasId?: number
): StoredTopupTransaction[] {
  let all: StoredTopupTransaction[] = []

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(KANTIN_TOPUP_TRANSACTIONS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          all = parsed
        }
      }
    } catch {
      // noop
    }
  }

  // Jika belum ada di storage, inisialisasi dengan seed default hari ini
  if (all.length === 0) {
    all = [...SEED_TOPUP_TODAY]
  }

  return all.filter((tx) => {
    const matchTanggal = !tanggal || !tx.tanggal || tx.tanggal === tanggal
    const matchPetugas =
      petugasId === undefined || !tx.petugas_id || tx.petugas_id === petugasId
    return matchTanggal && matchPetugas
  })
}

function getActiveUser(): { userId?: number | string; nama?: string } | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem('kantin_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Menyimpan transaksi top-up baru ke localStorage.
 */
export function saveTopupTransaction(
  tx: Omit<StoredTopupTransaction, 'tanggal' | 'petugas_id'> & {
    tanggal?: string
    petugas_id?: number
  }
): void {
  const tgl = tx.tanggal || new Date().toISOString().slice(0, 10)
  const activeUser = getActiveUser()
  const fallbackPetugasId = activeUser?.userId ? Number(activeUser.userId) : 2

  const fullTx: StoredTopupTransaction = {
    ...tx,
    tanggal: tgl,
    petugas_id: tx.petugas_id ?? fallbackPetugasId,
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const current = getStoredTopupTransactions()
      // Hindari duplikasi berdasarkan referensi_id
      const exists = current.some(
        (t) => t.referensi_id === fullTx.referensi_id
      )
      if (!exists) {
        const updated = [fullTx, ...current]
        window.localStorage.setItem(
          KANTIN_TOPUP_TRANSACTIONS_KEY,
          JSON.stringify(updated)
        )
      }
    } catch {
      // noop
    }
  }
}

export const KANTIN_SETORAN_CONFIRMATIONS_KEY = 'kantin_setoran_confirmations'

export interface StoredSetoranConfirmation {
  id: string
  tanggal: string
  petugas_id: number
  uang_fisik: number
  selisih: number
  status: 'TERKONFIRMASI'
  catatan?: string
  bendahara_nama?: string
  konfirmasi_pada?: string
}

/**
 * Membaca peta konfirmasi setoran kas TU yang tersimpan di storage lokal.
 */
export function getStoredSetoranConfirmations(): Record<
  string,
  StoredSetoranConfirmation
> {
  if (typeof window === 'undefined' || !window.localStorage) return {}
  try {
    const raw = window.localStorage.getItem(KANTIN_SETORAN_CONFIRMATIONS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Menyimpan data konfirmasi setoran kas TU ke storage lokal.
 */
export function saveStoredSetoranConfirmation(item: {
  id: string
  tanggal: string
  petugas_id: number
  uang_fisik?: number | null
  selisih?: number | null
  catatan?: string
  bendahara_nama?: string | null
  konfirmasi_pada?: string | null
}): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const current = getStoredSetoranConfirmations()
    const record: StoredSetoranConfirmation = {
      id: item.id,
      tanggal: item.tanggal,
      petugas_id: item.petugas_id,
      uang_fisik: item.uang_fisik ?? 0,
      selisih: item.selisih ?? 0,
      status: 'TERKONFIRMASI',
      catatan: item.catatan,
      bendahara_nama: item.bendahara_nama || undefined,
      konfirmasi_pada: item.konfirmasi_pada || new Date().toISOString(),
    }
    current[item.id] = record
    current[`${item.tanggal}_${item.petugas_id}`] = record
    window.localStorage.setItem(
      KANTIN_SETORAN_CONFIRMATIONS_KEY,
      JSON.stringify(current)
    )
  } catch {
    // noop
  }
}

/**
 * Menerapkan data konfirmasi setoran kas yang tersimpan di storage lokal pada daftar setoran.
 */
export function applyStoredSetoranConfirmations<
  T extends {
    id: string
    tanggal: string
    petugas_id: number
    uang_fisik?: number | null
    selisih?: number | null
    status: 'MENUNGGU_KONFIRMASI' | 'TERKONFIRMASI'
    catatan?: string
    bendahara_nama?: string | null
    konfirmasi_pada?: string | null
  },
>(items: T[]): T[] {
  const confirmations = getStoredSetoranConfirmations()
  if (Object.keys(confirmations).length === 0) return items

  return items.map((item) => {
    const saved =
      confirmations[item.id] ||
      confirmations[`${item.tanggal}_${item.petugas_id}`]
    if (saved) {
      return {
        ...item,
        uang_fisik: saved.uang_fisik,
        selisih: saved.selisih,
        status: 'TERKONFIRMASI',
        catatan: saved.catatan || item.catatan,
        bendahara_nama: saved.bendahara_nama || item.bendahara_nama,
        konfirmasi_pada: saved.konfirmasi_pada || item.konfirmasi_pada,
      }
    }
    return item
  })
}

