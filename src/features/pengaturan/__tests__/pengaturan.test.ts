import { describe, it, expect, beforeEach } from 'vitest'
import {
  pengaturanKantinSchema,
  titikKasirFormSchema,
  DEFAULT_PENGATURAN_KANTIN,
} from '../types'
import { usePengaturanStore } from '@/stores/usePengaturanStore'

describe('Pengaturan Operasional Kantin Schema', () => {
  const validData = {
    namaKantin: 'Kantin Utama SMP Skoolia',
    jamTutupOtomatis: '16:30',
    konfirmasiManual: true,
    durasiFotoDetik: 5,
    minTopup: 10000,
    maksTopup: 200000,
    batasSaldoSiswa: 500000,
    kebijakanSaldoMengendap: 'REFUND' as const,
    ambangHari: 90,
  }

  it('validasi sukses dengan data yang valid', () => {
    const result = pengaturanKantinSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.namaKantin).toBe('Kantin Utama SMP Skoolia')
      expect(result.data.durasiFotoDetik).toBe(5)
      expect(result.data.konfirmasiManual).toBe(true)
    }
  })

  it('menerima nilai default pengaturan kantin', () => {
    const result = pengaturanKantinSchema.safeParse(DEFAULT_PENGATURAN_KANTIN)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.jamTutupOtomatis).toBe('23:59')
      expect(result.data.durasiFotoDetik).toBe(3)
      expect(result.data.konfirmasiManual).toBe(false)
    }
  })

  it('gagal jika jam tutup otomatis format tidak valid', () => {
    const invalidTimes = ['25:00', '12:60', '8:30', 'invalid', '12-30']
    for (const time of invalidTimes) {
      const result = pengaturanKantinSchema.safeParse({
        ...validData,
        jamTutupOtomatis: time,
      })
      expect(result.success).toBe(false)
    }
  })

  it('gagal jika durasi foto di luar batas 1 sampai 10 detik', () => {
    const tooLow = pengaturanKantinSchema.safeParse({
      ...validData,
      durasiFotoDetik: 0,
    })
    expect(tooLow.success).toBe(false)

    const tooHigh = pengaturanKantinSchema.safeParse({
      ...validData,
      durasiFotoDetik: 15,
    })
    expect(tooHigh.success).toBe(false)
  })

  it('gagal jika batas maks topup lebih kecil dari batas min topup', () => {
    const result = pengaturanKantinSchema.safeParse({
      ...validData,
      minTopup: 50000,
      maksTopup: 20000,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((e) => e.path.includes('maksTopup'))
      expect(err).toBeDefined()
    }
  })

  it('gagal jika min topup di bawah Rp 1.000', () => {
    const result = pengaturanKantinSchema.safeParse({
      ...validData,
      minTopup: 500,
    })
    expect(result.success).toBe(false)
  })

  it('gagal jika nama kantin kurang dari 2 karakter atau kosong', () => {
    const result = pengaturanKantinSchema.safeParse({
      ...validData,
      namaKantin: 'K',
    })
    expect(result.success).toBe(false)
  })
})

describe('Titik Kasir Form Schema', () => {
  it('validasi sukses dengan data yang benar', () => {
    const result = titikKasirFormSchema.safeParse({
      nama: 'Kasir Pujasera Barat',
      kode: 'POS-BARAT-01',
      aktif: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kode).toBe('POS-BARAT-01')
      expect(result.data.nama).toBe('Kasir Pujasera Barat')
      expect(result.data.aktif).toBe(true)
    }
  })

  it('gagal jika kode mengandung karakter non-alfanumerik selain strip', () => {
    const result = titikKasirFormSchema.safeParse({
      nama: 'Kasir Depan',
      kode: 'POS@01!',
      aktif: true,
    })
    expect(result.success).toBe(false)
  })

  it('gagal jika nama terlalu pendek atau kode terlalu pendek', () => {
    const resultNama = titikKasirFormSchema.safeParse({
      nama: 'A',
      kode: 'POS-01',
      aktif: true,
    })
    expect(resultNama.success).toBe(false)

    const resultKode = titikKasirFormSchema.safeParse({
      nama: 'Kasir Barat',
      kode: 'A',
      aktif: true,
    })
    expect(resultKode.success).toBe(false)
  })
})

describe('Zustand usePengaturanStore', () => {
  beforeEach(() => {
    localStorage.clear()
    const store = usePengaturanStore.getState()
    store.resetPengaturanToDefault()
    store.setActiveTitikKasirId(null)
  })

  it('menginisialisasi dengan nilai default', () => {
    const state = usePengaturanStore.getState()
    expect(state.pengaturan.jamTutupOtomatis).toBe('23:59')
    expect(state.pengaturan.durasiFotoDetik).toBe(3)
    expect(state.pengaturan.konfirmasiManual).toBe(false)
    expect(state.activeTitikKasirId).toBeNull()
  })

  it('dapat mengatur activeTitikKasirId dan menyimpannya di localStorage', () => {
    const store = usePengaturanStore.getState()
    store.setActiveTitikKasirId(42)
    expect(usePengaturanStore.getState().activeTitikKasirId).toBe(42)
    expect(localStorage.getItem('skoolia_active_titik_kasir_id')).toBe('42')

    store.setActiveTitikKasirId(null)
    expect(usePengaturanStore.getState().activeTitikKasirId).toBeNull()
    expect(localStorage.getItem('skoolia_active_titik_kasir_id')).toBeNull()
  })

  it('dapat mereset pengaturan ke default', () => {
    const store = usePengaturanStore.getState()
    store.setPengaturan({
      namaKantin: 'Kantin Berubah',
      jamTutupOtomatis: '14:00',
      konfirmasiManual: true,
      durasiFotoDetik: 7,
      minTopup: 20000,
      maksTopup: 1000000,
      batasSaldoSiswa: 2000000,
      kebijakanSaldoMengendap: 'PINDAH_SAUDARA',
      ambangHari: 120,
    })

    expect(usePengaturanStore.getState().pengaturan.durasiFotoDetik).toBe(7)

    store.resetPengaturanToDefault()
    expect(usePengaturanStore.getState().pengaturan.durasiFotoDetik).toBe(3)
    expect(usePengaturanStore.getState().pengaturan.jamTutupOtomatis).toBe('23:59')
  })
})
