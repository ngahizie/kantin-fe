import apiClient from '@/lib/api-client'
import {
  type LaporanFilterParams,
  type RingkasanRekonsiliasi,
  type RingkasanPenjualan,
  type BarisPenjualanItem,
  type BarisPenjualanKategori,
  type BarisPenjualanKasir,
  type RingkasanSaldoMengendap,
  type SiswaSaldoDetail,
  type ProfilSiswaRiwayat,
  type RiwayatBelanjaSiswaItem,
  type RiwayatTransaksiKeseluruhanItem,
  type BarisKerugianStok,
  type RingkasanKerugianStok,
  resolveTitikDanPetugas,
} from '../types'

interface ApiResponse<T> {
  code?: number
  responseCode?: number
  status?: string
  message?: string
  data: T
}

interface RawRingkasanPenjualan {
  dari?: string
  sampai?: string
  jumlahTransaksi?: number
  penjualanBruto?: number
  jumlahRefund?: number
  jumlahVoid?: number
  nilaiRefund?: number
  nilaiVoid?: number
  penjualanBersih?: number
  totalModal?: number
  totalHpp?: number
  laba?: number
  labaKotor?: number
  marginPersen?: number
  marginLabaPersen?: number
}

interface RawBarisPenjualan {
  kunciId?: number
  menuId?: number
  kategoriId?: number
  nama?: string | null
  kategoriNama?: string | null
  jumlahItem?: number | null
  qty?: number
  hargaSatuan?: number | null
  hargaJual?: number | null
  hpp?: number | null
  total?: number
  penjualanBersih?: number
  modal?: number
  totalHpp?: number
  laba?: number
  labaKotor?: number
  marginPersen?: number
  margin?: number
}

interface RawMenuLookup {
  id?: number
  kategoriId?: number | null
}

interface RawKategoriLookup {
  id?: number
  nama?: string
  jumlahItem?: number
}

function toFiniteNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback
  }
  if (val !== undefined && val !== null && val !== '') {
    const num = Number(val)
    return Number.isFinite(num) ? num : fallback
  }
  return fallback
}

function normalizeRingkasanPenjualan(
  raw: RawRingkasanPenjualan
): RingkasanPenjualan {
  const jumlahTransaksi = toFiniteNumber(raw.jumlahTransaksi, 0)
  const penjualanBruto = toFiniteNumber(raw.penjualanBruto, 0)
  const jumlahRefund = toFiniteNumber(raw.jumlahRefund ?? raw.jumlahVoid, 0)
  const nilaiRefund = toFiniteNumber(raw.nilaiRefund ?? raw.nilaiVoid, 0)
  const penjualanBersih = toFiniteNumber(raw.penjualanBersih, penjualanBruto)
  const totalModal = toFiniteNumber(raw.totalModal ?? raw.totalHpp, 0)
  const laba = toFiniteNumber(
    raw.laba ?? raw.labaKotor,
    penjualanBersih - totalModal
  )
  const computedMargin =
    penjualanBersih > 0
      ? Math.round((laba * 10000) / penjualanBersih) / 100
      : 0
  const marginPersen = toFiniteNumber(
    raw.marginPersen ?? raw.marginLabaPersen,
    computedMargin
  )

  return {
    dari: String(
      raw.dari || new Date().toISOString().slice(0, 10) + 'T00:00:00+07:00'
    ),
    sampai: String(
      raw.sampai || new Date().toISOString().slice(0, 10) + 'T23:59:59+07:00'
    ),
    jumlahTransaksi,
    penjualanBruto,
    jumlahRefund,
    nilaiRefund,
    penjualanBersih,
    totalModal,
    laba,
    marginPersen,
  }
}

