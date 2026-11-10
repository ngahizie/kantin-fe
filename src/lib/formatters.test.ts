import { describe, expect, it } from 'vitest'
import {
  formatRupiah,
  formatNumber,
  formatDate,
  formatDateTime,
  formatTimeWithZone,
  getTimezoneSuffix,
} from './formatters'

describe('formatters', () => {
  it('formatRupiah memformat angka ke representasi rupiah', () => {
    expect(formatRupiah(15000)).toMatch(/Rp\s*15\.000/)
    expect(formatRupiah(0)).toMatch(/Rp\s*0/)
    expect(formatRupiah(null)).toBe('Rp 0')
  })

  it('formatNumber memformat angka ribuan biasa', () => {
    expect(formatNumber(1500)).toBe('1.500')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(null)).toBe('0')
  })

  it('formatDate memformat tanggal tanpa jam', () => {
    expect(formatDate(null)).toBe('-')
    const res = formatDate('2026-10-02T10:00:00Z')
    expect(res).not.toBe('-')
  })

  it('formatDateTime memformat tanggal dan waktu', () => {
    expect(formatDateTime(null)).toBe('-')
    const res = formatDateTime('2026-10-02T10:00:00Z')
    expect(res).not.toBe('-')
  })

  it('getTimezoneSuffix mengembalikan WIB, WITA, atau WIT', () => {
    const tz = getTimezoneSuffix()
    expect(['WIB', 'WITA', 'WIT']).toContain(tz)
  })

  it('formatTimeWithZone memformat jam dan menit dengan penanda zona waktu tanpa detik', () => {
    expect(formatTimeWithZone(null)).toBe('-')
    expect(formatTimeWithZone('invalid-date')).toBe('-')

    const d = new Date(2026, 9, 10, 14, 58, 31)
    const formatted = formatTimeWithZone(d)
    expect(formatted).toMatch(/14[.:]58\s+(WIB|WITA|WIT)/)
    expect(formatted).not.toContain('31') // tidak ada detik
  })
})
