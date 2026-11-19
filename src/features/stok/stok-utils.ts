/**
 * Memvalidasi dan mengekstrak menuId positif yang aman dari input tidak terpercaya (OWASP A05 / NIST PR.DS-01).
 * Menolak string non-angka, NaN, Infinity, angka desimal, atau angka <= 0.
 */
export function parseSafeMenuId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
    return undefined
  }
  return num
}
