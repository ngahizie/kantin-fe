import apiClient from '@/lib/api-client'
import { notifyKatalogChanged } from '@/lib/katalog-sync'
import type {
  TapTransaksiRequest,
  TapTransaksiData,
  TapBuyerInfo,
  MetodeBayarKasir,
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
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
  }
  throw new Error('Web Crypto API tidak tersedia untuk pembangkitan idempotency key')
}

export const kasirApi = {
  /**
   * Eksekusi transaksi kasir: Saldo (tap kartu RFID, PRD §6.2) atau Tunai tanpa kartu (Issue #165)
   */
  async prosesTap(data: TapTransaksiRequest): Promise<TapTransaksiData> {
    if (data.titikKasirId !== undefined && data.titikKasirId <= 0) {
      throw new Error('Titik kasir belum dipilih atau tidak valid')
    }
    const titikKasirId = data.titikKasirId ?? 1

    const metodeBayar: MetodeBayarKasir = data.metodeBayar ?? 'SALDO'
    const cleanUid = data.rfidUid ? data.rfidUid.trim().toUpperCase() : ''

    const payload: Record<string, unknown> = {
      metodeBayar,
      metode_bayar: metodeBayar,
      items: data.items.map((it) => ({
        menu_id: it.menuId,
        menuId: it.menuId,
        qty: it.qty,
      })),
      idempotency_key: data.idempotencyKey,
      idempotencyKey: data.idempotencyKey,
      titikKasirId,
    }

    if (metodeBayar === 'SALDO' || cleanUid) {
      payload.kartu_uid = cleanUid
      payload.rfidUid = cleanUid
    }

    if (metodeBayar === 'TUNAI') {
      const uangDiterima = Number(data.uangDiterima ?? 0)
      payload.uangDiterima = uangDiterima
      payload.uang_diterima = uangDiterima
      if (data.namaPembeli?.trim()) {
        payload.namaPembeli = data.namaPembeli.trim()
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.post<ApiResponse<any>>(
      '/api/kasir/tap',
      payload
    )
    notifyKatalogChanged('kasir')
    const raw = res.data?.data
    if (!raw) return raw as unknown as TapTransaksiData

    const resMetodeRaw = String(
      raw.metodeBayar ?? raw.metode_bayar ?? metodeBayar
    ).toUpperCase()
    const resMetodeBayar: MetodeBayarKasir =
      resMetodeRaw === 'TUNAI' ? 'TUNAI' : 'SALDO'

    const resTotal = Number(raw.total || 0)
    const rawUangDiterima = raw.uangDiterima ?? raw.uang_diterima
    const resUangDiterima =
      rawUangDiterima !== undefined && rawUangDiterima !== null
        ? Number(rawUangDiterima)
        : null

    // Pakai nilai kembalian langsung dari respons BE (jangan hitung lokal, Issue #170 / C.2e)
    const rawKembalian = raw.kembalian
    const resKembalian =
      rawKembalian !== undefined && rawKembalian !== null
        ? Number(rawKembalian)
        : null

    const rawSaldoSisa =
      raw.pembeli?.sisa_saldo ??
      raw.pembeli?.saldoSisa ??
      raw.saldoSisa ??
      raw.sisa_saldo
    const resSaldoSisa =
      resMetodeBayar === 'TUNAI' ||
      rawSaldoSisa === undefined ||
      rawSaldoSisa === null
        ? null
        : Number(rawSaldoSisa)

    const defaultBuyerName =
      resMetodeBayar === 'TUNAI'
        ? data.namaPembeli?.trim() || 'Tamu (tunai)'
        : 'Pembeli'

    const pembeli: TapBuyerInfo = {
      nama: raw.pembeli?.nama || raw.nama || defaultBuyerName,
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
      sisa_saldo: resSaldoSisa,
      saldoSisa: resSaldoSisa,
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
      total: resTotal,
      metodeBayar: resMetodeBayar,
      uangDiterima: resUangDiterima,
      kembalian: resKembalian,
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
   * Ambil daftar transaksi sesi kasir hari ini (Issue #5, C.2e)
   */
  async getRiwayatTransaksiSesi(sesiId?: number): Promise<TransaksiSesiItem[]> {
    const res = await apiClient.get<ApiResponse<TransaksiSesiItem[]>>(
      '/api/kasir/transaksi/sesi',
      { params: { sesiId } }
    )
    const rows = res.data?.data || []
    return rows.map((row) => {
      const raw = row as TransaksiSesiItem & {
        metode_bayar?: string
        uang_diterima?: number | null
      }
      const metodeRaw = String(
        raw.metodeBayar ?? raw.metode_bayar ?? 'SALDO'
      ).toUpperCase()
      const metodeBayar: MetodeBayarKasir =
        metodeRaw === 'TUNAI' ? 'TUNAI' : 'SALDO'
      const rawUang = raw.uangDiterima ?? raw.uang_diterima
      const uangDiterima =
        rawUang !== undefined && rawUang !== null ? Number(rawUang) : null
      const kembalian =
        raw.kembalian !== undefined && raw.kembalian !== null
          ? Number(raw.kembalian)
          : null
      return {
        ...row,
        metodeBayar,
        uangDiterima,
        kembalian,
      }
    })
  },

  /**
   * Cek saldo dan status kartu siswa berdasarkan UID kartu RFID
   */
  async cekSaldo(rfidUid: string): Promise<InfoSaldoData> {
    const uid = rfidUid.trim().toUpperCase()
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
