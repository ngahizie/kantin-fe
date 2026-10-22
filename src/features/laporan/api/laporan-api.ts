import apiClient from '@/lib/api-client'
import type {
  LaporanFilterParams,
  RingkasanRekonsiliasi,
  RingkasanPenjualan,
  BarisPenjualanItem,
  BarisPenjualanKategori,
  BarisPenjualanKasir,
  RingkasanSaldoMengendap,
  SiswaSaldoDetail,
  KartuTamuSaldoDetail,
  ProfilSiswaRiwayat,
  RiwayatBelanjaSiswaItem,
  BarisKerugianStok,
  RingkasanKerugianStok,
} from '../types'

interface ApiResponse<T> {
  code?: number
  responseCode?: number
  status?: string
  message?: string
  data: T
}

export const laporanApi = {
  /**
   * Mengambil data Rekonsiliasi Harian & Invariant Saldo (PRD §9.5, §5)
   */
  async getRekonsiliasi(
    params?: LaporanFilterParams
  ): Promise<RingkasanRekonsiliasi> {
    const res = await apiClient.get<ApiResponse<RingkasanRekonsiliasi>>(
      '/api/laporan/rekonsiliasi',
      { params }
    )
    const raw = res.data.data

    // Kalkulasi metrik turunan jika response berasal langsung dari BE (RingkasanRekonsiliasi.java)
    const totalTopupSemua =
      raw.totalTopupSemua ?? (raw.topupOnline ?? 0) + (raw.topupTunai ?? 0)
    const totalRefundSemua = raw.totalRefundSemua ?? (raw.refund ?? 0)
    const topupBersih =
      raw.topupBersih ?? totalTopupSemua - totalRefundSemua
    const penjualanBersih =
      raw.penjualanBersih ?? (raw.penjualan ?? 0) - (raw.voidPenjualan ?? 0)
    const totalPenggunaan =
      raw.totalPenggunaan ?? (raw.saldoMengendap ?? 0) + penjualanBersih

    // Breakdown saldo siswa & kartu tamu jika BE hanya mengembalikan saldoMengendap total
    let saldoSiswa = raw.saldoSiswa
    let saldoKartuTamu = raw.saldoKartuTamu

    if (saldoSiswa === undefined || saldoKartuTamu === undefined) {
      try {
        const saldoRes = await apiClient.get<ApiResponse<RingkasanSaldoMengendap>>(
          '/api/laporan/saldo-mengendap'
        )
        if (saldoRes.data?.data) {
          saldoSiswa = saldoRes.data.data.saldoSiswa ?? 0
          saldoKartuTamu = saldoRes.data.data.saldoKartuTamu ?? 0
        }
      } catch {
        saldoSiswa = raw.saldoMengendap ?? 0
        saldoKartuTamu = 0
      }
    }

    return {
      ...raw,
      totalTopupSemua,
      totalRefundSemua,
      topupBersih,
      penjualanBersih,
      totalPenggunaan,
      saldoSiswa: saldoSiswa ?? 0,
      saldoKartuTamu: saldoKartuTamu ?? 0,
    }
  },

  /**
   * Mengambil Ringkasan Penjualan & Laba Kotor
   */
  async getPenjualan(params?: LaporanFilterParams): Promise<RingkasanPenjualan> {
    const res = await apiClient.get<ApiResponse<RingkasanPenjualan>>(
      '/api/laporan/penjualan',
      { params }
    )
    return res.data.data
  },

  /**
   * Mengambil Penjualan per Item Menu
   */
  async getPenjualanPerItem(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanItem[]> {
    const res = await apiClient.get<ApiResponse<BarisPenjualanItem[]>>(
      '/api/laporan/penjualan/item',
      { params }
    )
    return res.data.data
  },

  /**
   * Mengambil Penjualan per Kategori Menu
   */
  async getPenjualanPerKategori(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanKategori[]> {
    const res = await apiClient.get<ApiResponse<BarisPenjualanKategori[]>>(
      '/api/laporan/penjualan/kategori',
      { params }
    )
    return res.data.data
  },

  /**
   * Mengambil Penjualan per Titik Kasir & Petugas
   */
  async getPenjualanPerKasir(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanKasir[]> {
    const res = await apiClient.get<ApiResponse<BarisPenjualanKasir[]>>(
      '/api/laporan/penjualan/kasir',
      { params, silent: true } as unknown as Record<string, unknown>
    )
    return res.data.data
  },

  /**
   * Mengambil Ringkasan Saldo Mengendap (Dana Titipan Sekolah)
   */
  async getSaldoMengendap(): Promise<RingkasanSaldoMengendap> {
    const res = await apiClient.get<ApiResponse<RingkasanSaldoMengendap>>(
      '/api/laporan/saldo-mengendap'
    )
    return res.data.data
  },

  /**
   * Mengambil Rincian Saldo per Siswa
   */
  async getSiswaSaldoList(search?: string): Promise<SiswaSaldoDetail[]> {
    const res = await apiClient.get<ApiResponse<SiswaSaldoDetail[]>>(
      '/api/laporan/saldo-mengendap/siswa',
      { params: { search }, silent: true } as unknown as Record<string, unknown>
    )
    return res.data.data
  },

  /**
   * Mengambil Rincian Saldo per Kartu Tamu
   */
  async getKartuTamuSaldoList(): Promise<KartuTamuSaldoDetail[]> {
    const res = await apiClient.get<ApiResponse<KartuTamuSaldoDetail[]>>(
      '/api/laporan/saldo-mengendap/kartu-tamu',
      { silent: true } as unknown as Record<string, unknown>
    )
    return res.data.data
  },

  /**
   * Mengambil Riwayat Transaksi & Belanja Lengkap per Siswa (Komplain Ortu)
   */
  async getRiwayatBelanjaSiswa(
    siswaId: number,
    params?: LaporanFilterParams
  ): Promise<{ profil: ProfilSiswaRiwayat; riwayat: RiwayatBelanjaSiswaItem[] }> {
    const res = await apiClient.get<
      ApiResponse<{
        profil: ProfilSiswaRiwayat
        riwayat: RiwayatBelanjaSiswaItem[]
      }>
    >(`/api/laporan/siswa/${siswaId}/riwayat`, { params })
    return res.data.data
  },

  /**
   * Mengambil Laporan Kerugian Stok (Opname Keluar & Barang Rusak)
   */
  async getKerugianStok(
    params?: LaporanFilterParams
  ): Promise<BarisKerugianStok[]> {
    const res = await apiClient.get<ApiResponse<BarisKerugianStok[]>>(
      '/api/laporan/kerugian-stok',
      { params }
    )
    return res.data.data
  },

  /**
   * Mengambil Ringkasan Kerugian Stok
   */
  async getRingkasanKerugianStok(
    params?: LaporanFilterParams
  ): Promise<RingkasanKerugianStok> {
    const res = await apiClient.get<ApiResponse<RingkasanKerugianStok>>(
      '/api/laporan/kerugian-stok/ringkasan',
      { params }
    )
    return res.data.data
  },

  /**
   * Unduh berkas Excel langsung dari backend jika live API tersedia
   */
  async downloadEksporBackend(
    jenis: string,
    params?: LaporanFilterParams
  ): Promise<Blob> {
    const res = await apiClient.get('/api/laporan/ekspor', {
      params: { jenis, ...params },
      responseType: 'blob',
    })
    return res.data
  },
}
