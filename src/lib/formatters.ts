/**
 * Helper format mata uang dan tanggal untuk Kantin SKOOLIA
 */

export const DEFAULT_TIMEZONE = 'Asia/Jakarta'

/**
 * Format integer rupiah ke string representasi mata uang IDR
 * Contoh: 25000 -> "Rp 25.000"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0'
  }
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  if (amount < 0) {
    return `-${formatter.format(Math.abs(amount))}`
  }
  return formatter.format(amount)
}

/**
 * Format angka ribuan biasa (tanpa prefix Rp)
 * Contoh: 1500 -> "1.500"
 */
export function formatNumber(
  val: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0'
  }
  return new Intl.NumberFormat('id-ID', options).format(val)
}

function parseValidDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  return d
}

interface DateTimeParts {
  day: string
  month: string
  year: string
  hour: string
  minute: string
  second: string
}

function getDateTimeParts(date: Date, timeZone = DEFAULT_TIMEZONE): DateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) {
    map[part.type] = part.value
  }
  const hour = map.hour === '24' ? '00' : map.hour || '00'
  return {
    day: map.day || '01',
    month: map.month || '01',
    year: map.year || '1970',
    hour,
    minute: map.minute || '00',
    second: map.second || '00',
  }
}

/**
 * Format tanggal dan waktu ke pola baku "DD/MM/YYYY HH:mm"
 * Terkunci di zona waktu Asia/Jakarta (WIB)
 * Contoh: "09/11/2026 14:30"
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  timeZone = DEFAULT_TIMEZONE
): string {
  const d = parseValidDate(date)
  if (!d) return '-'
  const { day, month, year, hour, minute } = getDateTimeParts(d, timeZone)
  return `${day}/${month}/${year} ${hour}:${minute}`
}

/**
 * Format tanggal ke pola baku "DD/MM/YYYY"
 * Terkunci di zona waktu Asia/Jakarta (WIB)
 * Contoh: "09/11/2026"
 */
export function formatDate(
  date: string | Date | null | undefined,
  timeZone = DEFAULT_TIMEZONE
): string {
  const d = parseValidDate(date)
  if (!d) return '-'
  const { day, month, year } = getDateTimeParts(d, timeZone)
  return `${day}/${month}/${year}`
}

/**
 * Format tanggal ke format ISO YYYY-MM-DD
 * Terkunci di zona waktu Asia/Jakarta (WIB)
 * Contoh: "2026-11-09"
 */
export function formatDateIso(
  date: string | Date | null | undefined,
  timeZone = DEFAULT_TIMEZONE
): string {
  const d = parseValidDate(date)
  if (!d) return '-'
  const { day, month, year } = getDateTimeParts(d, timeZone)
  return `${year}-${month}-${day}`
}

/**
 * Format waktu ke pola baku "HH:mm" (24 jam)
 * Terkunci di zona waktu Asia/Jakarta (WIB)
 * Contoh: "14:30"
 */
export function formatTime(
  date: string | Date | null | undefined,
  timeZone = DEFAULT_TIMEZONE
): string {
  const d = parseValidDate(date)
  if (!d) return '-'
  const { hour, minute } = getDateTimeParts(d, timeZone)
  return `${hour}:${minute}`
}

/**
 * Dapatkan penanda zona waktu Indonesia (WIB, WITA, WIT)
 * Default terkunci di WIB untuk konsistensi sekolah
 */
export function getTimezoneSuffix(timeZone = DEFAULT_TIMEZONE): 'WIB' | 'WITA' | 'WIT' {
  if (timeZone.includes('Jayapura') || timeZone.includes('East_Indonesia')) {
    return 'WIT'
  }
  if (
    timeZone.includes('Makassar') ||
    timeZone.includes('Ujung_Pandang') ||
    timeZone.includes('Bali') ||
    timeZone.includes('Denpasar') ||
    timeZone.includes('Manado') ||
    timeZone.includes('Banjarmasin') ||
    timeZone.includes('Balikpapan') ||
    timeZone.includes('Samarinda') ||
    timeZone.includes('Mataram') ||
    timeZone.includes('Kupang') ||
    timeZone.includes('Central_Indonesia')
  ) {
    return 'WITA'
  }
  return 'WIB'
}

/**
 * Format jam dan menit dengan penanda zona waktu (WIB/WITA/WIT)
 * Contoh: "14.30 WIB"
 */
export function formatTimeWithZone(
  date: string | Date | null | undefined,
  timeZone = DEFAULT_TIMEZONE
): string {
  const d = parseValidDate(date)
  if (!d) return '-'
  const { hour, minute } = getDateTimeParts(d, timeZone)
  return `${hour}.${minute} ${getTimezoneSuffix(timeZone)}`
}

/**
 * Ambil singkatan nama hari dalam bahasa Indonesia (Sen, Sel, Rab, Kam, Jum, Sab, Min)
 */
export function formatWeekdayShort(
  date: string | Date | null | undefined,
  timeZone = DEFAULT_TIMEZONE
): string {
  const d = parseValidDate(date)
  if (!d) return ''
  return new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone }).format(d)
}

/**
 * Ambil singkatan nama bulan dalam bahasa Indonesia (Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des)
 */
export function formatMonthShort(
  date: string | Date | null | undefined,
  timeZone = DEFAULT_TIMEZONE
): string {
  const d = parseValidDate(date)
  if (!d) return ''
  return new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone }).format(d)
}

/**
 * Ambil inisial 1-2 huruf dari nama untuk AvatarFallback
 */
export function getInitials(name?: string | null): string {
  if (!name?.trim()) return 'S'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}
