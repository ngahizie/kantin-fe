import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyStoredSaldoOverrides,
  applyStoredSetoranConfirmations,
  clearStoredSaldoOverrides,
  getStoredSaldoOverrides,
  getStoredSetoranConfirmations,
  getStoredTopupTransactions,
  KANTIN_SALDO_STORAGE_KEY,
  KANTIN_TOPUP_TRANSACTIONS_KEY,
  saveStoredSaldo,
  saveStoredSetoranConfirmation,
  saveTopupTransaction,
} from '../saldo-storage'

// Mock localStorage jika dijalankan di environment Node tanpa browser runner
class LocalStorageMock {
  private store: Record<string, string> = {}

  clear() {
    this.store = {}
  }

  getItem(key: string) {
    return this.store[key] || null
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value)
  }

  removeItem(key: string) {
    delete this.store[key]
  }
}

if (typeof window === 'undefined') {
  const mockStorage = new LocalStorageMock()
  ;(globalThis as unknown as { window: { localStorage: LocalStorageMock } }).window = {
    localStorage: mockStorage,
  }
}

describe('saldo-storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearStoredSaldoOverrides()
  })

  it('mengembalikan objek kosong jika belum ada data di localStorage', () => {
    const overrides = getStoredSaldoOverrides()
    expect(overrides).toEqual({})
  })

  it('menyimpan dan membaca saldo baru siswa dari localStorage', () => {
    saveStoredSaldo(102, 205000)

    const overrides = getStoredSaldoOverrides()
    expect(overrides[102]).toBe(205000)

    const rawInStorage = window.localStorage.getItem(KANTIN_SALDO_STORAGE_KEY)
    expect(rawInStorage).toBeTruthy()
    expect(JSON.parse(rawInStorage!)).toEqual({ 102: 205000 })
  })

  it('menerapkan stored overrides pada daftar siswa', () => {
    saveStoredSaldo(101, 90000)
    saveStoredSaldo(102, 300000)

    const sample = [
      { siswa_id: 101, saldo: 45000, nama: 'Budi' },
      { siswa_id: 102, saldo: 5000, nama: 'Siti' },
      { siswa_id: 103, saldo: 10000, nama: 'Rian' },
    ]

    const updated = applyStoredSaldoOverrides(sample)
    expect(updated[0].saldo).toBe(90000)
    expect(updated[1].saldo).toBe(300000)
    expect(updated[2].saldo).toBe(10000) // Siswa tanpa override tetap mempertahankan saldo aslinya
  })

  it('menangani data JSON korup di localStorage secara defensif', () => {
    window.localStorage.setItem(KANTIN_SALDO_STORAGE_KEY, '{ invalid_json')

    const overrides = getStoredSaldoOverrides()
    expect(overrides).toEqual({})
  })

  it('clearStoredSaldoOverrides menghapus data di localStorage', () => {
    saveStoredSaldo(102, 500000)
    expect(getStoredSaldoOverrides()[102]).toBe(500000)

    clearStoredSaldoOverrides()
    expect(getStoredSaldoOverrides()).toEqual({})
  })

  it('getStoredTopupTransactions mengembalikan array kosong jika belum ada di storage dan membuang entri non-siswa lama', () => {
    expect(getStoredTopupTransactions('2026-10-26', 2)).toEqual([])

    window.localStorage.setItem(
      KANTIN_TOPUP_TRANSACTIONS_KEY,
      JSON.stringify([
        {
          id: 'TX-LAMA-TAMU',
          waktu: '2026-10-26T03:00:00Z',
          subjek_tipe: 'KARTU_TAMU',
          subjek_nama: 'Tamu Lama',
          subjek_info: 'Kartu Tamu',
          nominal: 50000,
          penyetor: 'Tamu',
          referensi_id: 'TX-LAMA-TAMU',
          tanggal: '2026-10-26',
          petugas_id: 2,
        },
        {
          id: 'TX-LAMA-SISWA',
          waktu: '2026-10-26T04:00:00Z',
          subjek_tipe: 'SISWA',
          subjek_nama: 'Budi Santoso',
          subjek_info: 'X IPA 1',
          nominal: 75000,
          penyetor: 'Orang Tua',
          referensi_id: 'TX-LAMA-SISWA',
          tanggal: '2026-10-26',
          petugas_id: 2,
        },
      ])
    )

    const migrated = getStoredTopupTransactions('2026-10-26', 2)
    expect(migrated).toHaveLength(1)
    expect(migrated[0].siswa_nama).toBe('Budi Santoso')
    expect(migrated[0].siswa_info).toBe('X IPA 1')
    expect(migrated[0].nominal).toBe(75000)
  })

  it('saveTopupTransaction menyimpan transaksi baru ke storage dan tidak menduplikasi jika referensi_id sama', () => {
    saveTopupTransaction({
      id: 'TX-TEST-001',
      waktu: '2026-10-26T10:00:00Z',
      siswa_nama: 'Ahmad Fauzi',
      siswa_info: 'XII IPA 3',
      nominal: 25000,
      penyetor: 'Siswa Langsung',
      referensi_id: 'TX-TEST-001',
      tanggal: '2026-10-26',
      petugas_id: 2,
    })

    const list = getStoredTopupTransactions('2026-10-26', 2)
    expect(list.length).toBe(1)
    expect(list[0].id).toBe('TX-TEST-001')
    expect(list[0].nominal).toBe(25000)

    // Coba simpan ulang referensi_id yang sama
    saveTopupTransaction({
      id: 'TX-TEST-001',
      waktu: '2026-10-26T10:00:00Z',
      siswa_nama: 'Ahmad Fauzi',
      siswa_info: 'XII IPA 3',
      nominal: 25000,
      penyetor: 'Siswa Langsung',
      referensi_id: 'TX-TEST-001',
      tanggal: '2026-10-26',
      petugas_id: 2,
    })

    const listAfterDuplicate = getStoredTopupTransactions('2026-10-26', 2)
    expect(listAfterDuplicate.length).toBe(1)
  })

  it('getStoredTopupTransactions menyaring transaksi berdasarkan tanggal dan petugas', () => {
    const listOtherDate = getStoredTopupTransactions('2026-01-01', 2)
    expect(listOtherDate).toEqual([])

    const listOtherPetugas = getStoredTopupTransactions('2026-10-26', 999)
    expect(listOtherPetugas).toEqual([])
  })

  it('mendukung isolasi saldo per tenant/sekolahId', () => {
    saveStoredSaldo(102, 75000, 2)
    saveStoredSaldo(102, 200000, 1)

    const saldoSekolah2 = getStoredSaldoOverrides(2)
    const saldoSekolah1 = getStoredSaldoOverrides(1)

    expect(saldoSekolah2[102]).toBe(75000)
    expect(saldoSekolah1[102]).toBe(200000)
  })

  it('applyStoredSaldoOverrides mempertahankan saldo tersimpan pada siswa dengan saldo awal 0', () => {
    saveStoredSaldo(102, 50000)

    const sample = [{ siswa_id: 102, saldo: 0, nama: 'Siti Rahmawati' }]
    const updated = applyStoredSaldoOverrides(sample)

    expect(updated[0].saldo).toBe(50000)
  })

  it('saveStoredSetoranConfirmation dan applyStoredSetoranConfirmations memperbarui status setoran', () => {
    saveStoredSetoranConfirmation({
      id: 'SETOR-20261026-6',
      petugas_id: 6,
      tanggal: '2026-10-26',
      uang_fisik: 50000,
      selisih: 0,
      catatan: 'Uang pas',
      bendahara_nama: 'Bendahara Sekolah',
    })

    const confirmations = getStoredSetoranConfirmations()
    expect(confirmations['SETOR-20261026-6']).toBeDefined()
    expect(confirmations['2026-10-26_6']).toBeDefined()
    expect(confirmations['SETOR-20261026-6'].status).toBe('TERKONFIRMASI')
    expect(confirmations['SETOR-20261026-6'].uang_fisik).toBe(50000)

    const rawRows = [
      {
        id: 'SETOR-20261026-6',
        tanggal: '2026-10-26',
        petugas_id: 6,
        status: 'MENUNGGU_KONFIRMASI' as const,
        uang_fisik: null,
        selisih: null,
        catatan: undefined,
        bendahara_nama: null,
        konfirmasi_pada: null,
      },
    ]

    const updatedRows = applyStoredSetoranConfirmations(rawRows)
    expect(updatedRows[0].status).toBe('TERKONFIRMASI')
    expect(updatedRows[0].uang_fisik).toBe(50000)
    expect(updatedRows[0].selisih).toBe(0)
    expect(updatedRows[0].bendahara_nama).toBe('Bendahara Sekolah')
  })
})

