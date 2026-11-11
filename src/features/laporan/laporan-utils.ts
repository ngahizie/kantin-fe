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
