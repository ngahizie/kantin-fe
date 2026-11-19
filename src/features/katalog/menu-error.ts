/**
 * Sanitasi pesan error menu agar aman dari verbose error disclosure (OWASP A02:2025 / NIST PR.DS-05)
 * dan membatasi panjang teks agar visual antarmuka pengguna tidak rusak (OWASP A10 / NIST SI-10).
 */
export function sanitizeMenuErrorMessage(
  rawMessage: string,
  fallback = 'Terjadi kesalahan saat memproses data menu'
): string {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return fallback
  }

  const trimmed = rawMessage.trim()
  if (!trimmed) return fallback

  // Deteksi indikasi stack trace, error database, atau exception internal backend
  const sensitivePatterns = [
    /psql/i,
    /sqlstate/i,
    /syntax error/i,
    /foreign\s*key/i,
    /unique\s*constraint/i,
    /duplicate\s*key/i,
    /hibernate/i,
    /exception/i,
    /stack\s*trace/i,
    /connection\s+refused/i,
    /internal\s+server\s+error/i,
    /org\.spring/i,
    /java\./i,
    /at\s+com\./i,
  ]

  for (const pattern of sensitivePatterns) {
    if (pattern.test(trimmed)) {
      return fallback
    }
  }

  // Bersihkan tag PRD/BE bila ada
  const cleaned = trimmed
    .replace(/\s*\((?:PRD|BE)[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Batasi panjang pesan maksimum 150 karakter
  if (cleaned.length > 150) {
    return cleaned.slice(0, 147) + '...'
  }

  return cleaned || fallback
}

/**
 * Ekstraksi pesan error dari Axios/Error object dengan sanitasi otomatis.
 */
export function extractMenuErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const axiosErr = err as {
      response?: {
        status?: number
        data?: { message?: string }
      }
    }
    const status = axiosErr.response?.status
    if (status === 404) {
      return 'Menu dengan nomor ini tidak ditemukan. Mungkin sudah dihapus atau tautannya salah.'
    }
    if (status === 403) {
      return 'Anda tidak memiliki hak akses untuk melihat menu ini.'
    }
    const serverMsg = axiosErr.response?.data?.message
    if (serverMsg && typeof serverMsg === 'string') {
      return sanitizeMenuErrorMessage(serverMsg)
    }
  }

  if (err instanceof Error && err.message) {
    if (err.message.includes('404')) {
      return 'Menu dengan nomor ini tidak ditemukan. Mungkin sudah dihapus atau tautannya salah.'
    }
    return sanitizeMenuErrorMessage(err.message)
  }

  return 'Menu tidak dapat dimuat. Terjadi kesalahan pada sistem.'
}

/**
 * Sanitasi param ID dari URL agar tidak menyebabkan UI overflow.
 */
export function sanitizeParamId(rawId: string, maxLength = 30): string {
  if (!rawId) return ''
  const trimmed = rawId.trim()
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength) + '...'
  }
  return trimmed
}
