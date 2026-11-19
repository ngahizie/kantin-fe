/**
 * Sanitasi pesan error kategori agar aman dari verbose error disclosure (OWASP A02:2025 / NIST PR.DS-05)
 * dan membatasi panjang teks agar visual antarmuka pengguna tidak rusak.
 */
export function sanitizeKategoriErrorMessage(
  rawMessage: string,
  fallback = 'Terjadi kesalahan saat memproses data kategori'
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
