import { describe, it, expect, vi } from 'vitest'
import { sanitizeCsvCell, downloadCsvBlob } from '../csv-sanitizer'

describe('CSV Sanitizer & Anti Formula Injection (CWE-1236 / OWASP A05)', () => {
  it('menangani nilai null dan undefined menjadi string kutip kosong', () => {
    expect(sanitizeCsvCell(null)).toBe('""')
    expect(sanitizeCsvCell(undefined)).toBe('""')
  })

  it('membiarkan angka dan teks biasa tetap aman dalam tanda kutip', () => {
    expect(sanitizeCsvCell(15000)).toBe('"15000"')
    expect(sanitizeCsvCell('Nasi Goreng Spesial')).toBe('"Nasi Goreng Spesial"')
  })

  it('meng-escape tanda kutip ganda internal dengan benar (" -> "")', () => {
    expect(sanitizeCsvCell('Paket "Hemat" 1')).toBe('"Paket ""Hemat"" 1"')
  })

  it('menetralisir karakter pemicu formula spreadsheet (=, +, -, @, \\t, \\r) dengan prefix petik tunggal', () => {
    // Formula berbahaya yang dieksekusi Excel / Calc
    expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"')
    expect(sanitizeCsvCell('=cmd|\' /C calc\'!A0')).toBe('"\'=cmd|\' /C calc\'!A0"')
    expect(sanitizeCsvCell('+12345')).toBe('"\' +12345"'.replace(' ', '')) // "'+12345"
    expect(sanitizeCsvCell('-1000')).toBe('"\' -1000"'.replace(' ', '')) // "'-1000"
    expect(sanitizeCsvCell('@SUM(1,2)')).toBe('"\'@SUM(1,2)"')
    expect(sanitizeCsvCell('\tTabPrefix')).toBe('"\'\tTabPrefix"')
    expect(sanitizeCsvCell('\rCarriagePrefix')).toBe('"\'\rCarriagePrefix"')
  })

  it('downloadCsvBlob membuat URL object dari blob ber-BOM UTF-8 dan membersihkannya', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/dummy-url')
    const revokeObjectURLMock = vi.fn()
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock

    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    downloadCsvBlob('test.csv', 'Header1,Header2\nValue1,Value2')

    expect(createObjectURLMock).toHaveBeenCalledTimes(1)
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/dummy-url')
  })
})
