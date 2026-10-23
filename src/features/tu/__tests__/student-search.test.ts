import { describe, expect, it } from 'vitest'
import { mapInfoSiswaToKartuSiswa, type RawInfoSiswa } from '../types'

describe('mapInfoSiswaToKartuSiswa', () => {
  it('memetakan respons InfoSiswa backend ke format KartuSiswaMock dengan benar', () => {
    const rawBe: RawInfoSiswa = {
      siswaId: 101,
      nis: '2024001',
      nama: 'Budi Santoso',
      kelas: '7A',
      saldo: 75000,
      tidakAktif: false,
    }

    const mapped = mapInfoSiswaToKartuSiswa(rawBe)

    expect(mapped.siswa_id).toBe(101)
    expect(mapped.nis).toBe('2024001')
    expect(mapped.nama).toBe('Budi Santoso')
    expect(mapped.kelas).toBe('7A')
    expect(mapped.saldo).toBe(75000)
    expect(mapped.is_blocked).toBe(false)
    expect(mapped.uid).toBe('UID-2024001')
    expect(mapped.limit_harian).toBe(50000)
    expect(mapped.belanja_hari_ini).toBe(0)

    // Verifikasi bahwa charAt(0) berjalan aman dan mengembalikan inisial yang tepat
    expect(mapped.nama.charAt(0)).toBe('B')
  })

  it('memetakan status tidakAktif dari backend menjadi is_blocked', () => {
    const rawBe: RawInfoSiswa = {
      siswaId: 106,
      nis: '2023006',
      nama: 'Maya Sari',
      kelas: '9C',
      saldo: 15000,
      tidakAktif: true,
    }

    const mapped = mapInfoSiswaToKartuSiswa(rawBe)

    expect(mapped.siswa_id).toBe(106)
    expect(mapped.is_blocked).toBe(true)
  })

  it('menangani fallback properti alternatif seperti subjekId dan snake_case', () => {
    const rawFallback: RawInfoSiswa = {
      subjekId: 202,
      nis: '2024099',
      nama: 'Andi Wijaya',
      kelas: '8B',
      saldo: 25000,
      is_blocked: false,
      uid: 'RFID-12345',
    }

    const mapped = mapInfoSiswaToKartuSiswa(rawFallback)

    expect(mapped.siswa_id).toBe(202)
    expect(mapped.uid).toBe('RFID-12345')
    expect(mapped.nama).toBe('Andi Wijaya')
  })

  it('menangani objek null atau undefined tanpa melempar error', () => {
    const mappedNull = mapInfoSiswaToKartuSiswa(null)

    expect(mappedNull.siswa_id).toBe(0)
    expect(mappedNull.nama).toBe('Siswa Tidak Diketahui')
    expect(mappedNull.nama.charAt(0)).toBe('S')
    expect(mappedNull.saldo).toBe(0)
    expect(mappedNull.is_blocked).toBe(false)

    const mappedUndefined = mapInfoSiswaToKartuSiswa(undefined)
    expect(mappedUndefined.siswa_id).toBe(0)
    expect(mappedUndefined.nama).toBe('Siswa Tidak Diketahui')
  })

  it('menangani objek kosong atau nama yang tidak terdefinisi secara defensif', () => {
    const rawEmpty: RawInfoSiswa = {
      siswaId: 999,
    }

    const mapped = mapInfoSiswaToKartuSiswa(rawEmpty)

    expect(mapped.siswa_id).toBe(999)
    expect(mapped.nama).toBe('Siswa #999')
    expect(mapped.nama.charAt(0)).toBe('S')
    expect(mapped.kelas).toBe('-')
    expect(mapped.saldo).toBe(0)
  })
})
