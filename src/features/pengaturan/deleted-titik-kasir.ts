const DELETED_TITIK_KASIR_STORAGE_KEY = 'skoolia_deleted_titik_kasir_ids'

export function getDeletedTitikKasirIds(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DELETED_TITIK_KASIR_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
    }
    return []
  } catch {
    return []
  }
}

export function addDeletedTitikKasirId(id: number): void {
  if (typeof window === 'undefined' || typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return
  try {
    const current = getDeletedTitikKasirIds()
    if (!current.includes(id)) {
      current.push(id)
      localStorage.setItem(
        DELETED_TITIK_KASIR_STORAGE_KEY,
        JSON.stringify(current)
      )
    }
  } catch {
    // ignore
  }
}

export function removeDeletedTitikKasirId(id: number): void {
  if (typeof window === 'undefined') return
  try {
    const current = getDeletedTitikKasirIds().filter(
      (existingId) => existingId !== id
    )
    localStorage.setItem(
      DELETED_TITIK_KASIR_STORAGE_KEY,
      JSON.stringify(current)
    )
  } catch {
    // ignore
  }
}

/**
 * Self-healing: bersihkan ID dari daftar terhapus jika entitas tersebut
 * berstatus aktif di server database agar tidak tersembunyi karena desinkronisasi lokal.
 */
export function cleanupDeletedTitikKasirIds(activeServerIds: number[]): void {
  if (typeof window === 'undefined' || !Array.isArray(activeServerIds) || activeServerIds.length === 0) return
  try {
    const current = getDeletedTitikKasirIds()
    const cleaned = current.filter((id) => !activeServerIds.includes(id))
    if (cleaned.length !== current.length) {
      localStorage.setItem(
        DELETED_TITIK_KASIR_STORAGE_KEY,
        JSON.stringify(cleaned)
      )
    }
  } catch {
    // ignore
  }
}

export function clearAllDeletedTitikKasirIds(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(DELETED_TITIK_KASIR_STORAGE_KEY)
  } catch {
    // ignore
  }
}
