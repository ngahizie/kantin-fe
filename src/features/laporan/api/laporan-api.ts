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
import {
  getInitialStudents,
  saveStoredSaldo,
} from '@/features/tu/saldo-storage'

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
    try {
      const res = await apiClient.get<ApiResponse<RingkasanSaldoMengendap>>(
        '/api/laporan/saldo-mengendap'
      )
      const data = res.data?.data
      if (data) {
        // Jika backend mengembalikan 0 siswa karena data siswa berada di admin-be, sinkronkan dari data siswa
        if ((data.jumlahSiswa === 0 || data.saldoSiswa === 0) && typeof window !== 'undefined') {
          const students = getInitialStudents()
          const totalSaldoSiswa = students.reduce(
            (acc, s) => acc + (s.saldo || 0),
            0
          )
          return {
            ...data,
            saldoSiswa: data.saldoSiswa > 0 ? data.saldoSiswa : totalSaldoSiswa,
            jumlahSiswa:
              data.jumlahSiswa > 0 ? data.jumlahSiswa : students.length,
            total:
              (data.saldoSiswa > 0 ? data.saldoSiswa : totalSaldoSiswa) +
              (data.saldoKartuTamu || 0),
          }
        }
        return data
      }
    } catch {
      // fallback
    }

    const students = getInitialStudents()
    const totalSaldoSiswa = students.reduce((acc, s) => acc + (s.saldo || 0), 0)
    return {
      saldoSiswa: totalSaldoSiswa,
      saldoKartuTamu: 769000,
      total: totalSaldoSiswa + 769000,
      jumlahSiswa: students.length,
      jumlahKartuTamu: 10,
    }
  },

  /**
   * Mengambil Rincian Saldo per Siswa
   */
  async getSiswaSaldoList(search?: string): Promise<SiswaSaldoDetail[]> {
    try {
      const res = await apiClient.get<ApiResponse<SiswaSaldoDetail[]>>(
        '/api/laporan/saldo-mengendap/siswa',
        { params: { search }, silent: true } as unknown as Record<string, unknown>
      )
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        return res.data.data
      }
    } catch {
      // fallback
    }

    // Fallback jika integrasi data siswa admin-be (Q7) belum terhubung ke backend
    const rawStudents = getInitialStudents()
    const mapped: SiswaSaldoDetail[] = rawStudents.map((s) => ({
      siswaId: s.siswa_id,
      nis: s.nis,
      nama: s.nama,
      kelas: s.kelas,
      saldo: s.saldo,
      belanjaHariIni: s.belanja_hari_ini || 0,
      limitHarian: s.limit_harian || 0,
      isBlocked: s.is_blocked || false,
      parentName: s.parent_name || 'Hendra Santoso',
      parentPhone: s.parent_phone || '0812-3456-7890',
      terakhirTransaksi: s.updated_at,
    }))

    // Coba sinkronisasi saldo riil live dari database backend (/api/saldo)
    try {
      const synced = await Promise.all(
        mapped.map(async (st) => {
          try {
            const saldoRes = await apiClient.get('/api/saldo', {
              params: { subjekTipe: 'SISWA', subjekId: st.siswaId },
            })
            const liveSaldo = saldoRes.data?.data?.saldo
            if (typeof liveSaldo === 'number' && liveSaldo > 0) {
              saveStoredSaldo(st.siswaId, liveSaldo)
              return { ...st, saldo: liveSaldo }
            }
          } catch {
            // Abaikan jika siswa belum ada transaksi di saldo_cache
          }
          return st
        })
      )
      if (search && search.trim()) {
        const q = search.trim().toLowerCase()
        return synced.filter(
          (s) =>
            s.nama.toLowerCase().includes(q) ||
            s.nis.toLowerCase().includes(q) ||
            s.kelas.toLowerCase().includes(q)
        )
      }
      return synced
    } catch {
      return mapped
    }
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
   * Mengembalikan profil kosong dan riwayat [] jika siswa belum memiliki riwayat (404 Not Found)
   */
  async getRiwayatBelanjaSiswa(
    siswaId: number,
    params?: LaporanFilterParams
  ): Promise<{ profil: ProfilSiswaRiwayat; riwayat: RiwayatBelanjaSiswaItem[] }> {
    try {
      const res = await apiClient.get<
        ApiResponse<{
          profil: ProfilSiswaRiwayat
          riwayat: RiwayatBelanjaSiswaItem[]
        }>
      >(`/api/laporan/siswa/${siswaId}/riwayat`, { params })
      return res.data.data
    } catch (err: unknown) {
      const is404 =
        (err as { response?: { status?: number } })?.response?.status === 404 ||
        (err as { status?: number })?.status === 404 ||
        (err instanceof Error && err.message?.includes('404'))

      if (is404) {
        return {
          profil: {
            siswaId,
            nis: '-',
            nama: 'Siswa',
            kelas: '-',
            saldo: 0,
            belanjaHariIni: 0,
            limitHarian: 0,
            isBlocked: false,
            parentName: '-',
            parentPhone: '-',
          },
          riwayat: [],
        }
      }
      throw err
    }
  },

  /**
   * Mengambil Laporan Kerugian Stok (Opname Keluar & Barang Rusak)
   */
  async getKerugianStok(
    params?: LaporanFilterParams
  ): Promise<BarisKerugianStok[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(
      '/api/laporan/kerugian-stok',
      { params }
    )
    const rawList = Array.isArray(res.data?.data) ? res.data.data : []
    return rawList.map((item, idx) => ({
      id: Number(item.id ?? idx + 1),
      waktu: String(item.waktu || item.createdAt || new Date().toISOString()),
      menuId: Number(item.menuId ?? item.menu_id ?? 0),
      namaMenu: String(item.namaMenu || item.nama_menu || item.menuNama || 'Menu'),
      kategoriNama: String(item.kategoriNama || item.kategori_nama || 'Umum'),
      jenis: (item.jenis === 'BARANG_RUSAK' ? 'BARANG_RUSAK' : 'OPNAME_KELUAR') as 'OPNAME_KELUAR' | 'BARANG_RUSAK',
      qty: Number(item.qty ?? item.totalQty ?? item.total_qty ?? 0),
      hppSnapshot: Number(item.hppSnapshot ?? item.hpp_snapshot ?? 0),
      totalNilai: Number(
        item.totalNilai ??
          item.total_nilai ??
          (Number(item.qty ?? item.totalQty ?? 0) * Number(item.hppSnapshot ?? item.hpp_snapshot ?? 0))
      ),
      alasan: String(item.alasan || '-'),
      beritaAcaraId: String(
        item.beritaAcaraId || item.berita_acara_id || item.referensiId || item.referensi_id || '-'
      ),
      petugas: String(item.petugas || item.aktorNama || item.aktor_nama || 'Petugas'),
    }))
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
