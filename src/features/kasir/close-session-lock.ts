import type { SesiKasirData } from './types'

export const KANTIN_CLOSE_SESSION_LOCKS_KEY =
  'kantin_kasir_close_session_locks'

export interface CloseSessionLockEntry {
  sesiId: number
  cashValue: number
  catatanSelisih?: string
  tanggal?: string
  titikKasirId?: number
  lockedAt: string
}

function readLockMap(): Record<string, CloseSessionLockEntry> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(KANTIN_CLOSE_SESSION_LOCKS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {}
    }
    return parsed as Record<string, CloseSessionLockEntry>
  } catch {
    return {}
  }
}

function writeLockMap(map: Record<string, CloseSessionLockEntry>): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    if (Object.keys(map).length === 0) {
      window.localStorage.removeItem(KANTIN_CLOSE_SESSION_LOCKS_KEY)
      return
    }
    window.localStorage.setItem(
      KANTIN_CLOSE_SESSION_LOCKS_KEY,
      JSON.stringify(map)
    )
  } catch {
    // Abaikan jika localStorage diblokir atau kuota penuh
  }
}

function matchesSessionScope(
  entry: CloseSessionLockEntry,
  sesi: Pick<SesiKasirData, 'id' | 'tanggal' | 'titikKasirId'>
): boolean {
  if (entry.tanggal && sesi.tanggal && entry.tanggal !== sesi.tanggal) {
    return false
  }
  if (
    typeof entry.titikKasirId === 'number' &&
    typeof sesi.titikKasirId === 'number' &&
    entry.titikKasirId !== sesi.titikKasirId
  ) {
    return false
  }
  return true
}

function isValidLockEntry(
  entry: CloseSessionLockEntry | undefined
): entry is CloseSessionLockEntry {
  return Boolean(
    entry &&
      typeof entry.cashValue === 'number' &&
      Number.isFinite(entry.cashValue) &&
      entry.cashValue >= 0
  )
}

export function getCloseSessionLock(
  sesi?: Pick<
    SesiKasirData,
    'id' | 'status' | 'tanggal' | 'titikKasirId'
  > | null
): CloseSessionLockEntry | null {
  if (!sesi?.id || sesi.status === 'DITUTUP') {
    return null
  }
  const map = readLockMap()
  const entry = map[String(sesi.id)]
  if (!isValidLockEntry(entry) || !matchesSessionScope(entry, sesi)) {
    return null
  }
  return entry
}

export function saveCloseSessionLock(
  sesi: Pick<SesiKasirData, 'id' | 'tanggal' | 'titikKasirId'> | null | undefined,
  cashValue: number,
  catatanSelisih?: string
): CloseSessionLockEntry | null {
  if (!sesi?.id) return null
  const normalizedCash = Math.max(0, Math.trunc(Number(cashValue) || 0))
  const map = readLockMap()
  const existing = map[String(sesi.id)]
  // Pertahankan nominal awal jika sesi ini sudah pernah masuk tahap rekonsiliasi
  if (isValidLockEntry(existing) && matchesSessionScope(existing, sesi)) {
    return existing
  }
  const nextEntry: CloseSessionLockEntry = {
    sesiId: sesi.id,
    cashValue: normalizedCash,
    catatanSelisih: catatanSelisih || undefined,
    tanggal: sesi.tanggal,
    titikKasirId: sesi.titikKasirId,
    lockedAt: new Date().toISOString(),
  }
  map[String(sesi.id)] = nextEntry
  writeLockMap(map)
  return nextEntry
}

export function updateCloseSessionLockCatatan(
  sesiId: number | undefined,
  catatanSelisih: string
): void {
  if (!sesiId) return
  const map = readLockMap()
  const existing = map[String(sesiId)]
  if (!existing) return
  map[String(sesiId)] = {
    ...existing,
    catatanSelisih,
  }
  writeLockMap(map)
}

export function clearCloseSessionLock(sesiId?: number): void {
  if (!sesiId) return
  const map = readLockMap()
  if (String(sesiId) in map) {
    delete map[String(sesiId)]
    writeLockMap(map)
  }
}
