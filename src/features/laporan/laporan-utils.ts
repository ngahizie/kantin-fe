/**
 * Format nilai margin persen secara aman.
 * Menghasilkan '0%' bila nilai kosong, null, undefined, NaN, atau 0.
 * Menghasilkan '${margin}%' bila terdapat angka valid positif/negatif.
 */
export function formatMargin(margin?: number | null): string {
  if (margin === undefined || margin === null || Number.isNaN(margin) || margin === 0) {
    return '0%'
  }
  return `${margin}%`
}

/**
 * Mengembalikan kelas badge kategori menu secara konsisten pada halaman laporan penjualan & keuntungan.
 */
export function getCategoryBadgeClass(kategori: string): string {
  const k = (kategori || '').toLowerCase()
  if (k.includes('berat')) {
    return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300'
  }
  if (k.includes('dingin') || k.includes('minum')) {
    return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300'
  }
  if (k.includes('snack') || k.includes('roti')) {
    return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
  }
  if (k.includes('hangat')) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
  }
  return 'border-border bg-muted text-muted-foreground'
}
