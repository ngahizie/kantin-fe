import apiClient from '@/lib/api-client'
import { MOCK_SISWA, MOCK_KARTU_TAMU } from '@/mocks/mock-data'
import { getStoredSaldoOverrides } from '@/features/tu/saldo-storage'
import type {
  TapTransaksiRequest,
  TapTransaksiData,
  TapBuyerInfo,
  SesiKasirData,
  RekapSesiData,
  TutupSesiPayload,
  TransaksiSesiItem,
  InfoSaldoData,
} from '../types'

export * from '../types'

interface ApiResponse<T> {
  responseCode?: number
  code?: number
  message?: string
  data: T
}

/**
 * Generate idempotency key unik (UUIDv4) untuk mencegah transaksi ganda (PRD §11.3)
 */
export function generateIdempotencyKey(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export const kasirApi = {
  /**
   * Eksekusi transaksi tap kartu RFID di kasir (PRD §6.2)
   */
  async prosesTap(data: TapTransaksiRequest): Promise<TapTransaksiData> {
    const payload = {
      kartu_uid: data.rfidUid,
      rfidUid: data.rfidUid,
      items: data.items.map((it) => ({
        menu_id: it.menuId,
        menuId: it.menuId,
        qty: it.qty,
      })),
      idempotency_key: data.idempotencyKey,
      idempotencyKey: data.idempotencyKey,
      titikKasirId: data.titikKasirId || 1,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.post<ApiResponse<any>>(
      '/api/kasir/tap',
      payload
    )
    const raw = res.data?.data
    if (!raw) return raw as unknown as TapTransaksiData

    const subjekTipe =
      raw.pembeli?.subjekTipe ||
      raw.pembeli?.tipe ||
      raw.subjekTipe ||
      (raw.kelas ? 'SISWA' : 'KARTU_TAMU')

    const pembeli: TapBuyerInfo = {
      tipe: subjekTipe === 'KARTU_TAMU' ? 'KARTU_TAMU' : 'SISWA',
      subjekTipe: subjekTipe === 'KARTU_TAMU' ? 'KARTU_TAMU' : 'SISWA',
      nama: raw.pembeli?.nama || raw.nama || 'Pembeli',
      kelas: raw.pembeli?.kelas || raw.kelas || null,
      nis: raw.pembeli?.nis || raw.nis || null,
      foto_url:
        raw.pembeli?.foto_url ||
        raw.pembeli?.fotoUrl ||
        raw.fotoUrl ||
        raw.foto_url ||
        null,
      fotoUrl:
        raw.pembeli?.fotoUrl ||
        raw.pembeli?.foto_url ||
        raw.fotoUrl ||
        raw.foto_url ||
        null,
      sisa_saldo: Number(
        raw.pembeli?.sisa_saldo ??
          raw.pembeli?.saldoSisa ??
          raw.saldoSisa ??
          raw.sisa_saldo ??
          0
      ),
      saldoSisa: Number(
        raw.pembeli?.saldoSisa ??
          raw.pembeli?.sisa_saldo ??
          raw.saldoSisa ??
          raw.sisa_saldo ??
          0
      ),
      nomor_kartu:
        raw.pembeli?.nomor_kartu ||
        raw.pembeli?.nomorKartu ||
        raw.nomorKartu ||
        raw.nomor_kartu ||
        undefined,
      label_pemegang:
        raw.pembeli?.label_pemegang ||
        raw.pembeli?.labelPemegang ||
        raw.labelPemegang ||
        raw.label_pemegang ||
        undefined,
    }

    return {
      transaksi_id: Number(raw.transaksi_id || raw.transaksiId || 0),
      transaksiId: Number(raw.transaksiId || raw.transaksi_id || 0),
      total: Number(raw.total || 0),
      waktu: raw.waktu || new Date().toISOString(),
      // Nomor struk dipakai untuk refund (PRD §6.3 revisi).
      nomorStruk: raw.nomorStruk ?? raw.nomor_struk ?? undefined,
      pembeli,
    }
  },

  /**
   * Refund transaksi kasir (PRD §6.3 revisi).
   *
   * `kodeStruk` wajib dan harus cocok dengan nomor struk transaksi
   * (format `TRX-yyyyMMdd-<id>`, didapat dari `nomorStruk` respons tap).
   * Tujuannya mencegah kasir salah membatalkan transaksi orang lain.
   */
  async refundTransaksi(
    transaksiId: number,
    alasan: string,
    kodeStruk: string
  ): Promise<void> {
    await apiClient.post(`/api/kasir/transaksi/${transaksiId}/refund`, {
      alasan,
      kodeStruk,
    })
  },

  /**
   * Buka sesi kasir atau ambil sesi terbuka hari ini (PRD §6.4, Issue #5)
   */
  async bukaSesi(titikKasirId?: number): Promise<SesiKasirData> {
    const res = await apiClient.post<ApiResponse<SesiKasirData>>(
      '/api/kasir/sesi/buka',
      titikKasirId ? { titikKasirId } : {}
    )
    return res.data?.data
  },

  /**
   * Ambil sesi kasir aktif saat ini (PRD §6.4)
   */
  async getSesiAktif(titikKasirId?: number): Promise<SesiKasirData> {
    const res = await apiClient.get<ApiResponse<SesiKasirData>>(
      '/api/kasir/sesi/aktif',
      { params: { titikKasirId } }
    )
    return res.data?.data
  },

  /**
   * Pratinjau rekapitulasi sesi kasir (bruto, void, bersih) (PRD §6.4, Issue #5)
   */
  async getRekapSesi(sesiId: number): Promise<RekapSesiData> {
    const res = await apiClient.get<ApiResponse<RekapSesiData>>(
      `/api/kasir/sesi/${sesiId}/rekap`
    )
    return res.data?.data
  },

  /**
   * Tutup sesi kasir harian dan kunci transaksi (PRD §6.4, Issue #5)
   */
  async tutupSesi(
    sesiId: number,
    payload?: TutupSesiPayload
  ): Promise<SesiKasirData> {
    const res = await apiClient.post<ApiResponse<SesiKasirData>>(
      `/api/kasir/sesi/${sesiId}/tutup`,
      payload || {}
    )
    return res.data?.data
  },

  /**
   * Ambil daftar transaksi sesi kasir hari ini (Issue #5)
   */
  async getRiwayatTransaksiSesi(sesiId?: number): Promise<TransaksiSesiItem[]> {
    const res = await apiClient.get<ApiResponse<TransaksiSesiItem[]>>(
      '/api/kasir/transaksi/sesi',
      { params: { sesiId } }
    )
    return res.data?.data || []
  },

  /**
   * Cek saldo terkini siswa atau kartu tamu berdasarkan UID, NIS, atau Nama
   */
  async cekSaldo(query: string): Promise<InfoSaldoData> {
    const q = query.trim()
    const qUpper = q.toUpperCase()

    interface RawKartuTamuItem {
      id?: number
      rfidUid?: string
      uid?: string
      nomorKartu?: string
      nomor_kartu?: string
      labelPemegang?: string
      label_pemegang?: string
      saldo?: number
      status?: string
    }

    interface RawSiswaItem {
      id?: number
      siswa_id?: number
      nis?: string
      nama?: string
      kelas?: string
      kelas_terakhir?: string
      foto_url?: string
      fotoUrl?: string
      saldo?: number
      is_blocked?: boolean
      uid?: string
      rfid_uid?: string
    }

    // 1. Cek apakah cocok dengan Kartu Tamu
    try {
      const ktRes = await apiClient.get<ApiResponse<RawKartuTamuItem[]>>('/api/kartu-tamu', {
        silent: true,
        skipToast: true,
      })
      const ktList = ktRes.data?.data || []
      const foundKt = ktList.find(
        (k) =>
          (k.rfidUid || k.uid || '').toUpperCase() === qUpper ||
          (k.nomorKartu || k.nomor_kartu || '').toUpperCase() === qUpper ||
          (k.labelPemegang || k.label_pemegang || '')
            .toLowerCase()
            .includes(q.toLowerCase())
      )
      if (foundKt) {
        return {
          tipe: 'KARTU_TAMU',
          id: foundKt.id,
          nama:
            foundKt.labelPemegang ||
            foundKt.label_pemegang ||
            foundKt.nomorKartu ||
            foundKt.nomor_kartu ||
            'Kartu Tamu',
          nomorKartu: foundKt.nomorKartu || foundKt.nomor_kartu,
          labelPemegang: foundKt.labelPemegang || foundKt.label_pemegang,
          saldo: Number(foundKt.saldo || 0),
          status: foundKt.status || 'ACTIVE',
          uid: foundKt.rfidUid || foundKt.uid,
        }
      }
    } catch {
      // Fallback cek mock kartu tamu jika endpoint gagal / role kasir tidak berhak
      const mockKt = MOCK_KARTU_TAMU.find(
        (k) =>
          (k.uid || '').toUpperCase() === qUpper ||
          (k.nomor_kartu || '').toUpperCase() === qUpper ||
          (k.label_pemegang || '').toLowerCase().includes(q.toLowerCase())
      )
      if (mockKt) {
        return {
          tipe: 'KARTU_TAMU',
          id: mockKt.id,
          nama: mockKt.label_pemegang || mockKt.nomor_kartu,
          nomorKartu: mockKt.nomor_kartu,
          labelPemegang: mockKt.label_pemegang,
          saldo: mockKt.saldo,
          status: mockKt.status,
          uid: mockKt.uid,
        }
      }
    }

    // 2. Cek apakah cocok dengan Siswa
    let foundStudent: RawSiswaItem | undefined

    try {
      const siswaRes = await apiClient.get<ApiResponse<RawSiswaItem[]>>('/api/siswa', {
        params: { q, batas: 20 },
        silent: true,
        skipToast: true,
      })
      const siswaList = siswaRes.data?.data || []
      foundStudent = siswaList.find(
        (s) =>
          (s.rfid_uid || s.uid || '').toUpperCase() === qUpper ||
          (s.nis || '').toUpperCase() === qUpper ||
          (s.nama || '').toLowerCase().includes(q.toLowerCase())
      )
    } catch {
      // Backend /api/siswa error atau role kasir tidak berhak
    }

    // Fallback pencarian di MOCK_SISWA jika tidak ditemukan di backend
    if (!foundStudent) {
      foundStudent = MOCK_SISWA.find(
        (s) =>
          (s.uid || '').toUpperCase() === qUpper ||
          (s.nis || '').toUpperCase() === qUpper ||
          (s.nama || '').toLowerCase().includes(q.toLowerCase())
      )
    }

    if (foundStudent) {
      const studentId = foundStudent.siswa_id || foundStudent.id
      let finalSaldo = Number(foundStudent.saldo || 0)

      // Coba ambil saldo live dari /api/saldo jika tersedia
      try {
        const saldoRes = await apiClient.get<ApiResponse<{ saldo?: number }>>('/api/saldo', {
          params: {
            subjekTipe: 'SISWA',
            subjekId: studentId,
          },
          silent: true,
          skipToast: true,
        })
        const liveSaldo = saldoRes.data?.data?.saldo
        if (typeof liveSaldo === 'number' && liveSaldo > 0) {
          finalSaldo = liveSaldo
        }
      } catch {
        // Gunakan saldo tersimpan lokal jika ada
      }

      const overrides = getStoredSaldoOverrides()
      if (studentId && overrides[studentId] !== undefined) {
        finalSaldo = overrides[studentId]
      }

      return {
        tipe: 'SISWA',
        id: studentId,
        nis: foundStudent.nis || null,
        nama: foundStudent.nama || 'Siswa',
        kelas: foundStudent.kelas || foundStudent.kelas_terakhir || null,
        fotoUrl: foundStudent.foto_url || foundStudent.fotoUrl || null,
        saldo: finalSaldo,
        status: foundStudent.is_blocked ? 'BLOCKED' : 'ACTIVE',
        uid: foundStudent.uid || foundStudent.rfid_uid || null,
      }
    }

    // Cek juga fallback mock kartu tamu jika langkah 1 terlewati
    const fallbackKt = MOCK_KARTU_TAMU.find(
      (k) =>
        (k.uid || '').toUpperCase() === qUpper ||
        (k.nomor_kartu || '').toUpperCase() === qUpper ||
        (k.label_pemegang || '').toLowerCase().includes(q.toLowerCase())
    )
    if (fallbackKt) {
      return {
        tipe: 'KARTU_TAMU',
        id: fallbackKt.id,
        nama: fallbackKt.label_pemegang || fallbackKt.nomor_kartu,
        nomorKartu: fallbackKt.nomor_kartu,
        labelPemegang: fallbackKt.label_pemegang,
        saldo: fallbackKt.saldo,
        status: fallbackKt.status,
        uid: fallbackKt.uid,
      }
    }

    throw new Error('Kartu atau siswa tidak ditemukan. Periksa kembali nomor UID atau NIS.')
  },
}
