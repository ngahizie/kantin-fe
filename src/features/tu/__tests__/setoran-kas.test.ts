import { describe, expect, it } from 'vitest'
import { mapRekapSetoranTuItem } from '../types'

describe('mapRekapSetoranTuItem', () => {
  it('maps raw backend RekapSetoranTuItem with unconfirmed status correctly', () => {
    const rawBe = {
      petugasId: 2,
      tanggal: '2026-10-22',
      totalTopup: 100000,
      jumlahDisetor: 0,
      selisih: 100000,
      referensiId: null,
    }

    const mapped = mapRekapSetoranTuItem(rawBe)

    expect(mapped.id).toBe('SETOR-20261022-2')
    expect(mapped.tanggal).toBe('2026-10-22')
    expect(mapped.petugas_id).toBe(2)
    expect(mapped.petugas_nama).toBe('Sri Wahyuni (Petugas TU)')
    expect(mapped.total_sistem).toBe(100000)
    expect(mapped.uang_fisik).toBeNull()
    expect(mapped.selisih).toBeNull()
    expect(mapped.status).toBe('MENUNGGU_KONFIRMASI')

    // Verifikasi pencarian case-insensitive aman dari error toLowerCase
    expect(mapped.petugas_nama.toLowerCase()).toContain('sri')
    expect(mapped.id.toLowerCase()).toContain('setor')
  })

  it('maps confirmed RekapSetoranTuItem with pas cash amount', () => {
    const rawBe = {
      petugasId: 1,
      tanggal: '2026-10-22',
      totalTopup: 200000,
      jumlahDisetor: 200000,
      selisih: 0,
      referensiId: 'BA-SETORAN-20261022-1',
    }

    const mapped = mapRekapSetoranTuItem(rawBe)

    expect(mapped.id).toBe('BA-SETORAN-20261022-1')
    expect(mapped.petugas_id).toBe(1)
    expect(mapped.petugas_nama).toBe('Andika Pratama (Petugas TU 1)')
    expect(mapped.total_sistem).toBe(200000)
    expect(mapped.uang_fisik).toBe(200000)
    expect(mapped.selisih).toBe(0)
    expect(mapped.status).toBe('TERKONFIRMASI')
  })

  it('maps confirmed RekapSetoranTuItem with deficit / kurang setor', () => {
    // Di BE: totalTopup (100.000) - jumlahDisetor (95.000) = selisih 5.000
    // Di FE: uang_fisik (95.000) - total_sistem (100.000) = selisih -5.000
    const rawBe = {
      petugasId: 2,
      tanggal: '2026-10-22',
      totalTopup: 100000,
      jumlahDisetor: 95000,
      selisih: 5000,
      referensiId: 'BA-SETORAN-20261022-2',
    }

    const mapped = mapRekapSetoranTuItem(rawBe)

    expect(mapped.uang_fisik).toBe(95000)
    expect(mapped.selisih).toBe(-5000)
    expect(mapped.status).toBe('TERKONFIRMASI')
  })

  it('handles null, undefined, or missing properties gracefully without error', () => {
    const mappedNull = mapRekapSetoranTuItem(null, '2026-10-22')
    expect(mappedNull.id).toBeDefined()
    expect(mappedNull.petugas_nama).toBe('Petugas Tidak Diketahui')
    expect(mappedNull.petugas_nama.toLowerCase()).toBeDefined()

    const mappedEmpty = mapRekapSetoranTuItem({})
    expect(mappedEmpty.petugas_nama).toBe('Andika Pratama (Petugas TU 1)')
    expect(mappedEmpty.total_sistem).toBe(0)

    const mappedOther = mapRekapSetoranTuItem({ petugasId: 99 })
    expect(mappedOther.petugas_nama).toBe('Petugas Loket TU #99')
  })
})
