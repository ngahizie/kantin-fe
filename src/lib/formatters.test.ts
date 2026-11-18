import { describe, expect, it } from 'vitest'
import {
  formatRupiah,
  formatNumber,
  formatDate,
  formatDateTime,
  formatDateIso,
  formatTime,
  formatTimeWithZone,
  getTimezoneSuffix,
  formatWeekdayShort,
  formatMonthShort,
  DEFAULT_TIMEZONE,
} from './formatters'

describe('formatters', () => {
  it('formatRupiah memformat angka ke representasi rupiah', () => {
    expect(formatRupiah(15000)).toMatch(/Rp\s*15\.000/)
    expect(formatRupiah(0)).toMatch(/Rp\s*0/)
    expect(formatRupiah(null)).toBe('Rp 0')
    expect(formatRupiah(-5000)).toMatch(/-Rp\s*5\.000/)
  })

  it('formatNumber memformat angka ribuan biasa dan mendukung options', () => {
    expect(formatNumber(1500)).toBe('1.500')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(null)).toBe('0')
    expect(formatNumber(12.3456, { maximumFractionDigits: 1 })).toBe('12,3')
  })

  it('formatDate memformat tanggal ke pola DD/MM/YYYY terkunci di Asia/Jakarta', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate('invalid-date')).toBe('-')

    // 2026-10-02T10:00:00Z pada UTC+7 (Asia/Jakarta) adalah 2026-10-02 17:00
    expect(formatDate('2026-10-02T10:00:00Z')).toBe('02/10/2026')

    // 2026-11-09T18:00:00Z pada UTC+7 sudah berganti hari ke 2026-11-10 01:00 WIB
    expect(formatDate('2026-11-09T18:00:00Z')).toBe('10/11/2026')
  })

  it('formatDateTime memformat tanggal dan waktu ke pola baku DD/MM/YYYY HH:mm', () => {
    expect(formatDateTime(null)).toBe('-')
    expect(formatDateTime('invalid-date')).toBe('-')

    // 07:30 UTC = 14:30 WIB
    expect(formatDateTime('2026-11-09T07:30:00Z')).toBe('09/11/2026 14:30')

    // 18:00 UTC = 01:00 WIB keesokan harinya
    expect(formatDateTime('2026-11-09T18:00:00Z')).toBe('10/11/2026 01:00')
  })

  it('formatDateIso memformat tanggal ke format ISO YYYY-MM-DD di Asia/Jakarta', () => {
    expect(formatDateIso(null)).toBe('-')
    expect(formatDateIso('2026-11-09T07:30:00Z')).toBe('2026-11-09')
    expect(formatDateIso('2026-11-09T18:00:00Z')).toBe('2026-11-10')
  })

  it('formatTime memformat jam ke pola baku HH:mm 24 jam', () => {
    expect(formatTime(null)).toBe('-')
    expect(formatTime('invalid-date')).toBe('-')
    expect(formatTime('2026-11-09T07:30:00Z')).toBe('14:30')
  })

  it('getTimezoneSuffix mengembalikan penanda zona waktu', () => {
    expect(getTimezoneSuffix()).toBe('WIB')
    expect(getTimezoneSuffix('Asia/Jayapura')).toBe('WIT')
    expect(getTimezoneSuffix('Asia/Makassar')).toBe('WITA')
  })

  it('formatTimeWithZone memformat jam dengan penanda zona waktu tanpa detik', () => {
    expect(formatTimeWithZone(null)).toBe('-')
    expect(formatTimeWithZone('invalid-date')).toBe('-')

    // 2026-10-10T07:58:31Z = 14:58 WIB
    const formatted = formatTimeWithZone('2026-10-10T07:58:31Z')
    expect(formatted).toBe('14.58 WIB')
    expect(formatted).not.toContain('31') // tidak ada detik
  })

  it('formatWeekdayShort dan formatMonthShort mengembalikan teks bahasa Indonesia', () => {
    // 2026-11-09 adalah hari Senin (Sen), bulan November (Nov)
    expect(formatWeekdayShort('2026-11-09T07:30:00Z')).toBe('Sen')
    expect(formatMonthShort('2026-11-09T07:30:00Z')).toBe('Nov')
  })

  it('DEFAULT_TIMEZONE bernilai Asia/Jakarta', () => {
    expect(DEFAULT_TIMEZONE).toBe('Asia/Jakarta')
  })
})
