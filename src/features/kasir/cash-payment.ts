import { formatRupiah } from '@/lib/formatters'

export interface CashPaymentSummary {
  total: number
  uangDiterima: number
  kembalian: number
  kekurangan: number
  isValid: boolean
  errorMessage: string | null
}

/**
 * Hitung & validasi pembayaran tunai kasir (Kartu Tamu / tanpa kartu, Issue #165).
 */
export function evaluateCashPayment(
  total: number,
  uangDiterima: number
): CashPaymentSummary {
  const safeTotal = Math.max(0, Math.round(Number.isFinite(total) ? total : 0))
  const safeCash = Math.max(
    0,
    Math.round(Number.isFinite(uangDiterima) ? uangDiterima : 0)
  )

  if (safeTotal <= 0) {
    return {
      total: safeTotal,
      uangDiterima: safeCash,
      kembalian: 0,
      kekurangan: 0,
      isValid: false,
      errorMessage: 'Keranjang belanja masih kosong.',
    }
  }

  if (safeCash < safeTotal) {
    const kekurangan = safeTotal - safeCash
    return {
      total: safeTotal,
      uangDiterima: safeCash,
      kembalian: 0,
      kekurangan,
      isValid: false,
      errorMessage: `Uang tunai kurang ${formatRupiah(kekurangan)}`,
    }
  }

  return {
    total: safeTotal,
    uangDiterima: safeCash,
    kembalian: safeCash - safeTotal,
    kekurangan: 0,
    isValid: true,
    errorMessage: null,
  }
}

/**
 * Parsing string nominal angka rupiah (menghapus karakter non-digit).
 */
export function parseCashInput(raw: string): number {
  const digitsOnly = raw.replace(/\D/g, '')
  if (!digitsOnly) return 0
  const parsed = Number.parseInt(digitsOnly, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/**
 * Menghasilkan saran nominal pecahan uang tunai cepat yang >= total belanja.
 */
export function getQuickCashNominals(total: number): number[] {
  const safeTotal = Math.max(0, Math.round(Number.isFinite(total) ? total : 0))
  if (safeTotal <= 0) return []

  const candidates = [5000, 10000, 20000, 50000, 100000]
  const suggestions: number[] = [safeTotal]

  for (const bill of candidates) {
    if (bill > safeTotal && !suggestions.includes(bill)) {
      suggestions.push(bill)
    }
    if (suggestions.length >= 4) break
  }

  // Jika total > 100.000, tambahkan kelipatan 50.000 berikutnya sebagai pilihan cepat
  if (suggestions.length < 3) {
    const nextStep = Math.ceil((safeTotal + 1) / 50000) * 50000
    if (nextStep > safeTotal && !suggestions.includes(nextStep)) {
      suggestions.push(nextStep)
    }
  }

  return suggestions
}
