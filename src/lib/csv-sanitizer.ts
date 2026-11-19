/**
 * Utilitas sanitasi sel CSV untuk mencegah CSV/Formula Injection (CWE-1236 / OWASP A05:2025).
 *
 * Aplikasi spreadsheet (Microsoft Excel, LibreOffice Calc, Google Sheets) akan
 * mengeksekusi rumus jika suatu sel diawali karakter '=', '+', '-', '@', '\t', atau '\r'.
 *
 * Dengan menambahkan prefix tanda petik tunggal ('), aplikasi spreadsheet memperlakukannya
 * murni sebagai teks literal tanpa mengeksekusi formula atau perintah DDE/eksternal.
 */
export function sanitizeCsvCell(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r']
  let safeStr = str
  if (formulaTriggers.some((trigger) => str.startsWith(trigger))) {
    safeStr = `'${str}`
  }
  return `"${safeStr.replace(/"/g, '""')}"`
}

/**
 * Unduh berkas CSV menggunakan Blob biner dan UTF-8 BOM (\uFEFF)
 * untuk menghindari pemotongan URI pada karakter '#' dan mencegah mojibake di Excel Windows.
 */
export function downloadCsvBlob(filename: string, content: string): void {
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
