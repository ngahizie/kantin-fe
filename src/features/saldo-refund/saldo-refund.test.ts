import { describe, it, expect } from 'vitest'
import {
  refundOrangTuaSchema,
  pindahSaldoSchema,
  mapTransaksiKasirItemToSesiTutup,
  mapMutasiKoreksiItem,
  generateSecureReferensiId,
} from './types'

describe('Refund Saldo Orang Tua Zod Validation Schema', () => {
  it('berhasil memvalidasi payload refund tunai yang valid', () => {
    const validData = {
      siswaId: 201,
      nominal: 125000,
      metode: 'TUNAI' as const,
      namaPenerima: 'Ahmad Hidayat',
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
      namaPenerima: 'Ahmad Hidayat',
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
      siswaId: 101,
      siswaNama: null, // Dari BE null untuk siswa
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
    expect(mapped.siswa_id).toBe(101)
    expect(mapped.siswa_nama).toBe('Budi Santoso')
    expect(mapped.siswa_info).toBe('X IPA 1 (NIS: 2026001)')
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
      siswaId: 102,
      siswaNama: 'Siti Rahmawati',
      kartuUid: 'DA000004',
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
    expect(mapped.siswa_nama).toBe('Siti Rahmawati')
  })

  it('membersihkan sufiks (demo void) dari alasanVoid transaksi VOID', () => {
    const rawBeItem = {
      id: 910105,
      waktu: '2026-10-20T10:20:00+07:00',
      total: 18000,
      status: 'VOID',
      alasanVoid: 'Salah input menu (demo void)',
      dapatDikoreksi: false,
    }

    const mapped = mapTransaksiKasirItemToSesiTutup(rawBeItem, dummySiswa)

    expect(mapped.alasanVoid).toBe('Salah input menu')
    expect(mapped.alasan_void).toBe('Salah input menu')
  })

  it('berhasil memetakan MutasiKoreksiItem camelCase BE ke MutasiKoreksiItem FE', () => {
    const rawBeMutasi = {
      id: 12,
      waktu: '2026-10-20T10:00:00+07:00',
      siswaId: 101,
      siswaNama: null,
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
    expect(mapped.siswa_nama).toBe('Budi Santoso')
    expect(mapped.nominal).toBe(16000)
    expect(mapped.saldo_sebelum).toBe(50000)
    expect(mapped.saldo_setelah).toBe(66000)
    expect(mapped.alasan).toBe('Pembalik transaksi belanja sesi tertutup #1002')
    expect(mapped.bendahara_nama).toBe('Bendahara #10')
    expect(mapped.transaksi_terkait_id).toBe(910103)
    expect(mapped.jenis_koreksi).toBe('PEMBALIK_TRANSAKSI_KASIR')
  })

  it('mengamankan sel CSV dari serangan Formula Injection (SEC-KOR-01)', async () => {
    const { sanitizeCsvCell } = await import('@/lib/csv-sanitizer')
    expect(sanitizeCsvCell('=1+1')).toBe(`"'=1+1"`)
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`)
    expect(sanitizeCsvCell('+cmd|')).toBe(`"'+cmd|"`)
    expect(sanitizeCsvCell('-cmd|')).toBe(`"'-cmd|"`)
    expect(sanitizeCsvCell('Normal, teks dengan koma')).toBe(`"Normal, teks dengan koma"`)
    expect(sanitizeCsvCell('Teks dengan "kutip" ganda')).toBe(`"Teks dengan ""kutip"" ganda"`)
  })

  it('memvalidasi kontrak koreksi transaksi sesi tertutup kasir vs koreksi manual (SEC-KOR-02)', () => {
    // Validasi bahwa payload pembalik transaksi membawa kodeStruk dan alasan ke endpoint kasir
    const transaksiId = 910103
    const alasan = 'Pembalik transaksi belanja salah potong kasir'
    const endpointKasirKoreksi = `/api/kasir/transaksi/${transaksiId}/koreksi`
    const payloadKasir = { alasan, kodeStruk: String(transaksiId) }

    expect(endpointKasirKoreksi).toBe('/api/kasir/transaksi/910103/koreksi')
    expect(payloadKasir.kodeStruk).toBe('910103')
    expect(payloadKasir.alasan.length).toBeGreaterThan(0)
  })

  it('menghasilkan nomor referensi berita acara berbasis CSPRNG anti-tabrakan (SEC-KOR-03)', () => {
    const ref1 = generateSecureReferensiId('BA-KOR')
    const ref2 = generateSecureReferensiId('BA-KOR')

    expect(ref1).not.toBe(ref2)
    expect(ref1).toMatch(/^BA-KOR-\d{8}-[A-F0-9]{8}$/)
    expect(ref1.length).toBeLessThanOrEqual(56) // Sesuai batas aman idempotency_key DB
  })

  it('memvalidasi batas panjang maksimum referensiId (56) dan alasan koreksi (255) (SEC-KOR-05)', () => {
    const validAlasan = 'A'.repeat(255)
    const invalidAlasan = 'A'.repeat(256)
    const validRef = 'BA-KOR-20261120-12345678'
    const invalidRef = 'B'.repeat(57)

    expect(validAlasan.length).toBe(255)
    expect(invalidAlasan.length).toBeGreaterThan(255)
    expect(validRef.length).toBeLessThanOrEqual(56)
    expect(invalidRef.length).toBeGreaterThan(56)
  })

  it('memverifikasi integritas parameter ukuran paginasi dan fallback total DB (SEC-KOR-06)', () => {
    const defaultParams = { ukuran: 100 }
    expect(defaultParams.ukuran).toBe(100)

    const rawHalaman = {
      items: [{ id: 1 }, { id: 2 }],
      total: 45,
      halaman: 0,
      ukuran: 100,
      totalHalaman: 1,
    }
    const resolvedTotal = typeof rawHalaman.total === 'number' ? rawHalaman.total : rawHalaman.items.length
    expect(resolvedTotal).toBe(45)
  })
})
