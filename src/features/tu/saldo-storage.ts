import { MOCK_SISWA, type KartuSiswaMock } from '@/mocks/mock-data'

export const KANTIN_SALDO_STORAGE_KEY = 'kantin_siswa_saldo_overrides'

/**
 * Membaca peta saldo siswa yang tersimpan di localStorage.
 * Mengembalikan objek Record<number, number> berisi pasangan siswa_id -> saldo.
 */
export function getStoredSaldoOverrides(): Record<number, number> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(KANTIN_SALDO_STORAGE_KEY)
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
export function saveStoredSaldo(siswaId: number, newSaldo: number): void {
  if (Number.isNaN(siswaId) || Number.isNaN(newSaldo)) return

  // 1. Update in-memory MOCK_SISWA agar komponen lain yang membaca MOCK_SISWA langsung sinkron
  const found = MOCK_SISWA.find((s) => s.siswa_id === siswaId)
  if (found) {
    found.saldo = newSaldo
  }

  // 2. Simpan ke localStorage agar tidak hilang saat pengguna melakukan refresh halaman
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const current = getStoredSaldoOverrides()
      current[siswaId] = newSaldo
      window.localStorage.setItem(
        KANTIN_SALDO_STORAGE_KEY,
        JSON.stringify(current)
      )
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
>(students: T[]): T[] {
  const overrides = getStoredSaldoOverrides()
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
export function getInitialStudents(): KartuSiswaMock[] {
  return applyStoredSaldoOverrides(MOCK_SISWA)
}

/**
 * Menghapus cache saldo di storage lokal (berguna untuk pengujian unit atau reset data).
 */
export function clearStoredSaldoOverrides(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(KANTIN_SALDO_STORAGE_KEY)
    } catch {
      // noop
    }
  }
}
