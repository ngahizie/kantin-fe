const DELETED_TITIK_KASIR_STORAGE_KEY = 'skoolia_deleted_titik_kasir_ids'

export function getDeletedTitikKasirIds(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DELETED_TITIK_KASIR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addDeletedTitikKasirId(id: number): void {
  if (typeof window === 'undefined') return
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
