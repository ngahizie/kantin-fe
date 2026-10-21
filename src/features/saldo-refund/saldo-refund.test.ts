import { describe, it, expect } from 'vitest'
import {
  refundOrangTuaSchema,
  pindahSaldoSchema,
  mapTransaksiKasirItemToSesiTutup,
  mapMutasiKoreksiItem,
} from './types'

describe('Refund Saldo Orang Tua Zod Validation Schema', () => {
  it('berhasil memvalidasi payload refund tunai yang valid', () => {
    const validData = {
      siswaId: 201,
      nominal: 125000,
      metode: 'TUNAI' as const,
      namaPenerima: 'Hendra Santoso',
      kontakPenerima: '081234567890',
      catatan: 'Pengembalian tunai kelulusan',
    }
    const result = refundOrangTuaSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nominal).toBe(125000)
      expect(result.data.metode).toBe('TUNAI')
    }
  })

  it('berhasil memvalidasi payload refund transfer bank lengkap', () => {
    const validData = {
      siswaId: 202,
      nominal: 85000,
      metode: 'TRANSFER_BANK' as const,
      namaPenerima: 'Rahmawati Ibu',
      kontakPenerima: '081398765432',
      bank: 'BCA',
      noRekening: '8830192831',
      namaRekening: 'Rahmawati',
      catatan: 'Transfer sisa saldo pindah sekolah',
    }
    const result = refundOrangTuaSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.metode).toBe('TRANSFER_BANK')
      expect(result.data.bank).toBe('BCA')
    }
  })

  it('gagal jika refund transfer bank tidak menyertakan nomor rekening', () => {
    const invalidData = {
      siswaId: 202,
      nominal: 85000,
      metode: 'TRANSFER_BANK' as const,
      namaPenerima: 'Rahmawati Ibu',
      kontakPenerima: '081398765432',
      bank: 'BCA',
      noRekening: '', // Kosong
      namaRekening: 'Rahmawati',
    }
    const result = refundOrangTuaSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('noRekening'))
      expect(issue).toBeDefined()
    }
  })

  it('gagal jika nominal refund bernilai 0 atau negatif', () => {
    const invalidData = {
      siswaId: 201,
      nominal: 0,
      metode: 'TUNAI' as const,
      namaPenerima: 'Hendra Santoso',
      kontakPenerima: '081234567890',
    }
    const result = refundOrangTuaSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('Pindah Saldo Saudara Kandung Zod Validation Schema', () => {
  it('berhasil memvalidasi pemindahan saldo antar saudara yang berbeda', () => {
    const validData = {
      siswaAsalId: 201,
      siswaTujuanId: 101,
      nominal: 125000,
      beritaAcara: 'Pemindahan saldo kelulusan kakak ke adik kandung',
    }
    const result = pindahSaldoSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.siswaAsalId).toBe(201)
      expect(result.data.siswaTujuanId).toBe(101)
    }
  })

  it('gagal jika siswa tujuan sama dengan siswa asal', () => {
    const invalidData = {
      siswaAsalId: 101,
      siswaTujuanId: 101, // Sama
      nominal: 50000,
      beritaAcara: 'Transfer ke diri sendiri tidak valid',
    }
    const result = pindahSaldoSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('siswaTujuanId'))
      expect(issue?.message).toContain('tidak boleh sama')
    }
  })

  it('gagal jika berita acara terlalu pendek', () => {
    const invalidData = {
      siswaAsalId: 201,
      siswaTujuanId: 101,
      nominal: 50000,
      beritaAcara: 'Trf', // < 5 karakter
    }
    const result = pindahSaldoSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('Mapping Adapter Transaksi Sesi Tutup & Mutasi Koreksi BE (Issue #230)', () => {
  const dummySiswa = [
    { siswa_id: 101, nama: 'Budi Santoso', kelas: 'X IPA 1', nis: '2026001' },
    { siswa_id: 102, nama: 'Siti Rahmawati', kelas: 'XI IPS 2', nis: '2026002' },
  ]

  it('berhasil memetakan TransaksiKasirItem camelCase BE ke TransaksiSesiTutupItem', () => {
    const rawBeItem = {
      id: 910103,
      waktu: '2026-10-20T09:30:00+07:00',
      sesiKasirId: 1002,
      titikKasirId: 1001,
      titikKasirNama: 'Kasir Kantin Utama',
      petugasId: 4,
      subjekTipe: 'SISWA',
      subjekId: 101,
      subjekNama: null, // Dari BE null untuk siswa
      kartuUid: 'DA000003',
      total: 16000,
      status: 'SUKSES',
      alasanVoid: null,
      voidAt: null,
      dapatDikoreksi: true,
    }

    const mapped = mapTransaksiKasirItemToSesiTutup(rawBeItem, dummySiswa)

    expect(mapped.id).toBe('910103')
    expect(mapped.sesi_kasir_id).toBe(1002)
    expect(mapped.titik_kasir).toBe('Kasir Kantin Utama')
    expect(mapped.petugas_kasir).toBe('Petugas #4')
    expect(mapped.subjek_tipe).toBe('SISWA')
    expect(mapped.subjek_id).toBe(101)
    expect(mapped.subjek_nama).toBe('Budi Santoso')
    expect(mapped.subjek_info).toBe('X IPA 1 (NIS: 2026001)')
    expect(mapped.total).toBe(16000)
    expect(mapped.status).toBe('SUKSES')
    expect(mapped.dapatDikoreksi).toBe(true)
    expect(mapped.dapat_dikoreksi).toBe(true)
  })

  it('memetakan status VOID dan menandai dapatDikoreksi = false', () => {
    const rawBeItem = {
      id: 910104,
      waktu: '2026-10-20T10:20:00+07:00',
      sesiKasirId: 1002,
      titikKasirNama: 'Kasir Kantin Utama',
      petugasId: 4,
      subjekTipe: 'KARTU_TAMU',
      subjekId: 1003,
      subjekNama: 'Tamu Umum',
      kartuUid: 'DA000003',
      total: 5000,
      status: 'VOID',
      alasanVoid: 'Salah input item',
      voidAt: '2026-10-20T11:10:00+07:00',
      dapatDikoreksi: false,
    }

    const mapped = mapTransaksiKasirItemToSesiTutup(rawBeItem, dummySiswa)

    expect(mapped.status).toBe('VOID')
    expect(mapped.dapatDikoreksi).toBe(false)
    expect(mapped.dapat_dikoreksi).toBe(false)
    expect(mapped.alasanVoid).toBe('Salah input item')
    expect(mapped.subjek_nama).toBe('Tamu Umum')
  })

  it('berhasil memetakan MutasiKoreksiItem camelCase BE ke MutasiKoreksiItem FE', () => {
    const rawBeMutasi = {
      id: 12,
      waktu: '2026-10-20T10:00:00+07:00',
      subjekTipe: 'SISWA',
      subjekId: 101,
      subjekNama: null,
      arah: 'KREDIT',
      nominal: 16000,
      saldoSebelum: 50000,
      saldoSetelah: 66000,
      keterangan: 'Pembalik transaksi belanja sesi tertutup #1002',
      referensiId: 'BA-KOR-20261020-9988',
      transaksiId: 910103,
      aktorId: 10,
    }

    const mapped = mapMutasiKoreksiItem(rawBeMutasi, dummySiswa)

    expect(mapped.id).toBe(12)
    expect(mapped.referensi_id).toBe('BA-KOR-20261020-9988')
    expect(mapped.subjek_nama).toBe('Budi Santoso')
    expect(mapped.nominal).toBe(16000)
    expect(mapped.saldo_sebelum).toBe(50000)
    expect(mapped.saldo_setelah).toBe(66000)
    expect(mapped.alasan).toBe('Pembalik transaksi belanja sesi tertutup #1002')
    expect(mapped.bendahara_nama).toBe('Bendahara #10')
    expect(mapped.transaksi_terkait_id).toBe(910103)
    expect(mapped.jenis_koreksi).toBe('PEMBALIK_TRANSAKSI_KASIR')
  })
})
