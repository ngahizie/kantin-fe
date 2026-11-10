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
  type KartuTamuSaldoDetail,
  type ProfilSiswaRiwayat,
  type RiwayatBelanjaSiswaItem,
  type RiwayatTransaksiKeseluruhanItem,
  type BarisKerugianStok,
  type RingkasanKerugianStok,
  resolveTitikDanPetugas,
} from '../types'
import {
  getInitialStudents,
  saveStoredSaldo,
} from '@/features/tu/saldo-storage'
import {
  MOCK_MENU,
  MOCK_KATEGORI,
  MOCK_TITIK_KASIR,
  MOCK_KARTU_TAMU,
  MOCK_KERUGIAN_STOK,
  MOCK_RIWAYAT_SISWA,
} from '@/mocks/mock-data'

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
    try {
      const res = await apiClient.get<ApiResponse<RingkasanRekonsiliasi>>(
        '/api/laporan/rekonsiliasi',
        { params }
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

        const saldoMengendap = raw.saldoMengendap ?? (saldoSiswa ?? 0) + (saldoKartuTamu ?? 0)
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
          saldoSiswa: saldoSiswa ?? 0,
          saldoKartuTamu: saldoKartuTamu ?? 0,
        }
      }
    } catch {
      // Fallback data rekonsiliasi jika backend offline
    }

    return {
      dari: new Date().toISOString().slice(0, 10) + 'T00:00:00+07:00',
      sampai: new Date().toISOString().slice(0, 10) + 'T23:59:59+07:00',
      topupOnline: 0,
      topupTunai: 0,
      penjualan: 0,
      voidPenjualan: 0,
      penjualanBersih: 0,
      koreksiMasuk: 0,
      koreksiKeluar: 0,
      refund: 0,
      transfer: 0,
      saldoMengendap: 0,
      saldoSiswa: 0,
      saldoKartuTamu: 0,
      totalKreditSemua: 0,
      totalDebitSemua: 0,
      selisih: 0,
      seimbang: true,
      totalTopupSemua: 0,
      totalRefundSemua: 0,
      topupBersih: 0,
      totalPenggunaan: 0,
    }
  },

  /**
   * Mengambil Ringkasan Penjualan & Laba Kotor
   */
  async getPenjualan(params?: LaporanFilterParams): Promise<RingkasanPenjualan> {
    try {
      const res = await apiClient.get<ApiResponse<RingkasanPenjualan>>(
        '/api/laporan/penjualan',
        { params }
      )
      if (res.data?.data) return res.data.data
    } catch {
      // Fallback
    }

    const penjualanBruto = 3420000
    const jumlahVoid = 3
    const nilaiVoid = 45000
    const penjualanBersih = 3375000
    const totalHpp = 2180000
    const labaKotor = penjualanBersih - totalHpp
    const marginLabaPersen =
      Math.round((labaKotor / penjualanBersih) * 1000) / 10

    return {
      dari: new Date().toISOString().slice(0, 10) + 'T00:00:00+07:00',
      sampai: new Date().toISOString().slice(0, 10) + 'T23:59:59+07:00',
      jumlahTransaksi: 185,
      penjualanBruto,
      jumlahVoid,
      nilaiVoid,
      penjualanBersih,
      totalHpp,
      labaKotor,
      marginLabaPersen,
    }
  },

  /**
   * Mengambil Penjualan per Item Menu
   */
  async getPenjualanPerItem(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanItem[]> {
    try {
      const res = await apiClient.get<ApiResponse<BarisPenjualanItem[]>>(
        '/api/laporan/penjualan/item',
        { params }
      )
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        return res.data.data
      }
    } catch {
      // Fallback
    }

    return MOCK_MENU.map((m, idx) => {
      const qty = [42, 38, 25, 20, 18, 15, 12, 10, 8, 6][idx % 10] || 5
      const hpp = m.hpp || Math.round(m.harga_jual * 0.7)
      const penjualanBersih = qty * m.harga_jual
      const totalHpp = qty * hpp
      const labaKotor = penjualanBersih - totalHpp
      const margin = Math.round((labaKotor / penjualanBersih) * 100)

      return {
        menuId: m.id,
        nama: m.nama,
        kategoriId: m.kategori_id,
        kategoriNama: m.kategori_nama || 'Umum',
        qty,
        hargaJual: m.harga_jual,
        hpp,
        penjualanBersih,
        totalHpp,
        labaKotor,
        margin,
      }
    })
  },

  /**
   * Mengambil Penjualan per Kategori Menu
   */
  async getPenjualanPerKategori(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanKategori[]> {
    try {
      const res = await apiClient.get<ApiResponse<BarisPenjualanKategori[]>>(
        '/api/laporan/penjualan/kategori',
        { params }
      )
      if (Array.isArray(res.data?.data)) {
        return res.data.data
      }
    } catch {
      if (import.meta.env.VITE_USE_MOCK !== 'true') {
        return []
      }
    }

    if (import.meta.env.VITE_USE_MOCK !== 'true') {
      return []
    }

    return MOCK_KATEGORI.map((k) => {
      const menusInKat = MOCK_MENU.filter((m) => m.kategori_id === k.id)
      const qty = menusInKat.length * 30 || 20
      const totalJual =
        menusInKat.reduce((acc, m) => acc + m.harga_jual * 30, 0) || 350000
      const totalHpp = Math.round(totalJual * 0.68)
      const labaKotor = totalJual - totalHpp
      const margin = Math.round((labaKotor / totalJual) * 100)

      return {
        kategoriId: k.id,
        nama: k.nama,
        jumlahItem: menusInKat.length,
        qty,
        penjualanBersih: totalJual,
        totalHpp,
        labaKotor,
        margin,
      }
    })
  },

  /**
   * Mengambil Penjualan per Titik Kasir & Petugas
   */
  async getPenjualanPerKasir(
    params?: LaporanFilterParams
  ): Promise<BarisPenjualanKasir[]> {
    try {
      const res = await apiClient.get<ApiResponse<BarisPenjualanKasir[]>>(
        '/api/laporan/penjualan/kasir',
        { params, silent: true } as unknown as Record<string, unknown>
      )
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        return res.data.data
      }
    } catch {
      // Fallback
    }

    return MOCK_TITIK_KASIR.map((tk, idx) => {
      const base = idx === 0 ? 2100000 : 1275000
      return {
        titikKasirId: tk.id,
        namaTitikKasir: tk.nama,
        petugas: idx === 0 ? 'Ahmad Kasir' : 'Nurul Hidayah',
        jumlahTransaksi: idx === 0 ? 115 : 70,
        penjualanBruto: base + (idx === 0 ? 30000 : 15000),
        nilaiVoid: idx === 0 ? 30000 : 15000,
        penjualanBersih: base,
      }
    })
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
        return {
          ...data,
          saldoKartuTamu: 0, // Kartu tamu dinonaktifkan sesuai kebutuhan sekolah
          total: data.saldoSiswa ?? data.total ?? 0,
        }
      }
    } catch {
      // fallback
    }

    return {
      saldoSiswa: 0,
      saldoKartuTamu: 0,
      total: 0,
      jumlahSiswa: 0,
      jumlahKartuTamu: 0,
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
    try {
      const res = await apiClient.get<ApiResponse<KartuTamuSaldoDetail[]>>(
        '/api/laporan/saldo-mengendap/kartu-tamu',
        { silent: true } as unknown as Record<string, unknown>
      )
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        return res.data.data
      }
    } catch {
      // Fallback
    }

    return MOCK_KARTU_TAMU.map((k) => ({
      id: k.id,
      nomorKartu: k.nomor_kartu,
      uid: k.uid || `UID-TAMU-${k.id}`,
      labelPemegang: k.label_pemegang,
      saldo: k.saldo,
      status: k.status,
      createdAt: k.created_at || new Date().toISOString(),
    }))
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
      // Fallback data jika backend offline
    }

    const target = getInitialStudents().find((s) => s.siswa_id === siswaId)
    const rawRiwayat = MOCK_RIWAYAT_SISWA[siswaId] || [
      {
        id: `TRX-20261008-${siswaId}`,
        waktu: '2026-10-08T10:15:00Z',
        jenis: 'BELANJA' as const,
        arah: 'DEBIT' as const,
        nominal: 15000,
        saldo_setelah: target?.saldo || 0,
        titik_kasir: 'Kasir 1 - Kantin Utama',
        petugas: 'Ahmad Kasir',
        referensi_id: `TRX-20261008-${siswaId}`,
        keterangan: 'Pembelian makan istirahat',
        items: [{ nama: 'Nasi Goreng Ayam', qty: 1, harga: 15000, subtotal: 15000 }],
      },
    ]

    return {
      profil: {
        siswaId,
        nis: target?.nis || 'NIS-000',
        nama: target?.nama || 'Siswa',
        kelas: target?.kelas || 'Kelas',
        saldo: target?.saldo || 0,
        belanjaHariIni: target?.belanja_hari_ini || 0,
        limitHarian: target?.limit_harian || 0,
        isBlocked: target?.is_blocked || false,
        parentName: target?.parent_name || 'Orang Tua Murid',
        parentPhone: target?.parent_phone || '-',
      },
      riwayat: rawRiwayat.map((r) => ({
        id: r.id,
        waktu: r.waktu,
        jenis: r.jenis,
        arah: r.arah,
        nominal: r.nominal,
        saldoSetelah: r.saldo_setelah,
        titikKasir: r.titik_kasir,
        petugas: r.petugas,
        referensiId: r.referensi_id,
        keterangan: r.keterangan,
        items: r.items,
      })),
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
        const students = getInitialStudents()
        return res.data.data.map((r) => {
          const { titik, petugas } = resolveTitikDanPetugas(r)
          const st = students.find((s) => s.siswa_id === r.siswaId)
          return {
            ...r,
            titikKasir: titik,
            petugas,
            siswaNama:
              r.siswaNama ||
              st?.nama ||
              (r.siswaId ? `Siswa #${r.siswaId}` : 'Pelanggan'),
            siswaNis: r.siswaNis || st?.nis || (r.siswaId ? `${r.siswaId}` : '-'),
            siswaKelas: r.siswaKelas || st?.kelas || '-',
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
      if (rawList.length > 0) {
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
      }
    } catch {
      // Fallback
    }

    return MOCK_KERUGIAN_STOK.map((item) => ({
      id: item.id,
      waktu: item.waktu,
      menuId: item.menu_id,
      namaMenu: item.nama_menu,
      kategoriNama: item.kategori_nama,
      jenis: item.jenis,
      qty: item.qty,
      hppSnapshot: item.hpp_snapshot,
      totalNilai: item.total_nilai,
      alasan: item.alasan,
      beritaAcaraId: item.berita_acara_id,
      petugas: item.petugas,
    }))
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
      // Fallback
    }

    const totalNilai = MOCK_KERUGIAN_STOK.reduce(
      (sum, item) => sum + item.total_nilai,
      0
    )
    const totalQty = MOCK_KERUGIAN_STOK.reduce(
      (sum, item) => sum + item.qty,
      0
    )
    const totalInsiden = MOCK_KERUGIAN_STOK.length
    const nilaiBarangRusak = MOCK_KERUGIAN_STOK.filter(
      (i) => i.jenis === 'BARANG_RUSAK'
    ).reduce((s, i) => s + i.total_nilai, 0)
    const qtyBarangRusak = MOCK_KERUGIAN_STOK.filter(
      (i) => i.jenis === 'BARANG_RUSAK'
    ).reduce((s, i) => s + i.qty, 0)
    const nilaiOpnameKeluar = MOCK_KERUGIAN_STOK.filter(
      (i) => i.jenis === 'OPNAME_KELUAR'
    ).reduce((s, i) => s + i.total_nilai, 0)
    const qtyOpname = MOCK_KERUGIAN_STOK.filter(
      (i) => i.jenis === 'OPNAME_KELUAR'
    ).reduce((s, i) => s + i.qty, 0)

    return {
      totalKerugian: totalNilai,
      totalQtyHilang: totalQty,
      jumlahKejadian: totalInsiden,
      kerugianOpname: nilaiOpnameKeluar,
      qtyOpname,
      kerugianBarangRusak: nilaiBarangRusak,
      qtyBarangRusak,
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
