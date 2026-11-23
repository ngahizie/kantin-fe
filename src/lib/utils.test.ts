import { describe, expect, it } from 'vitest'
import { getPageNumbers, escapeHtml, isSafeImageUrl } from './utils'

describe('getPageNumbers', () => {
  it('returns all pages when total is at most 5', () => {
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('shows ellipsis near the beginning', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, '...', 10])
    expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '...', 10])
  })

  it('shows ellipsis near the end', () => {
    expect(getPageNumbers(10, 10)).toEqual([1, '...', 7, 8, 9, 10])
    expect(getPageNumbers(9, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })

  it('shows ellipsis on both side in the middle', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10])
  })

  it('handles current page greater than total pages', () => {
    expect(getPageNumbers(6, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(11, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })
})

describe('escapeHtml', () => {
  it('mengonversi karakter khusus HTML menjadi HTML entities', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
    expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#39;s')
  })

  it('menangani nilai null, undefined, dan angka dengan aman', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(12345)).toBe('12345')
  })
})

describe('isSafeImageUrl', () => {
  it('mengizinkan URL http, https, dan path relatif yang valid', () => {
    expect(isSafeImageUrl('https://example.com/avatar.jpg')).toBe(true)
    expect(isSafeImageUrl('http://localhost:8080/image.png')).toBe(true)
    expect(isSafeImageUrl('/uploads/siswa/foto.jpg')).toBe(true)
    expect(isSafeImageUrl('./avatar.png')).toBe(true)
  })

  it('mengizinkan data:image valid berbasis base64', () => {
    expect(
      isSafeImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
    ).toBe(true)
  })

  it('menolak skema berbahaya atau tidak valid', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeImageUrl('vbscript:msgbox(1)')).toBe(false)
    expect(isSafeImageUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false)
    expect(isSafeImageUrl('//evil.com/phish.jpg')).toBe(false)
    expect(isSafeImageUrl('')).toBe(false)
    expect(isSafeImageUrl(null)).toBe(false)
    expect(isSafeImageUrl(undefined)).toBe(false)
  })
})

