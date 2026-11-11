import type { LaporanFilterParams } from '../types'

/**
 * Parameter filter kosong untuk mode "Semua Waktu" (default backend).
 * Mengizinkan backend memakai parameter default tanpa memaksakan scan rentang statis 10 tahun.
 */
export const ALL_TIME_PARAMS: LaporanFilterParams = {}

/**
 * Format Date ke string YYYY-MM-DD sesuai tanggal kalender lokal.
 */
export function formatYmd(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Mendapatkan string representasi timezone offset lokal klien (contoh: +07:00, +08:00, +09:00).
 */
export function getTimezoneOffsetString(date: Date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absMinutes = Math.abs(offsetMinutes)
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0')
  const minutes = String(absMinutes % 60).padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

/**
 * Mengubah tanggal YYYY-MM-DD menjadi awal hari ISO dengan timezone dinamis (contoh: 2026-11-10T00:00:00+07:00).
 */
export function startOfDayIso(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  return `${ymd}T00:00:00${getTimezoneOffsetString(date)}`
}

/**
 * Mengubah tanggal YYYY-MM-DD menjadi awal hari esoknya (00:00:00 hari berikutnya)
 * untuk batas atas rentang setengah terbuka [dari, sampai) di backend LaporanService.
 * Ini memastikan transaksi pada detik/milidetik terakhir hari (23:59:59.xxx) tidak terlewat.
 */
export function nextDayStartIso(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  date.setDate(date.getDate() + 1)
  const nextYmd = formatYmd(date)
  return `${nextYmd}T00:00:00${getTimezoneOffsetString(date)}`
}
