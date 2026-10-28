import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  extractValidationMessage,
  getErrorMessage,
  parseBackendValidation,
} from './validation-error'

describe('validation-error utilities', () => {
  describe('extractValidationMessage', () => {
    it('returns null for null or non-object', () => {
      expect(extractValidationMessage(null)).toBeNull()
      expect(extractValidationMessage('string')).toBeNull()
      expect(extractValidationMessage(123)).toBeNull()
    })

    it('extracts validation from an object mapping fields to error strings', () => {
      const data = {
        code: 100,
        message: 'ERROR MAPPING',
        validation: {
          nama: 'Nama menu wajib diisi',
          hargaJual: 'Harga jual minimal Rp 1.000',
        },
      }
      const result = extractValidationMessage(data)
      expect(result).toBe('nama: Nama menu wajib diisi, hargaJual: Harga jual minimal Rp 1.000')
    })

    it('extracts validation when validation is a string array', () => {
      const data = {
        code: 100,
        message: 'ERROR MAPPING',
        validation: ['Saldo minimal 10.000', 'Kartu tidak aktif'],
      }
      expect(extractValidationMessage(data)).toBe('Saldo minimal 10.000, Kartu tidak aktif')
    })

    it('extracts validation when validation is a plain string', () => {
      const data = {
        code: 100,
        message: 'ERROR MAPPING',
        validation: 'RFID tidak terdaftar pada sistem',
      }
      expect(extractValidationMessage(data)).toBe('RFID tidak terdaftar pada sistem')
    })

    it('falls back to message if message is not "ERROR MAPPING"', () => {
      const data = {
        code: 400,
        message: 'Saldo siswa tidak mencukupi untuk transaksi ini',
      }
      expect(extractValidationMessage(data)).toBe('Saldo siswa tidak mencukupi untuk transaksi ini')
    })

    it('returns null if message is "ERROR MAPPING" and validation is empty', () => {
      const data = {
        code: 100,
        message: 'ERROR MAPPING',
        validation: {},
      }
      expect(extractValidationMessage(data)).toBeNull()
    })
  })

  describe('parseBackendValidation', () => {
    it('parses AxiosError with per-field validation correctly', () => {
      const axiosError = new AxiosError('Request failed with status code 400')
      axiosError.response = {
        status: 400,
        data: {
          code: 100,
          message: 'ERROR MAPPING',
          validation: {
            nama: 'Nama kategori wajib diisi',
            urutan: 'Urutan minimal 0',
          },
        },
      } as AxiosResponse

      const parsed = parseBackendValidation(axiosError)
      expect(parsed.fieldErrors).toEqual({
        nama: 'Nama kategori wajib diisi',
        urutan: 'Urutan minimal 0',
      })
      expect(parsed.message).toContain('nama: Nama kategori wajib diisi')
      expect(parsed.message).toContain('urutan: Urutan minimal 0')
    })

    it('returns error message or fallback when error data has no specifics', () => {
      const parsedWithError = parseBackendValidation(new Error('Network error'))
      expect(parsedWithError.fieldErrors).toEqual({})
      expect(parsedWithError.message).toBe('Network error')

      const parsedWithEmpty = parseBackendValidation({})
      expect(parsedWithEmpty.fieldErrors).toEqual({})
      expect(parsedWithEmpty.message).toBe('Data yang dikirim tidak valid')
    })
  })

  describe('getErrorMessage', () => {
    it('prefers validation messages over generic ERROR MAPPING', () => {
      const error = new AxiosError('Bad Request')
      error.response = {
        status: 400,
        data: {
          code: 100,
          message: 'ERROR MAPPING',
          validation: {
            nominal: 'Nominal topup minimal Rp 5.000',
          },
        },
      } as AxiosResponse

      expect(getErrorMessage(error)).toBe('nominal: Nominal topup minimal Rp 5.000')
    })

    it('uses normal backend message if not ERROR MAPPING', () => {
      const error = new AxiosError('Bad Request')
      error.response = {
        status: 400,
        data: {
          message: 'Kartu RFID sudah diblokir',
        },
      } as AxiosResponse

      expect(getErrorMessage(error)).toBe('Kartu RFID sudah diblokir')
    })

    it('falls back to Error.message or custom fallback', () => {
      expect(getErrorMessage(new Error('Koneksi terputus'))).toBe('Koneksi terputus')
      expect(getErrorMessage(null, 'Terjadi kesalahan')).toBe('Terjadi kesalahan')
    })
  })
})
