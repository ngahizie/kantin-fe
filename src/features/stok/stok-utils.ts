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

/**
 * Format string jenis mutasi secara aman tanpa melempar unhandled exception (OWASP A10 / NIST PR.DS-02).
 */
export function formatJenisMutasi(jenis?: string | null): string {
  if (!jenis) return '-'
  if (jenis === 'PENJUALAN_VOID') return 'REFUND PENJUALAN'
  return String(jenis).replace(/_/g, ' ')
}

/**
 * Mendapatkan cakupan dan subtitle metadata laporan yang akurat berdasarkan filter menu (OWASP A08 / NIST PR.DS-02).
 */
export function getStokExportMetadata(
  menuIdParam?: number,
  firstMenuNama?: string | null
): { cakupan: string; subtitle: string; fileSuffix: string } {
  if (menuIdParam) {
    const label = firstMenuNama || `Menu #${menuIdParam}`
    return {
      cakupan: `Menu: ${label}`,
      subtitle: `Mutasi Produk: ${label}`,
      fileSuffix: `_Menu_${menuIdParam}`,
    }
  }
  return {
    cakupan: 'Seluruh Menu Kantin',
    subtitle: 'Seluruh Mutasi Produk & Menu Kantin',
    fileSuffix: '',
  }
}

