export const MAX_PENYETOR_LENGTH = 120
export const MAX_RFID_INPUT_LENGTH = 32

/**
 * Menghasilkan nomor bukti/referensi unik dan tahan tabrakan (collision-resistant)
 * untuk transaksi top-up tunai, menggunakan Web Crypto API.
 * Panjang string dijamin <= 60 karakter sesuai batasan backend TopUpRequest (@Size(max = 60)).
 */
export function generateTopupReferenceId(now: Date = new Date()): string {
  const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeMs = now.getTime().toString(36).toUpperCase()

  let randomPart: string
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    randomPart = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  } else {
    randomPart = Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  const refNo = `TU-TOPUP-${dateCode}-${timeMs}-${randomPart}`
  return refNo.slice(0, 60)
}

/**
 * Memvalidasi dan membersihkan input nominal top-up.
 * Mengembalikan bilangan bulat non-negatif yang aman (tanpa pecahan/sen, NaN, atau Infinity).
 */
export function parseSafeTopupNominal(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  let cleanStr: string
  if (typeof value === 'string') {
    // Hapus format ribuan titik khas Indonesia (mis. "100.000") dan karakter non-digit
    cleanStr = value.trim().replace(/\./g, '').replace(/[^\d-]/g, '')
  } else {
    cleanStr = String(value)
  }

  const num = Number(cleanStr)

  if (typeof num !== 'number' || Number.isNaN(num) || !Number.isFinite(num)) {
    return 0
  }

  if (num <= 0) {
    return 0
  }

  // Rupiah tidak memiliki pecahan desimal/sen; bulatkan ke bawah menjadi integer positif
  return Math.floor(num)
}

/**
 * Membersihkan dan membatasi panjang teks nama penyetor sesuai kontrak backend.
 */
export function sanitizePenyetorName(
  value: unknown,
  maxLength: number = MAX_PENYETOR_LENGTH
): string {
  if (typeof value !== 'string') {
    return ''
  }

  // Hapus karakter kontrol ASCII non-printable
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()
  return clean.slice(0, maxLength)
}

/**
 * Membersihkan input UID nomor kartu RFID dari karakter tak terduga
 * dan membatasi panjang maksimum agar tidak membebani pemrosesan.
 */
export function sanitizeRfidInput(
  value: unknown,
  maxLength: number = MAX_RFID_INPUT_LENGTH
): string {
  if (typeof value !== 'string') {
    return ''
  }

  // Hanya izinkan karakter alfanumerik dan tanda hubung
  const clean = value.replace(/[^A-Za-z0-9-]/g, '').trim()
  return clean.slice(0, maxLength)
}
