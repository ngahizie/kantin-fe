import apiClient from '@/lib/api-client'
import {
  isServiceUnavailableError,
  isTimeoutError,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '@/lib/validation-error'
import {
  type LaporanFilterParams,
  type RingkasanRekonsiliasi,
  type RingkasanPenjualan,
  type BarisPenjualanItem,
  type BarisPenjualanKategori,
  type BarisPenjualanKasir,
  type BarisPenjualanDimensi,
  type EksporLaporanParams,
  type KartuStokLaporan,
  type LaporanPerSiswa,
  type RekapSetoranLaporanItem,
  type RingkasanSaldoMengendap,
  type SiswaSaldoDetail,
  type ProfilSiswaRiwayat,
  type RiwayatBelanjaSiswaItem,
  type RiwayatTransaksiKeseluruhanItem,
  type BarisKerugianStok,
  type KerugianStokHalamanResponse,
  type RingkasanKerugianStok,
  type BarisPembatalanKasir,
  resolveTitikDanPetugas,
} from '../types'
import type { ApiResponse } from '@/lib/api-types'

export const MAX_KERUGIAN_STOK_PAGE_SIZE = 200
// Di atas plafon BE #449 ekspor (5 dtk connection-timeout + 30 dtk statement_timeout)
export const EXPORT_REQUEST_TIMEOUT_MS = 45000
export const EXPORT_TIMEOUT_MESSAGE =
  'Ekspor laporan melebihi batas waktu. Silakan persempit rentang tanggal atau ulangi.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBarisKerugianStok(item: any, idx: number): BarisKerugianStok {
  const qty = Number(item.qty ?? item.totalQty ?? item.total_qty ?? 0)
  const hppSnapshot = Number(item.hppSnapshot ?? item.hpp_snapshot ?? 0)
  return {
    id: Number(item.id ?? idx + 1),
    waktu: String(item.waktu || item.createdAt || new Date().toISOString()),
    menuId: Number(item.menuId ?? item.menu_id ?? 0),
    namaMenu: String(item.namaMenu || item.nama_menu || item.menuNama || 'Menu'),
    kategoriNama: String(item.kategoriNama || item.kategori_nama || 'Umum'),
    jenis: (item.jenis === 'BARANG_RUSAK' ? 'BARANG_RUSAK' : 'OPNAME_KELUAR') as
      | 'OPNAME_KELUAR'
      | 'BARANG_RUSAK',
    qty,
    hppSnapshot,
    totalNilai: Number(item.totalNilai ?? item.total_nilai ?? qty * hppSnapshot),
    alasan: String(item.alasan || '-'),
    beritaAcaraId: String(
      item.beritaAcaraId || item.berita_acara_id || item.referensiId || item.referensi_id || '-'
    ),
    petugas: String(item.petugas || item.aktorNama || item.aktor_nama || 'Petugas'),
  }
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
    const res = await apiClient.get<ApiResponse<RingkasanSaldoMengendap>>(
      '/api/laporan/saldo-mengendap'
    )
    const data = res.data?.data
    if (!data) {
      throw new Error('Data ringkasan saldo mengendap tidak ditemukan')
    }
    return {
      saldoSiswa: data.saldoSiswa ?? data.total ?? 0,
      total: data.saldoSiswa ?? data.total ?? 0,
      jumlahSiswa: data.jumlahSiswa ?? 0,
    }
  },

  /**
   * Mengambil Rincian Saldo per Siswa
   */
  async getSiswaSaldoList(search?: string): Promise<SiswaSaldoDetail[]> {
    const res = await apiClient.get<ApiResponse<SiswaSaldoDetail[]>>(
      '/api/laporan/saldo-mengendap/siswa',
      { params: { search, batas: 50 } }
    )
    if (Array.isArray(res.data?.data)) {
      return res.data.data
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
    const res = await apiClient.get<ApiResponse<RiwayatTransaksiKeseluruhanItem[]>>(
      '/api/laporan/transaksi-keseluruhan',
      { params }
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

    return []
  },

  /**
   * Mengambil Laporan Kerugian Stok berhalaman (SEC-03 #391, max ukuran = 200)
   */
  async getKerugianStokHalaman(
    params?: LaporanFilterParams
  ): Promise<KerugianStokHalamanResponse> {
    const safeHalaman = Math.max(0, Math.floor(params?.halaman ?? 0))
    const safeUkuran = Math.min(
      MAX_KERUGIAN_STOK_PAGE_SIZE,
      Math.max(1, Math.floor(params?.ukuran ?? MAX_KERUGIAN_STOK_PAGE_SIZE))
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await apiClient.get<ApiResponse<any[]>>(
      '/api/laporan/kerugian-stok',
      {
        params: {
          ...params,
          halaman: safeHalaman,
          ukuran: safeUkuran,
        },
      }
    )
    const rawList = Array.isArray(res.data?.data) ? res.data.data : []
    const items = rawList.map(mapBarisKerugianStok)
    const total = typeof res.data?.total === 'number' ? res.data.total : items.length
    const showing = typeof res.data?.showing === 'number' ? res.data.showing : items.length
    const totalPages =
      typeof res.data?.totalPages === 'number'
        ? Math.max(0, res.data.totalPages)
        : items.length > 0
          ? 1
          : 0
    const currentPage =
      typeof res.data?.currentPage === 'number'
        ? Math.max(0, res.data.currentPage)
        : safeHalaman

    return { items, total, showing, totalPages, currentPage }
  },

  /**
   * Mengambil seluruh halaman Laporan Kerugian Stok untuk kebutuhan ekspor / pencarian menyeluruh
   */
  async getSemuaKerugianStok(
    params?: LaporanFilterParams
  ): Promise<BarisKerugianStok[]> {
    const ukuran = Math.min(
      MAX_KERUGIAN_STOK_PAGE_SIZE,
      Math.max(1, Math.floor(params?.ukuran ?? MAX_KERUGIAN_STOK_PAGE_SIZE))
    )
    const first = await this.getKerugianStokHalaman({
      ...params,
      halaman: 0,
      ukuran,
    })
    const allItems = [...first.items]
    const totalPages = Math.min(first.totalPages, 500)
    for (let page = 1; page < totalPages; page++) {
      const next = await this.getKerugianStokHalaman({
        ...params,
        halaman: page,
        ukuran,
      })
      if (next.items.length === 0) break
      allItems.push(...next.items)
    }
    return allItems
  },

  /**
   * Mengambil Laporan Kerugian Stok (Opname Keluar & Barang Rusak)
   */
  async getKerugianStok(
    params?: LaporanFilterParams
  ): Promise<BarisKerugianStok[]> {
    const res = await this.getKerugianStokHalaman(params)
    return res.items
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
    if (res.data?.data) return res.data.data

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
   * Mengambil Daftar Pembatalan Transaksi Kasir (Void / Kartu Dipakai Bukan Pemiliknya)
   * Diperkaya dengan identitas siswa & nama titik kasir bila tersedia.
   */
  async getPembatalan(
    params?: LaporanFilterParams
  ): Promise<BarisPembatalanKasir[]> {
    const res = await apiClient.get<ApiResponse<Record<string, unknown>[]>>(
      '/api/laporan/pembatalan',
      { params }
    )
    const rawList = Array.isArray(res.data?.data) ? res.data.data : []
    if (rawList.length === 0) return []

    // SEC-BATAL-04: Bila backend sudah menyertakan identitas siswa & titik kasir (enrichment),
    // hindari mass-lookup redundan ke /api/siswa (yang membatasi 50 siswa) & /api/pengaturan-kantin/titik-kasir.
    const needsSiswaLookup = rawList.some(
      (r) => !r.siswaNama && !r.siswa_nama && Number(r.siswaId ?? r.siswa_id ?? 0) > 0
    )
    const needsTitikLookup = rawList.some(
      (r) => !r.titikKasirNama && !r.titik_kasir_nama && Number(r.titikKasirId ?? r.titik_kasir_id ?? 0) > 0
    )

    const [siswaRes, titikRes] = await Promise.all([
      needsSiswaLookup
        ? apiClient.get<ApiResponse<Record<string, unknown>[]>>('/api/siswa', { params: { batas: 50 } }).catch(() => null)
        : Promise.resolve(null),
      needsTitikLookup
        ? apiClient.get<ApiResponse<Record<string, unknown>[]>>('/api/pengaturan-kantin/titik-kasir').catch(() => null)
        : Promise.resolve(null),
    ])

    const siswaMap = new Map<number, { nama: string; nis: string; kelas: string }>()
    const rawSiswa = Array.isArray(siswaRes?.data?.data) ? siswaRes.data.data : []
    for (const s of rawSiswa) {
      const id = Number(s.siswaId ?? s.id ?? 0)
      if (id > 0) {
        siswaMap.set(id, {
          nama: String(s.nama || `Siswa #${id}`),
          nis: String(s.nis || '-'),
          kelas: String(s.kelas || '-'),
        })
      }
    }

    const titikMap = new Map<number, string>()
    const rawTitik = Array.isArray(titikRes?.data?.data) ? titikRes.data.data : []
    for (const t of rawTitik) {
      const id = Number(t.id ?? 0)
      if (id > 0) {
        titikMap.set(id, String(t.nama || `Titik Kasir #${id}`))
      }
    }

    return rawList.map((row) => {
      const siswaId = Number(row.siswaId ?? row.siswa_id ?? 0)
      const titikKasirId = Number(row.titikKasirId ?? row.titik_kasir_id ?? 0)
      const siswaInfo = siswaMap.get(siswaId)
      const backendSiswaNama = row.siswaNama || row.siswa_nama
      const backendSiswaNis = row.siswaNis || row.siswa_nis
      const backendSiswaKelas = row.siswaKelas || row.siswa_kelas
      const backendTitikNama = row.titikKasirNama || row.titik_kasir_nama

      return {
        transaksiId: Number(row.transaksiId ?? row.id ?? 0),
        subjekTipe: String(row.subjekTipe || 'SISWA'),
        siswaId,
        siswaNama: String(backendSiswaNama || siswaInfo?.nama || `Siswa #${siswaId}`),
        siswaNis: String(backendSiswaNis || siswaInfo?.nis || '-'),
        siswaKelas: String(backendSiswaKelas || siswaInfo?.kelas || '-'),
        kartuUid: row.kartuUid ? String(row.kartuUid) : null,
        total: toFiniteNumber(row.total, 0),
        alasanVoid:
          String(row.alasanVoid || row.alasan_void || '-')
            .replace(/\s*\(demo void\)/gi, '')
            .trim() || '-',
        voidAt: String(row.voidAt || row.void_at || ''),
        voidOleh: row.voidOleh != null ? Number(row.voidOleh) : undefined,
        petugasId: row.petugasId != null ? Number(row.petugasId) : undefined,
        titikKasirId: titikKasirId > 0 ? titikKasirId : undefined,
        titikKasirNama: String(backendTitikNama || (titikKasirId > 0 ? titikMap.get(titikKasirId) : '') || 'Kasir Kantin'),
        waktu: String(row.waktu || ''),
      }
    })
  },

  /**
   * Penjualan per Titik Kasir (PRD §9.5, BE #116)
   */
  async getPenjualanPerTitik(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanDimensi[]> {
    const res = await apiClient.get<ApiResponse<BarisPenjualanDimensi[]>>(
      '/api/laporan/penjualan/titik',
      { params }
    )
    const rows = res.data?.data
    if (!Array.isArray(rows)) {
      throw new Error('Laporan penjualan per titik kasir tidak mengembalikan data')
    }
    return rows
  },

  /**
   * Penjualan per Petugas Kasir (PRD §9.5, BE #116)
   */
  async getPenjualanPerPetugas(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanDimensi[]> {
    const res = await apiClient.get<ApiResponse<BarisPenjualanDimensi[]>>(
      '/api/laporan/penjualan/petugas',
      { params }
    )
    const rows = res.data?.data
    if (!Array.isArray(rows)) {
      throw new Error('Laporan penjualan per petugas tidak mengembalikan data')
    }
    return rows
  },

  /**
   * Laporan Per Siswa lengkap — ringkasan, daftar transaksi, mutasi saldo (PRD §9.5, BE #117)
   */
  async getPerSiswa(
    siswaId: number,
    params?: LaporanFilterParams
  ): Promise<LaporanPerSiswa> {
    const res = await apiClient.get<ApiResponse<LaporanPerSiswa>>(
      '/api/laporan/per-siswa',
      { params: { ...params, siswaId } }
    )
    const data = res.data?.data
    if (!data) {
      throw new Error('Laporan per siswa tidak tersedia')
    }
    return {
      ...data,
      transaksi: Array.isArray(data.transaksi) ? data.transaksi : [],
      mutasiSaldo: Array.isArray(data.mutasiSaldo) ? data.mutasiSaldo : [],
    }
  },

  /**
   * Laporan Kartu Stok per Item menu beserta saldo berjalan (PRD §9.5, BE #118)
   */
  async getKartuStok(menuId: number, batas?: number): Promise<KartuStokLaporan> {
    const res = await apiClient.get<ApiResponse<KartuStokLaporan>>(
      `/api/laporan/kartu-stok/${menuId}`,
      { params: batas ? { batas } : undefined }
    )
    const data = res.data?.data
    if (!data) {
      throw new Error('Laporan kartu stok tidak ditemukan')
    }
    return {
      ...data,
      mutasi: Array.isArray(data.mutasi) ? data.mutasi : [],
    }
  },

  /**
   * Laporan Setoran Kas TU harian per petugas + selisih (PRD §9.5, BE #143, khusus Bendahara/TU)
   */
  async getSetoranTu(
    params?: LaporanFilterParams
  ): Promise<RekapSetoranLaporanItem[]> {
    const res = await apiClient.get<ApiResponse<RekapSetoranLaporanItem[]>>(
      '/api/laporan/setoran-tu',
      { params }
    )
    return Array.isArray(res.data?.data) ? res.data.data : []
  },

  /**
   * Unduh berkas Excel (.xlsx) resmi dari backend (GET /api/laporan/ekspor).
   * Menegakkan AksesLaporan per peran, sanitasi formula SEC-01, dan mencatat audit EXPORT_LAPORAN.
   */
  async eksporExcel(params: EksporLaporanParams): Promise<string> {
    try {
      const res = await apiClient.get<Blob>('/api/laporan/ekspor', {
        params,
        responseType: 'blob',
        timeout: EXPORT_REQUEST_TIMEOUT_MS,
        skipToast: true,
      })
      const headers = (res.headers || {}) as Record<string, string | undefined>
      const disposition = headers['content-disposition'] || headers['Content-Disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/i)
      const fallbackName = `Laporan_${params.jenis}_${new Date().toISOString().slice(0, 10)}.xlsx`
      const filename = match?.[1]?.trim() || fallbackName

      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
      return filename
    } catch (err: unknown) {
      throw await extractExportError(err)
    }
  },
}

async function extractExportError(err: unknown): Promise<unknown> {
  if (isTimeoutError(err)) {
    return Object.assign(new Error(EXPORT_TIMEOUT_MESSAGE), { cause: err })
  }

  const resp = (err as { response?: { status?: number; data?: unknown } })?.response
  if (resp?.data instanceof Blob) {
    try {
      const text = await resp.data.text()
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed?.message) {
        return Object.assign(new Error(parsed.message), {
          cause: err,
          status: resp.status,
        })
      }
    } catch {
      // Abaikan error parsing JSON; lanjut ke fallback status/error asli
    }
  }

  if (isServiceUnavailableError(err)) {
    return Object.assign(new Error(SERVICE_UNAVAILABLE_MESSAGE), {
      cause: err,
      status: 503,
    })
  }

  return err
}
