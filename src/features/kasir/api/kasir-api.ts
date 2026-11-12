import apiClient from '@/lib/api-client'
import { notifyKatalogChanged } from '@/lib/katalog-sync'
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
    notifyKatalogChanged('kasir')
    const raw = res.data?.data
    if (!raw) return raw as unknown as TapTransaksiData

    const pembeli: TapBuyerInfo = {
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
    }

    // Identitas pembeli murni dari respons BE (issue #294).

    return {
      transaksi_id: Number(raw.transaksi_id || raw.transaksiId || 0),
      transaksiId: Number(raw.transaksiId || raw.transaksi_id || 0),
      nomorStruk:
        raw.nomorStruk ||
        raw.nomor_struk ||
        raw.kodeStruk ||
        raw.kode_struk ||
        raw.nomorReferensi ||
        null,
      titikKasir: raw.titikKasir || raw.titik_kasir || null,
      namaItem: Array.isArray(raw.namaItem)
        ? raw.namaItem.map(String)
        : undefined,
      total: Number(raw.total || 0),
      waktu: raw.waktu || new Date().toISOString(),
      pembeli,
    }
  },

  /**
   * Refund (pembatalan) transaksi kasir dengan alasan dan kode struk wajib (PRD §6.3, BE #292)
   */
  async refundTransaksi(
    transaksiId: number,
    alasan: string,
    kodeStruk: string
  ): Promise<void> {
    await apiClient.post(`/api/kasir/transaksi/${transaksiId}/refund`, {
      alasan: alasan.trim(),
      kodeStruk: kodeStruk.trim(),
    })
    notifyKatalogChanged('kasir')
  },

  /**
   * @deprecated Gunakan refundTransaksi; endpoint /refund mewajibkan alasan dan kodeStruk (BE #292)
   */
  async voidTransaksi(
    transaksiId: number,
    alasan = 'Wajah pembeli tidak cocok dengan foto kartu',
    kodeStruk = ''
  ): Promise<void> {
    await this.refundTransaksi(transaksiId, alasan, kodeStruk)
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
   * Cek saldo dan status kartu siswa berdasarkan UID kartu RFID
   */
  async cekSaldo(rfidUid: string): Promise<InfoSaldoData> {
    const uid = rfidUid.trim()
    if (!uid) {
      throw new Error('Nomor UID kartu RFID wajib diisi.')
    }

    interface CekKartuResponse {
      nomorKartu?: string | null
      subjekTipe?: string | null
      siswaId?: number | null
      nama?: string | null
      kelas?: string | null
      fotoUrl?: string | null
      saldo?: number
      belanjaHariIni?: number
      limitHarian?: number | null
      sisaLimit?: number | null
      diblokir?: boolean
      bisaBelanja?: boolean
      waktuCek?: string | null
    }

    const res = await apiClient
      .get<ApiResponse<CekKartuResponse>>(
        `/api/kasir/kartu/${encodeURIComponent(uid)}`,
        {
          silent: true,
          skipToast: true,
        }
      )
      .catch((err: unknown) => {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string } }
        }
        const backendMsg = axiosErr.response?.data?.message
        if (backendMsg) {
          throw Object.assign(new Error(backendMsg), { cause: err })
        }
        if (axiosErr.response?.status === 404) {
          throw Object.assign(
            new Error('Kartu tidak dikenali. Periksa kembali nomor UID kartu.'),
            { cause: err }
          )
        }
        if (err instanceof Error) {
          throw err
        }
        throw Object.assign(
          new Error('Gagal memeriksa kartu. Periksa kembali nomor UID kartu.'),
          { cause: err }
        )
      })

    const raw = res.data?.data
    if (!raw) {
      throw new Error('Kartu tidak dikenali. Periksa kembali nomor UID kartu.')
    }

    return {
      id: raw.siswaId ?? undefined,
      nis: null,
      nama: raw.nama || 'Siswa',
      kelas: raw.kelas ?? null,
      fotoUrl: raw.fotoUrl ?? null,
      saldo: Number(raw.saldo ?? 0),
      status: raw.diblokir ? 'BLOCKED' : 'ACTIVE',
      uid: raw.nomorKartu || uid.toUpperCase(),
      belanjaHariIni:
        typeof raw.belanjaHariIni === 'number' ? raw.belanjaHariIni : undefined,
      limitHarian: raw.limitHarian ?? null,
      sisaLimit: raw.sisaLimit ?? null,
      bisaBelanja:
        typeof raw.bisaBelanja === 'boolean' ? raw.bisaBelanja : !raw.diblokir,
    }
  },
}
