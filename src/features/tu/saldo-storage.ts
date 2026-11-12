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
 * Menyimpan saldo terbaru siswa ke localStorage.
 */
export function saveStoredSaldo(
  siswaId: number,
  newSaldo: number,
  sekolahId?: number | null
): void {
  if (Number.isNaN(siswaId) || Number.isNaN(newSaldo)) return

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
  siswa_nama: string
  siswa_info: string
  nominal: number
  penyetor: string
  referensi_id: string
  tanggal?: string
  petugas_id?: number
}

interface LegacyStoredTopupRaw {
  id?: string | number
  waktu?: string
  subjek_tipe?: string
  subjek_nama?: string
  subjek_info?: string
  siswa_nama?: string
  siswa_info?: string
  nominal?: number
  penyetor?: string
  referensi_id?: string
  tanggal?: string
  petugas_id?: number
}

/**
 * Mengambil daftar rincian transaksi top-up siswa dari localStorage.
 * Entri lama non-siswa (kartu tamu) otomatis diabaikan & dimigrasikan.
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
          let needsMigration = false
          const migrated: StoredTopupTransaction[] = []
          for (const item of parsed as LegacyStoredTopupRaw[]) {
            if (item?.subjek_tipe && item.subjek_tipe !== 'SISWA') {
              needsMigration = true
              continue
            }
            if (item?.subjek_tipe || item?.subjek_nama || item?.subjek_info) {
              needsMigration = true
            }
            migrated.push({
              id: item.id ?? item.referensi_id ?? '',
              waktu: item.waktu ?? '',
              siswa_nama: item.siswa_nama ?? item.subjek_nama ?? '-',
              siswa_info: item.siswa_info ?? item.subjek_info ?? '-',
              nominal: Number(item.nominal ?? 0),
              penyetor: item.penyetor ?? '-',
              referensi_id: item.referensi_id ?? String(item.id ?? ''),
              tanggal: item.tanggal,
              petugas_id: item.petugas_id,
            })
          }
          if (needsMigration) {
            window.localStorage.setItem(
              KANTIN_TOPUP_TRANSACTIONS_KEY,
              JSON.stringify(migrated)
            )
          }
          all = migrated
        }
      }
    } catch {
      // noop
    }
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

export type StatusSetoranKas =
  | 'MENUNGGU'
  | 'MENUNGGU_KONFIRMASI'
  | 'DIKONFIRMASI'
  | 'TERKONFIRMASI'

export interface StoredSetoranConfirmation {
  id: string
  tanggal: string
  petugas_id: number
  uang_fisik: number
  selisih: number
  status: 'DIKONFIRMASI' | 'TERKONFIRMASI'
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
    status: StatusSetoranKas
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

