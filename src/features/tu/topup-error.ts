/**
 * Sanitasi pesan error transaksi top-up tunai agar aman dari verbose error disclosure
 * (OWASP A02:2025 / NIST PR.IP-1) serta mencegah kebocoran struktur database dan exception internal.
 */
export function sanitizeTopupErrorMessage(
  err: unknown,
  fallback = 'Gagal mengisi saldo tunai. Silakan coba beberapa saat lagi.'
): string {
  if (!err) return fallback

  let status: number | undefined
  let rawMessage = ''

  if (typeof err === 'string') {
    rawMessage = err
  } else if (typeof err === 'object' && err !== null) {
    const errorObj = err as {
      response?: {
        status?: number
        data?: { message?: string }
      }
      message?: string
    }
    status = errorObj.response?.status
    rawMessage = errorObj.response?.data?.message || errorObj.message || ''
  }

  // Pemetaan kode status HTTP ke pesan aman
  if (status === 401) {
    return 'Sesi Anda telah kedaluwarsa. Silakan masuk kembali.'
  }
  if (status === 403) {
    return 'Akses ditolak. Anda tidak memiliki izin untuk melakukan pengisian saldo tunai.'
  }
  if (status === 404) {
    return 'Data siswa tidak ditemukan di sistem.'
  }
  if (status === 409) {
    return 'Transaksi pengisian saldo dengan nomor bukti ini sudah pernah diproses.'
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