async function fetchKatalogLookup(): Promise<{
  menuKategoriMap: Map<number, { kategoriId: number; kategoriNama: string }>
  kategoriJumlahMap: Map<number, number>
}> {
  const menuKategoriMap = new Map<
    number,
    { kategoriId: number; kategoriNama: string }
  >()
  const kategoriJumlahMap = new Map<number, number>()
  const silentConfig = { silent: true, skipToast: true } as Record<
    string,
    unknown
  >

  const [menuRes, kategoriRes] = await Promise.allSettled([
    apiClient.get<ApiResponse<RawMenuLookup[]>>(
      '/api/katalog/menu',
      silentConfig
    ),
    apiClient.get<ApiResponse<RawKategoriLookup[]>>(
      '/api/katalog/kategori',
      silentConfig
    ),
  ])

  const katNameMap = new Map<number, string>()
  if (
    kategoriRes.status === 'fulfilled' &&
    Array.isArray(kategoriRes.value.data?.data)
  ) {
    for (const kat of kategoriRes.value.data.data) {
      if (typeof kat.id === 'number') {
        katNameMap.set(kat.id, kat.nama || 'Umum')
        if (typeof kat.jumlahItem === 'number') {
          kategoriJumlahMap.set(kat.id, kat.jumlahItem)
        }
      }
    }
  }

  if (
    menuRes.status === 'fulfilled' &&
    Array.isArray(menuRes.value.data?.data)
  ) {
    const countPerKat = new Map<number, number>()
    for (const m of menuRes.value.data.data) {
      if (typeof m.id === 'number' && typeof m.kategoriId === 'number') {
        menuKategoriMap.set(m.id, {
          kategoriId: m.kategoriId,
          kategoriNama: katNameMap.get(m.kategoriId) || 'Umum',
        })
        countPerKat.set(m.kategoriId, (countPerKat.get(m.kategoriId) ?? 0) + 1)
      }
    }
    for (const [katId, count] of countPerKat.entries()) {
      if (!kategoriJumlahMap.has(katId)) {
        kategoriJumlahMap.set(katId, count)
      }
    }
  }

  return { menuKategoriMap, kategoriJumlahMap }
}

function normalizeBarisPenjualanItem(
  raw: RawBarisPenjualan,
  menuKategoriMap?: Map<number, { kategoriId: number; kategoriNama: string }>
): BarisPenjualanItem {
  const kunciId = toFiniteNumber(raw.kunciId ?? raw.menuId, 0)
  const qty = toFiniteNumber(raw.qty, 0)
  const total = toFiniteNumber(raw.total ?? raw.penjualanBersih, 0)
  const hargaSatuan = toFiniteNumber(
    raw.hargaSatuan ?? raw.hargaJual,
    qty > 0 ? Math.round(total / qty) : 0
  )
  const modal = toFiniteNumber(raw.modal ?? raw.totalHpp, 0)
  const hpp = toFiniteNumber(raw.hpp, qty > 0 ? Math.round(modal / qty) : 0)
  const laba = toFiniteNumber(raw.laba ?? raw.labaKotor, total - modal)
  const computedMargin =
    total > 0 ? Math.round((laba * 10000) / total) / 100 : 0
  const marginPersen = toFiniteNumber(
    raw.marginPersen ?? raw.margin,
    computedMargin
  )
  const katInfo = menuKategoriMap?.get(kunciId)
  const kategoriId = toFiniteNumber(raw.kategoriId, katInfo?.kategoriId ?? 0)
  const kategoriNama = String(
    raw.kategoriNama || katInfo?.kategoriNama || 'Umum'
  )

  return {
    kunciId,
    menuId: kunciId,
    nama: String(raw.nama || `Menu #${kunciId}`),
    kategoriId,
    kategoriNama,
    qty,
    hargaSatuan,
    hargaJual: hargaSatuan,
    hpp,
    total,
    penjualanBersih: total,
    modal,
    totalHpp: modal,
    laba,
    labaKotor: laba,
    marginPersen,
    margin: marginPersen,
  }
}

function normalizeBarisPenjualanKategori(
  raw: RawBarisPenjualan,
  kategoriJumlahMap?: Map<number, number>
): BarisPenjualanKategori {
  const kunciId = toFiniteNumber(raw.kunciId ?? raw.kategoriId, 0)
  const qty = toFiniteNumber(raw.qty, 0)
  const total = toFiniteNumber(raw.total ?? raw.penjualanBersih, 0)
  const modal = toFiniteNumber(raw.modal ?? raw.totalHpp, 0)
  const laba = toFiniteNumber(raw.laba ?? raw.labaKotor, total - modal)
  const computedMargin =
    total > 0 ? Math.round((laba * 10000) / total) / 100 : 0
  const marginPersen = toFiniteNumber(
    raw.marginPersen ?? raw.margin,
    computedMargin
  )
  const jumlahItem =
    raw.jumlahItem !== undefined && raw.jumlahItem !== null
      ? toFiniteNumber(raw.jumlahItem, 0)
      : kategoriJumlahMap?.get(kunciId) ?? null

  return {
    kunciId,
    kategoriId: kunciId,
    nama: String(raw.nama || `Kategori #${kunciId}`),
    jumlahItem,
    qty,
    hargaSatuan:
      raw.hargaSatuan !== undefined && raw.hargaSatuan !== null
        ? toFiniteNumber(raw.hargaSatuan, 0)
        : null,
    total,
    penjualanBersih: total,
    modal,
    totalHpp: modal,
    laba,
    labaKotor: laba,
    marginPersen,
    margin: marginPersen,
  }
}

