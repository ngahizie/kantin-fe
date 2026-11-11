/**
 * Helper format mata uang dan tanggal untuk Kantin SKOOLIA
 */

/**
 * Format integer rupiah ke string representasi mata uang IDR
 * Contoh: 25000 -> "Rp 25.000"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0'
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format angka ribuan biasa (tanpa prefix Rp)
 * Contoh: 1500 -> "1.500"
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0'
  }
  return new Intl.NumberFormat('id-ID').format(val)
}

/**
 * Format tanggal Indonesia lengkap dengan jam
 * Contoh: "2 Okt 2026, 11:30"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Format tanggal Indonesia singkat
 * Contoh: "02 Okt 2026"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Dapatkan penanda zona waktu Indonesia (WIB, WITA, WIT)
 * berdasarkan zona waktu perangkat sekolah atau offset UTC
 */
export function getTimezoneSuffix(date: Date = new Date()): 'WIB' | 'WITA' | 'WIT' {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Jayapura') || tz.includes('East_Indonesia')) {
      return 'WIT'
    }
    if (
      tz.includes('Makassar') ||
      tz.includes('Ujung_Pandang') ||
      tz.includes('Bali') ||
      tz.includes('Denpasar') ||
      tz.includes('Manado') ||
      tz.includes('Banjarmasin') ||
      tz.includes('Balikpapan') ||
      tz.includes('Samarinda') ||
      tz.includes('Mataram') ||
      tz.includes('Kupang') ||
      tz.includes('Central_Indonesia')
    ) {
      return 'WITA'
    }
    const offsetHours = -date.getTimezoneOffset() / 60
    if (offsetHours === 9) return 'WIT'
    if (offsetHours === 8) return 'WITA'
  } catch {
    // fallback ke WIB
  }
  return 'WIB'
}

/**
 * Format jam dan menit dengan penanda zona waktu (WIB/WITA/WIT) tanpa detik
 * Contoh: "14.58 WIB"
 */
export function formatTimeWithZone(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  const timeStr = d
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(':', '.')
  return `${timeStr} ${getTimezoneSuffix(d)}`
}
