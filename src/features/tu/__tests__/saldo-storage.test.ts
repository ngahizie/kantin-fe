import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyStoredSaldoOverrides,
  clearStoredSaldoOverrides,
  getInitialStudents,
  getStoredSaldoOverrides,
  getStoredTopupTransactions,
  KANTIN_SALDO_STORAGE_KEY,
  saveStoredSaldo,
  saveTopupTransaction,
} from '../saldo-storage'
import { MOCK_SISWA } from '@/mocks/mock-data'

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

  it('memperbarui saldo siswa yang ada di MOCK_SISWA secara in-memory', () => {
    saveStoredSaldo(102, 250000)

    const siti = MOCK_SISWA.find((s) => s.siswa_id === 102)
    expect(siti?.saldo).toBe(250000)
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

  it('getInitialStudents mengembalikan MOCK_SISWA dengan saldo yang telah ter-override', () => {
    saveStoredSaldo(102, 200000)

    const initial = getInitialStudents()
    const siti = initial.find((s) => s.siswa_id === 102)
    expect(siti?.saldo).toBe(200000)
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

  it('getStoredTopupTransactions mengembalikan seed default hari ini jika belum ada di storage', () => {
    const list = getStoredTopupTransactions('2026-10-26', 2)
    expect(list.length).toBe(8)
    const total = list.reduce((sum, t) => sum + t.nominal, 0)
    expect(total).toBe(480000)
  })

  it('saveTopupTransaction menyimpan transaksi baru ke storage dan tidak menduplikasi jika referensi_id sama', () => {
    saveTopupTransaction({
      id: 'TX-TEST-001',
      waktu: '2026-10-26T10:00:00Z',
      subjek_tipe: 'SISWA',
      subjek_nama: 'Ahmad Fauzi',
      subjek_info: 'XII IPA 3',
      nominal: 25000,
      penyetor: 'Siswa Langsung',
      referensi_id: 'TX-TEST-001',
      tanggal: '2026-10-26',
      petugas_id: 2,
    })

    const list = getStoredTopupTransactions('2026-10-26', 2)
    expect(list.length).toBe(9)
    expect(list[0].id).toBe('TX-TEST-001')
    expect(list[0].nominal).toBe(25000)

    // Coba simpan ulang referensi_id yang sama
    saveTopupTransaction({
      id: 'TX-TEST-001',
      waktu: '2026-10-26T10:00:00Z',
      subjek_tipe: 'SISWA',
      subjek_nama: 'Ahmad Fauzi',
      subjek_info: 'XII IPA 3',
      nominal: 25000,
      penyetor: 'Siswa Langsung',
      referensi_id: 'TX-TEST-001',
      tanggal: '2026-10-26',
      petugas_id: 2,
    })

    const listAfterDuplicate = getStoredTopupTransactions('2026-10-26', 2)
    expect(listAfterDuplicate.length).toBe(9)
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
})