export const laporanApi = {
  /**
   * Mengambil data Rekonsiliasi Harian & Invariant Saldo (PRD §9.5, §5)
   */
  async getRekonsiliasi(
    params?: LaporanFilterParams,
    options?: { silent?: boolean }
  ): Promise<RingkasanRekonsiliasi> {
    try {
      const requestConfig = options?.silent
        ? ({ params, silent: true } as unknown as Record<string, unknown>)
        : { params }
      const res = await apiClient.get<ApiResponse<RingkasanRekonsiliasi>>(
        '/api/laporan/rekonsiliasi',
        requestConfig
      )
      const raw = res.data?.data

      if (raw) {
        // Kalkulasi metrik turunan jika response berasal langsung dari BE (RingkasanRekonsiliasi.java)
        const totalTopupSemua =
          raw.totalTopupSemua ?? (raw.topupOnline ?? 0) + (raw.topupTunai ?? 0)
        const totalRefundSemua = raw.totalRefundSemua ?? (raw.refund ?? 0)
        const topupBersih =
          raw.topupBersih ?? totalTopupSemua - totalRefundSemua
        const penjualanBersih =
          raw.penjualanBersih ?? (raw.penjualan ?? 0) - (raw.voidPenjualan ?? 0)
        // Sinkronisasi saldo mengendap siswa jika belum disediakan pada payload rekonsiliasi
        let saldoSiswa = raw.saldoSiswa

        if (saldoSiswa === undefined) {
          try {
            const saldoRes = await apiClient.get<ApiResponse<RingkasanSaldoMengendap>>(
              '/api/laporan/saldo-mengendap',
              options?.silent
                ? ({ silent: true } as unknown as Record<string, unknown>)
                : undefined
            )
            if (saldoRes.data?.data) {
              saldoSiswa = saldoRes.data.data.saldoSiswa ?? raw.saldoMengendap ?? 0
            }
          } catch {
            saldoSiswa = raw.saldoMengendap ?? 0
          }
        }

        const saldoMengendap = raw.saldoMengendap ?? saldoSiswa ?? 0
        const totalPenggunaan =
          raw.totalPenggunaan ?? saldoMengendap + penjualanBersih

        return {
          ...raw,
          totalTopupSemua,
          totalRefundSemua,
          topupBersih,
          penjualanBersih,
          totalPenggunaan,
          saldoMengendap,
          saldoSiswa: saldoSiswa ?? saldoMengendap,
        }
      }
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error('Data rekonsiliasi tidak tersedia dari server')
    }

    throw new Error('Data rekonsiliasi tidak tersedia dari server')
  },

  /**
   * Mengambil Ringkasan Penjualan & Laba Kotor
   */
  async getPenjualan(params?: LaporanFilterParams): Promise<RingkasanPenjualan> {
    const res = await apiClient.get<ApiResponse<RawRingkasanPenjualan>>(
      '/api/laporan/penjualan',
      { params }
    )
    const data = res.data?.data
    if (!data) {
      throw new Error('Laporan penjualan tidak mengembalikan data')
    }
    return normalizeRingkasanPenjualan(data)
  },

  /**
   * Mengambil Penjualan per Item Menu
   */
  async getPenjualanPerItem(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanItem[]> {
    const res = await apiClient.get<ApiResponse<RawBarisPenjualan[]>>(
      '/api/laporan/penjualan/item',
      { params }
    )
    const rawList = res.data?.data
    if (!Array.isArray(rawList)) {
      throw new Error('Laporan penjualan per item tidak mengembalikan data')
    }
    if (rawList.length === 0) return []
    const needsCategoryEnrich = rawList.some(
      (item) => item.kategoriNama === undefined || item.kategoriId === undefined
    )
    const menuKategoriMap = needsCategoryEnrich
      ? (await fetchKatalogLookup()).menuKategoriMap
      : undefined
    return rawList.map((row) =>
      normalizeBarisPenjualanItem(row, menuKategoriMap)
    )
  },

  /**
   * Mengambil Penjualan per Kategori Menu
   */
  async getPenjualanPerKategori(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanKategori[]> {
    const res = await apiClient.get<ApiResponse<RawBarisPenjualan[]>>(
      '/api/laporan/penjualan/kategori',
      { params }
    )
    const rawList = res.data?.data
    if (!Array.isArray(rawList)) {
      throw new Error('Laporan penjualan per kategori tidak mengembalikan data')
    }
    if (rawList.length === 0) return []
    const needsCountEnrich = rawList.some(
      (item) => item.jumlahItem === undefined || item.jumlahItem === null
    )
    const kategoriJumlahMap = needsCountEnrich
      ? (await fetchKatalogLookup()).kategoriJumlahMap
      : undefined
    return rawList.map((row) =>
      normalizeBarisPenjualanKategori(row, kategoriJumlahMap)
    )
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
    const rows = res.data?.data
    if (!Array.isArray(rows)) {
      throw new Error('Laporan penjualan per kasir tidak mengembalikan data')
    }
    return rows
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
        return {
          saldoSiswa: data.saldoSiswa ?? data.total ?? 0,
          total: data.saldoSiswa ?? data.total ?? 0,
          jumlahSiswa: data.jumlahSiswa ?? 0,
        }
      }
    } catch {
      // Gunakan nilai nol jika gagal memuat ringkasan
    }

    return {
      saldoSiswa: 0,
      total: 0,
      jumlahSiswa: 0,
    }
  },

  /**
   * Mengambil Rincian Saldo per Siswa
   */
  async getSiswaSaldoList(search?: string): Promise<SiswaSaldoDetail[]> {
    try {
      const res = await apiClient.get<ApiResponse<SiswaSaldoDetail[]>>(
        '/api/laporan/saldo-mengendap/siswa',
        { params: { search, batas: 50 }, silent: true } as unknown as Record<string, unknown>
      )
      if (Array.isArray(res.data?.data)) {
        return res.data.data
      }
    } catch {
      // Tidak menggunakan data tiruan saat endpoint gagal
    }

    return []
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
      if (res.data?.data) {
        const raw = res.data.data
        return {
          ...raw,
          riwayat: (raw.riwayat || []).map((r) => {
            const { titik, petugas } = resolveTitikDanPetugas(r)
            return {
              ...r,
              titikKasir: titik,
              petugas,
            }
          }),
        }
      }
    } catch (err: unknown) {
      const is404 =
        (err as { response?: { status?: number } })?.response?.status === 404 ||
        (err as { status?: number })?.status === 404 ||
        (err instanceof Error && err.message?.includes('404'))

      if (!is404) {
        throw err
      }
    }

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
  },

  /**
   * Mengambil Riwayat Transaksi Belanja Keseluruhan Seluruh Siswa (Data Riil Backend)
   */
  async getRiwayatTransaksiKeseluruhan(
    params?: LaporanFilterParams
  ): Promise<RiwayatTransaksiKeseluruhanItem[]> {
    try {
      const res = await apiClient.get<ApiResponse<RiwayatTransaksiKeseluruhanItem[]>>(
        '/api/laporan/transaksi-keseluruhan',
        { params, silent: true } as unknown as Record<string, unknown>
      )
      if (Array.isArray(res.data?.data)) {
        return res.data.data.map((r) => {
          const { titik, petugas } = resolveTitikDanPetugas(r)
          return {
            ...r,
            titikKasir: titik,
            petugas,
            siswaNama:
              r.siswaNama ||
              (r.siswaId ? `Siswa #${r.siswaId}` : 'Pelanggan Tunai'),
            siswaNis: r.siswaNis || (r.siswaId ? `${r.siswaId}` : '-'),
            siswaKelas: r.siswaKelas || '-',
          }
        })
      }
    } catch {
      // Tidak menggunakan data tiruan (mock data) bila terjadi galat atau kosong
    }

    return []
  },

  /**
   * Mengambil Laporan Kerugian Stok (Opname Keluar & Barang Rusak)
   */
  async getKerugianStok(
    params?: LaporanFilterParams
  ): Promise<BarisKerugianStok[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch {
      return []
    }
  },

  /**
   * Mengambil Ringkasan Kerugian Stok
   */
  async getRingkasanKerugianStok(
    params?: LaporanFilterParams
  ): Promise<RingkasanKerugianStok> {
    try {
      const res = await apiClient.get<ApiResponse<RingkasanKerugianStok>>(
        '/api/laporan/kerugian-stok/ringkasan',
        { params }
      )
      if (res.data?.data) return res.data.data
    } catch {
      // Kembalikan ringkasan nol saat data gagal dimuat
    }

    return {
      totalKerugian: 0,
      totalQtyHilang: 0,
      jumlahKejadian: 0,
      kerugianOpname: 0,
      qtyOpname: 0,
      kerugianBarangRusak: 0,
      qtyBarangRusak: 0,
    }
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
