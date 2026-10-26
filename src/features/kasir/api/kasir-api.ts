import apiClient from '@/lib/api-client'
import type {
  TapTransaksiRequest,
  TapTransaksiData,
  TapBuyerInfo,
  SesiKasirData,
  RekapSesiData,
  TransaksiSesiItem,
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
      pembeli,
    }
  },

  /**
   * Batalkan (void) transaksi kasir dengan alasan wajib (PRD §6.3, Issue #5)
   */
  async voidTransaksi(
    transaksiId: number,
    alasan = 'Wajah pembeli tidak cocok dengan foto kartu'
  ): Promise<void> {
    await apiClient.post(`/api/kasir/transaksi/${transaksiId}/void`, {
      alasan,
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
  async tutupSesi(sesiId: number): Promise<SesiKasirData> {
    const res = await apiClient.post<ApiResponse<SesiKasirData>>(
      `/api/kasir/sesi/${sesiId}/tutup`
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
}
