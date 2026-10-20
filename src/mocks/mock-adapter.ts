/**
 * Mock API Adapter untuk Axios pada kantin-fe
 * Mengintersep request saat VITE_USE_MOCK=true sehingga tim frontend bisa mengembangkan UI
 * tanpa perlu menunggu backend berjalan.
 */
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import {
  MOCK_MENU,
  MOCK_KATEGORI,
  MOCK_SISWA,
  MOCK_KARTU_TAMU,
  MOCK_SISWA_NONAKTIF,
  MOCK_SETORAN_KAS,
  MOCK_KOREKSI_BENDAHARA,
  MOCK_TRANSAKSI_SESI_TUTUP,
  MOCK_PENGATURAN_KANTIN,
  MOCK_TITIK_KASIR,
  MOCK_KERUGIAN_STOK,
  MOCK_RIWAYAT_SISWA,
  type MenuItemMock,
  type KartuSiswaMock,
  type KartuTamuMock,
  type SiswaNonaktifMock,
  type SetoranKasTUMock,
  type MutasiKoreksiMock,
  type TransaksiSesiTutupMock,
  type PengaturanKantinMock,
  type TitikKasirMock,
} from './mock-data'

export interface MockResponseData {
  code?: number
  responseCode?: number
  status?: string
  message?: string
  data?: unknown
  kekurangan?: number
}

interface TransaksiCartItem {
  menu_id: number
  qty: number
}

interface TransaksiPayload {
  kartu_uid?: string
  items?: TransaksiCartItem[]
}

export function setupMockAdapter(axiosInstance: AxiosInstance) {
  // Simulasi state mutable di memori untuk pengujian
  const menuList: MenuItemMock[] = [...MOCK_MENU]
  const kategoriList = [...MOCK_KATEGORI]
  const siswaList: KartuSiswaMock[] = [...MOCK_SISWA]
  const kartuTamuList: KartuTamuMock[] = [...MOCK_KARTU_TAMU]
  const siswaNonaktifList: SiswaNonaktifMock[] = [...MOCK_SISWA_NONAKTIF]
  const setoranKasList: SetoranKasTUMock[] = JSON.parse(
    JSON.stringify(MOCK_SETORAN_KAS)
  )
  const koreksiList: MutasiKoreksiMock[] = JSON.parse(
    JSON.stringify(MOCK_KOREKSI_BENDAHARA)
  )
  const transaksiSesiTutupList: TransaksiSesiTutupMock[] = JSON.parse(
    JSON.stringify(MOCK_TRANSAKSI_SESI_TUTUP)
  )
  let pengaturanKantin: PengaturanKantinMock = { ...MOCK_PENGATURAN_KANTIN }
  const titikKasirList: TitikKasirMock[] = JSON.parse(
    JSON.stringify(MOCK_TITIK_KASIR)
  )

  const idempotencyStore = new Map<
    string,
    { status: number; data: MockResponseData }
  >()
  const recordedTransactions = new Map<
    number,
    {
      total: number
      siswaUid?: string
      kartuTamuUid?: string
      items: { menuId: number; qty: number }[]
    }
  >()

  interface MockSesiTrxItem {
    id: number
    transaksiId?: number
    nomorReferensi: string
    waktu: string
    pembeliTipe: 'SISWA' | 'KARTU_TAMU'
    pembeliNama: string
    pembeliKelas?: string | null
    pembeliNis?: string | null
    pembeliFotoUrl?: string | null
    kartuUid?: string
    items: {
      menuId: number
      namaMenu: string
      qty: number
      hargaSatuan: number
      subtotal: number
    }[]
    total: number
    status: 'SUKSES' | 'VOID'
    voidAlasan?: string | null
    voidAt?: string | null
    voidOleh?: string | null
  }

  const mockSesiTransactions: MockSesiTrxItem[] = [
    {
      id: 1001,
      transaksiId: 1001,
      nomorReferensi: 'TRX-20261008-0001',
      waktu: new Date(Date.now() - 150 * 60000).toISOString(),
      pembeliTipe: 'SISWA',
      pembeliNama: 'Bima Aditya Pratama',
      pembeliKelas: 'XII RPL 1',
      pembeliNis: '20241001',
      pembeliFotoUrl:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
      kartuUid: 'CARD-SISWA-01',
      items: [
        {
          menuId: 1,
          namaMenu: 'Nasi Kuning Komplit',
          qty: 1,
          hargaSatuan: 15000,
          subtotal: 15000,
        },
        {
          menuId: 2,
          namaMenu: 'Es Teh Manis',
          qty: 1,
          hargaSatuan: 4000,
          subtotal: 4000,
        },
      ],
      total: 19000,
      status: 'SUKSES',
    },
    {
      id: 1002,
      transaksiId: 1002,
      nomorReferensi: 'TRX-20261008-0002',
      waktu: new Date(Date.now() - 120 * 60000).toISOString(),
      pembeliTipe: 'SISWA',
      pembeliNama: 'Siti Nurhaliza',
      pembeliKelas: 'XI MIPA 2',
      pembeliNis: '20241002',
      pembeliFotoUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      kartuUid: 'CARD-SISWA-02',
      items: [
        {
          menuId: 3,
          namaMenu: 'Roti Bakar Coklat',
          qty: 1,
          hargaSatuan: 10000,
          subtotal: 10000,
        },
      ],
      total: 10000,
      status: 'SUKSES',
    },
    {
      id: 1003,
      transaksiId: 1003,
      nomorReferensi: 'TRX-20261008-0003',
      waktu: new Date(Date.now() - 90 * 60000).toISOString(),
      pembeliTipe: 'KARTU_TAMU',
      pembeliNama: 'Tamu Dinas Pendidikan',
      kartuUid: 'CARD-TAMU-01',
      items: [
        {
          menuId: 1,
          namaMenu: 'Nasi Kuning Komplit',
          qty: 2,
          hargaSatuan: 15000,
          subtotal: 30000,
        },
        {
          menuId: 4,
          namaMenu: 'Air Mineral 600ml',
          qty: 2,
          hargaSatuan: 4000,
          subtotal: 8000,
        },
      ],
      total: 38000,
      status: 'SUKSES',
    },
    {
      id: 1004,
      transaksiId: 1004,
      nomorReferensi: 'TRX-20261008-0004',
      waktu: new Date(Date.now() - 60 * 60000).toISOString(),
      pembeliTipe: 'SISWA',
      pembeliNama: 'Dewi Lestari',
      pembeliKelas: 'X IPS 1',
      pembeliNis: '20241004',
      pembeliFotoUrl:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      kartuUid: 'CARD-SISWA-04',
      items: [
        {
          menuId: 2,
          namaMenu: 'Es Teh Manis',
          qty: 1,
          hargaSatuan: 4000,
          subtotal: 4000,
        },
      ],
      total: 4000,
      status: 'VOID',
      voidAlasan: 'Salah input menu',
      voidAt: new Date(Date.now() - 55 * 60000).toISOString(),
      voidOleh: 'Kasir Kantin 1',
    },
    {
      id: 1005,
      transaksiId: 1005,
      nomorReferensi: 'TRX-20261008-0005',
      waktu: new Date(Date.now() - 30 * 60000).toISOString(),
      pembeliTipe: 'SISWA',
      pembeliNama: 'Ahmad Fauzi',
      pembeliKelas: 'XII TKJ 2',
      pembeliNis: '20241005',
      pembeliFotoUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      kartuUid: 'CARD-SISWA-05',
      items: [
        {
          menuId: 1,
          namaMenu: 'Nasi Kuning Komplit',
          qty: 1,
          hargaSatuan: 15000,
          subtotal: 15000,
        },
      ],
      total: 15000,
      status: 'SUKSES',
    },
  ]

  const currentSesiMock = {
    id: 101,
    sekolahId: 1,
    titikKasirId: 1,
    titikKasirNama: 'Kasir 1 - Kantin Utama',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'TERBUKA' as 'TERBUKA' | 'DITUTUP',
    dibukaAt: new Date(Date.now() - 180 * 60000).toISOString(),
    ditutupAt: null as string | null,
    ditutupOleh: null as number | null,
    autoTutup: false,
  }

  const getLiveRekap = () => {
    let jumlahSukses = 0
    let jumlahVoid = 0
    let totalBersih = 0
    let totalVoid = 0
    mockSesiTransactions.forEach((t) => {
      if (t.status === 'SUKSES') {
        jumlahSukses++
        totalBersih += t.total
      } else if (t.status === 'VOID') {
        jumlahVoid++
        totalVoid += t.total
      }
    })
    return {
      sesiKasirId: currentSesiMock.id,
      jumlahTransaksi: jumlahSukses,
      jumlahVoid,
      totalBruto: totalBersih + totalVoid,
      totalVoid,
      totalBersih,
    }
  }

  interface MockRiwayatItem {
    id: number
    menuId: number
    menuNama: string
    arah: 'MASUK' | 'KELUAR'
    jenis: string
    qty: number
    hargaBeliSatuan: number | null
    totalNilai: number | null
    hppSnapshot: number
    stokSetelah: number
    referensiTipe: string
    referensiId: string
    alasan: string | null
    mutasiAsalId: number | null
    sudahDibalik: number | null
    sisaDapatDibalik: number | null
    dapatDibalik: boolean
    aktorId: number
    aktorNama?: string | null
    waktu: string
  }

  const riwayatStokList: MockRiwayatItem[] = [
    {
      id: 1,
      menuId: 1,
      menuNama: 'Nasi Kuning Komplit',
      arah: 'MASUK',
      jenis: 'BARANG_MASUK',
      qty: 30,
      hargaBeliSatuan: 10000,
      totalNilai: 300000,
      hppSnapshot: 10000,
      stokSetelah: 30,
      referensiTipe: 'BARANG_MASUK',
      referensiId: 'BM-20261001-001',
      alasan: 'Restock bahan baku harian',
      mutasiAsalId: null,
      sudahDibalik: 0,
      sisaDapatDibalik: 30,
      dapatDibalik: true,
      aktorId: 1,
      aktorNama: 'Deryl Fabiensyah',
      waktu: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 2,
      menuId: 1,
      menuNama: 'Nasi Kuning Komplit',
      arah: 'KELUAR',
      jenis: 'PENJUALAN',
      qty: 12,
      hargaBeliSatuan: null,
      totalNilai: null,
      hppSnapshot: 10000,
      stokSetelah: 18,
      referensiTipe: 'PENJUALAN',
      referensiId: 'TRX-20261002-0045',
      alasan: null,
      mutasiAsalId: null,
      sudahDibalik: null,
      sisaDapatDibalik: null,
      dapatDibalik: false,
      aktorId: 2,
      aktorNama: 'Kasir Kantin 1',
      waktu: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 3,
      menuId: 1,
      menuNama: 'Nasi Kuning Komplit',
      arah: 'KELUAR',
      jenis: 'BARANG_RUSAK',
      qty: 2,
      hargaBeliSatuan: null,
      totalNilai: null,
      hppSnapshot: 10000,
      stokSetelah: 16,
      referensiTipe: 'BARANG_RUSAK',
      referensiId: 'BR-20261003-0001',
      alasan: 'Kemasan rusak / tertindih',
      mutasiAsalId: null,
      sudahDibalik: null,
      sisaDapatDibalik: null,
      dapatDibalik: false,
      aktorId: 1,
      aktorNama: 'Deryl Fabiensyah',
      waktu: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 4,
      menuId: 1,
      menuNama: 'Nasi Kuning Komplit',
      arah: 'MASUK',
      jenis: 'OPNAME_MASUK',
      qty: 4,
      hargaBeliSatuan: null,
      totalNilai: null,
      hppSnapshot: 10000,
      stokSetelah: 20,
      referensiTipe: 'OPNAME_BATCH',
      referensiId: 'OPN-20261004-001',
      alasan: 'Hasil opname fisik sore hari',
      mutasiAsalId: null,
      sudahDibalik: null,
      sisaDapatDibalik: null,
      dapatDibalik: false,
      aktorId: 1,
      aktorNama: 'Deryl Fabiensyah',
      waktu: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 5,
      menuId: 2,
      menuNama: 'Es Teh Manis',
      arah: 'MASUK',
      jenis: 'BARANG_MASUK',
      qty: 50,
      hargaBeliSatuan: 2000,
      totalNilai: 100000,
      hppSnapshot: 2000,
      stokSetelah: 50,
      referensiTipe: 'BARANG_MASUK',
      referensiId: 'BM-20261002-002',
      alasan: null,
      mutasiAsalId: null,
      sudahDibalik: 0,
      sisaDapatDibalik: 50,
      dapatDibalik: true,
      aktorId: 1,
      aktorNama: 'Deryl Fabiensyah',
      waktu: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 6,
      menuId: 2,
      menuNama: 'Es Teh Manis',
      arah: 'KELUAR',
      jenis: 'PENJUALAN',
      qty: 30,
      hargaBeliSatuan: null,
      totalNilai: null,
      hppSnapshot: 2000,
      stokSetelah: 20,
      referensiTipe: 'PENJUALAN',
      referensiId: 'TRX-20261003-0112',
      alasan: null,
      mutasiAsalId: null,
      sudahDibalik: null,
      sisaDapatDibalik: null,
      dapatDibalik: false,
      aktorId: 2,
      aktorNama: 'Kasir Kantin 1',
      waktu: new Date(Date.now() - 36000000).toISOString(),
    },
  ]

  axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const url = config.url || ''
      const method = (config.method || 'get').toLowerCase()

      // Cek apakah request harus di-handle oleh mock
      const mockResponse = handleMockRequest(url, method, config.data, config.params)
      if (mockResponse) {
        // Buat custom adapter yang langsung resolve response mock
        config.adapter = async () => {
          // Simulasi latensi jaringan natural (100ms - 250ms)
          await new Promise((r) => setTimeout(r, 150))
          if (mockResponse.status >= 200 && mockResponse.status < 300) {
            return {
              data: mockResponse.data,
              status: mockResponse.status,
              statusText: 'OK',
              headers: {},
              config,
            } as AxiosResponse
          } else {
            const errMsg = mockResponse.data?.message || 'Mock Error'
            const error = new Error(errMsg) as Error & {
              response?: {
                data: MockResponseData
                status: number
                statusText: string
                headers: Record<string, string>
                config: InternalAxiosRequestConfig
              }
            }
            error.response = {
              data: mockResponse.data,
              status: mockResponse.status,
              statusText: 'Error',
              headers: {},
              config,
            }
            throw error
          }
        }
      }

      return config
    }
  )

  function handleMockRequest(
    url: string,
    method: string,
    dataRaw: unknown,
    params?: Record<string, unknown>
  ): { status: number; data: MockResponseData } | null {
    let payload: Record<string, unknown> = {}
    if (typeof dataRaw === 'string') {
      try {
        payload = JSON.parse(dataRaw) as Record<string, unknown>
      } catch {
        payload = {}
      }
    } else if (typeof dataRaw === 'object' && dataRaw !== null) {
      payload = dataRaw as Record<string, unknown>
    }

    // --- 1. Auth Login Staf ---
    if (url.includes('/api/v1/auth/login') && method === 'post') {
      const email = String(
        payload.email || payload.username || ''
      ).toLowerCase()
      const password = String(payload.password || '')

      if (password === 'salah' || password === 'wrong') {
        return {
          status: 401,
          data: {
            code: 401,
            status: 'UNAUTHORIZED',
            message: 'Email atau kata sandi tidak valid',
          },
        }
      }

      let detectedRole = 'admin'
      let roleList = [
        'ROLE_ADMIN',
        'ROLE_PENGELOLA_KANTIN',
        'ROLE_PETUGAS_KANTIN',
        'ROLE_TU_SEKOLAH',
        'ROLE_BENDAHARA',
      ]
      let namaStaf = 'Wibisana Bama'

      if (email.includes('kasir')) {
        detectedRole = 'kasir'
        roleList = ['ROLE_PETUGAS_KANTIN']
        namaStaf = 'Ahmad Kasir'
      } else if (email.includes('pengelola')) {
        detectedRole = 'pengelola'
        roleList = ['ROLE_PENGELOLA_KANTIN']
        namaStaf = 'Deryl Fabiensyah'
      } else if (email.includes('tu')) {
        detectedRole = 'tu'
        roleList = ['ROLE_TU_SEKOLAH']
        namaStaf = 'Andika Pratama'
      } else if (email.includes('bendahara')) {
        detectedRole = 'bendahara'
        roleList = ['ROLE_BENDAHARA']
        namaStaf = 'Siti Rahma'
      }

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Login berhasil (Mock)',
          data: {
            token: `mock-jwt-token-skoolia-${detectedRole}-2026`,
            user: {
              id: 1,
              nama: namaStaf,
              email: email || 'wibisanabama@gmail.com',
              currentRole: detectedRole,
              roles: roleList,
              sekolah: {
                id: Number(payload.sekolah_id) || 10,
                nama: 'PAUD SKOOLIA',
              },
            },
          },
        },
      }
    }

    // --- 2. Katalog Menu (CRUD) ---
    if (url.includes('/katalog/menu')) {
      const idMatch = url.match(/\/katalog\/menu\/(\d+)/)
      const targetId = idMatch ? Number(idMatch[1]) : null

      if (method === 'get') {
        if (targetId) {
          const item = menuList.find((m) => m.id === targetId)
          if (!item)
            return { status: 404, data: { message: 'Menu tidak ditemukan' } }
          const kat = kategoriList.find((k) => k.id === item.kategori_id)
          return {
            status: 200,
            data: {
              code: 200,
              status: 'SUCCESS',
              data: {
                id: item.id,
                kategoriId: item.kategori_id,
                kategori_id: item.kategori_id,
                kategoriNama: kat?.nama || item.kategori_nama || 'Menu',
                kategori_nama: kat?.nama || item.kategori_nama || 'Menu',
                nama: item.nama,
                hargaJual: item.harga_jual,
                harga_jual: item.harga_jual,
                satuan: item.satuan ? item.satuan.toUpperCase() : 'PCS',
                fotoUrl: item.foto_url || null,
                foto_url: item.foto_url || null,
                stokMinimum: item.stok_minimum,
                stok_minimum: item.stok_minimum,
                stokBerjalan: item.stok,
                stok: item.stok,
                aktif: item.is_active,
                is_active: item.is_active,
              },
            },
          }
        }

        // List menu
        const mappedList = menuList.map((m) => {
          const kat = kategoriList.find((k) => k.id === m.kategori_id)
          return {
            id: m.id,
            kategoriId: m.kategori_id,
            kategori_id: m.kategori_id,
            kategoriNama: kat?.nama || m.kategori_nama || 'Menu',
            kategori_nama: kat?.nama || m.kategori_nama || 'Menu',
            nama: m.nama,
            hargaJual: m.harga_jual,
            harga_jual: m.harga_jual,
            satuan: m.satuan ? m.satuan.toUpperCase() : 'PCS',
            fotoUrl: m.foto_url || null,
            foto_url: m.foto_url || null,
            stokMinimum: m.stok_minimum,
            stok_minimum: m.stok_minimum,
            stokBerjalan: m.stok,
            stok: m.stok,
            aktif: m.is_active,
            is_active: m.is_active,
          }
        })
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            data: mappedList,
          },
        }
      }

      if (method === 'post') {
        const nextId =
          menuList.length > 0 ? Math.max(...menuList.map((m) => m.id)) + 1 : 1
        const kat = kategoriList.find(
          (k) => k.id === Number(payload.kategoriId)
        )
        const newItem: MenuItemMock = {
          id: nextId,
          nama: String(payload.nama || ''),
          kategori_id: Number(payload.kategoriId) || 1,
          kategori_nama: kat ? kat.nama : 'Umum',
          harga_jual: Number(payload.hargaJual) || 0,
          satuan: String(payload.satuan || 'PCS'),
          stok: 0,
          stok_minimum: Number(payload.stokMinimum) || 0,
          foto_url: payload.fotoUrl ? String(payload.fotoUrl) : undefined,
          is_active: payload.aktif !== false,
          hpp: Math.round((Number(payload.hargaJual) || 0) * 0.7),
        }
        menuList.unshift(newItem)
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Menu berhasil dibuat',
            data: {
              id: newItem.id,
              kategoriId: newItem.kategori_id,
              nama: newItem.nama,
              hargaJual: newItem.harga_jual,
              satuan: newItem.satuan,
              fotoUrl: newItem.foto_url || null,
              stokMinimum: newItem.stok_minimum,
              stokBerjalan: newItem.stok,
              aktif: newItem.is_active,
            },
          },
        }
      }

      if (method === 'put' && targetId) {
        const idx = menuList.findIndex((m) => m.id === targetId)
        if (idx === -1)
          return { status: 404, data: { message: 'Menu tidak ditemukan' } }
        const kat = kategoriList.find(
          (k) => k.id === Number(payload.kategoriId)
        )
        menuList[idx] = {
          ...menuList[idx],
          nama: String(payload.nama || menuList[idx].nama),
          kategori_id: Number(payload.kategoriId) || menuList[idx].kategori_id,
          kategori_nama: kat ? kat.nama : menuList[idx].kategori_nama,
          harga_jual:
            payload.hargaJual !== undefined
              ? Number(payload.hargaJual)
              : menuList[idx].harga_jual,
          satuan: String(payload.satuan || menuList[idx].satuan),
          stok_minimum:
            payload.stokMinimum !== undefined
              ? Number(payload.stokMinimum)
              : menuList[idx].stok_minimum,
          foto_url:
            payload.fotoUrl !== undefined
              ? String(payload.fotoUrl || '')
              : menuList[idx].foto_url,
          is_active:
            payload.aktif !== undefined
              ? Boolean(payload.aktif)
              : menuList[idx].is_active,
        }
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Menu berhasil diperbarui',
            data: {
              id: menuList[idx].id,
              kategoriId: menuList[idx].kategori_id,
              nama: menuList[idx].nama,
              hargaJual: menuList[idx].harga_jual,
              satuan: menuList[idx].satuan,
              fotoUrl: menuList[idx].foto_url || null,
              stokMinimum: menuList[idx].stok_minimum,
              stokBerjalan: menuList[idx].stok,
              aktif: menuList[idx].is_active,
            },
          },
        }
      }

      if (method === 'delete' && targetId) {
        const idx = menuList.findIndex((m) => m.id === targetId)
        if (idx === -1)
          return { status: 404, data: { message: 'Menu tidak ditemukan' } }
        // Soft delete
        menuList[idx].is_active = false
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Menu berhasil dinonaktifkan',
          },
        }
      }
    }

    // --- 3. Kategori Menu (CRUD) ---
    if (url.includes('/katalog/kategori')) {
      const idMatch = url.match(/\/katalog\/kategori\/(\d+)/)
      const targetId = idMatch ? Number(idMatch[1]) : null

      if (method === 'get') {
        const mappedKategori = kategoriList.map((k) => ({
          id: k.id,
          nama: k.nama,
          urutan: k.id,
          isActive: k.is_active,
          aktif: k.is_active,
          jumlahItem: menuList.filter(
            (m) => m.kategori_id === k.id && m.is_active
          ).length,
        }))
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            data: mappedKategori,
          },
        }
      }

      if (method === 'post') {
        const nextId =
          kategoriList.length > 0
            ? Math.max(...kategoriList.map((k) => k.id)) + 1
            : 1
        const newKat = {
          id: nextId,
          nama: String(payload.nama || ''),
          is_active: true,
          jumlah_item: 0,
        }
        kategoriList.push(newKat)
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Kategori berhasil dibuat',
            data: {
              id: newKat.id,
              nama: newKat.nama,
              urutan: Number(payload.urutan) || newKat.id,
              isActive: true,
              aktif: true,
              jumlahItem: 0,
            },
          },
        }
      }

      if (method === 'put' && targetId) {
        const idx = kategoriList.findIndex((k) => k.id === targetId)
        if (idx === -1)
          return { status: 404, data: { message: 'Kategori tidak ditemukan' } }
        kategoriList[idx] = {
          ...kategoriList[idx],
          nama: String(payload.nama || kategoriList[idx].nama),
        }
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Kategori berhasil diperbarui',
            data: {
              id: kategoriList[idx].id,
              nama: kategoriList[idx].nama,
              urutan: Number(payload.urutan) || kategoriList[idx].id,
              isActive: kategoriList[idx].is_active,
              aktif: kategoriList[idx].is_active,
              jumlahItem: menuList.filter(
                (m) => m.kategori_id === targetId && m.is_active
              ).length,
            },
          },
        }
      }

      if (method === 'delete' && targetId) {
        // Pengecekan aturan bisnis: jika kategori masih digunakan menu aktif, tidak bisa dihapus
        const activeUsage = menuList.some(
          (m) => m.kategori_id === targetId && m.is_active
        )
        if (activeUsage) {
          return {
            status: 400,
            data: {
              code: 400,
              status: 'BAD_REQUEST',
              message:
                'Kategori ini masih digunakan oleh menu aktif. Nonaktifkan atau pindahkan menu terlebih dahulu sebelum menghapus kategori.',
            },
          }
        }
        const idx = kategoriList.findIndex((k) => k.id === targetId)
        if (idx !== -1) {
          kategoriList[idx].is_active = false
        }
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Kategori berhasil dinonaktifkan',
          },
        }
      }
    }

    // --- Storage Upload File ---
    if (url.includes('/api/storage/upload') && method === 'post') {
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Berkas berhasil diunggah',
          data: {
            path: 'sekolah-10/menu/upload-preview.jpg',
            url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            namaAsli: 'foto-produk.jpg',
            ukuran: 154200,
          },
        },
      }
    }

    // --- 4. Kasir: Transaksi Tap Kartu (Validasi 6 Tahap & Idempotency) ---
    if (
      (url.includes('/api/v1/kasir/transaksi') ||
        url.includes('/api/kasir/tap')) &&
      method === 'post' &&
      !url.includes('/void')
    ) {
      const trxPayload = payload as TransaksiPayload & {
        rfidUid?: string
        idempotency_key?: string
        idempotencyKey?: string
      }
      const kartuUid = trxPayload.kartu_uid || trxPayload.rfidUid || ''
      const items = (trxPayload.items || []).map((it) => ({
        menu_id:
          it.menu_id ?? (it as unknown as { menuId?: number }).menuId ?? 0,
        qty: it.qty,
      }))
      const idempKey =
        trxPayload.idempotency_key || trxPayload.idempotencyKey || ''

      // Cek Idempotency: Jika request dengan idempotency_key yang sama sudah pernah diproses, kembalikan respons yang sama
      if (idempKey && idempotencyStore.has(idempKey)) {
        return idempotencyStore.get(idempKey)!
      }

      if (!kartuUid) {
        return {
          status: 400,
          data: { message: 'UID kartu tidak boleh kosong' },
        }
      }

      // Validasi 1: Kartu dikenal?
      const siswa = siswaList.find(
        (s) => s.uid.toUpperCase() === kartuUid.toUpperCase()
      )
      const kartuTamu = kartuTamuList.find(
        (k) => k.uid.toUpperCase() === kartuUid.toUpperCase()
      )

      if (!siswa && !kartuTamu) {
        return { status: 404, data: { message: 'Kartu tidak dikenal' } }
      }

      // Validasi 2: Kartu diblokir?
      if (siswa?.is_blocked || (kartuTamu && !kartuTamu.is_active)) {
        return {
          status: 400,
          data: {
            message: siswa
              ? 'Kartu diblokir, hubungi orang tua'
              : 'Kartu tamu diblokir',
          },
        }
      }

      // Hitung total belanja
      let totalBelanja = 0
      for (const cartItem of items) {
        const menuItem = menuList.find((m) => m.id === cartItem.menu_id)
        if (!menuItem) {
          return {
            status: 404,
            data: { message: `Menu ID ${cartItem.menu_id} tidak ditemukan` },
          }
        }

        // Validasi 4: Stok cukup?
        if (menuItem.stok < cartItem.qty) {
          return {
            status: 400,
            data: {
              message: `Stok ${menuItem.nama} tidak cukup (sisa ${menuItem.stok})`,
            },
          }
        }

        // Validasi 3: Item atau Kategori diblokir ortu?
        const isItemBlocked = siswa?.blocked_items?.includes(menuItem.id)
        const isCategoryBlocked = siswa?.blocked_categories?.includes(
          menuItem.kategori_id
        )
        if (isItemBlocked || isCategoryBlocked) {
          const detail = isCategoryBlocked
            ? ` (Kategori ${menuItem.kategori_nama})`
            : ''
          return {
            status: 400,
            data: {
              message: `Item ${menuItem.nama}${detail} diblokir oleh orang tua`,
            },
          }
        }

        totalBelanja += menuItem.harga_jual * cartItem.qty
      }

      // Validasi 5: Limit harian (hanya untuk siswa dengan limit aktif)
      if (
        siswa &&
        siswa.limit_harian_enabled !== false &&
        siswa.limit_harian > 0
      ) {
        if (siswa.belanja_hari_ini + totalBelanja > siswa.limit_harian) {
          const sisaLimit = Math.max(
            0,
            siswa.limit_harian - siswa.belanja_hari_ini
          )
          return {
            status: 400,
            data: {
              message: `Melebihi limit harian (sisa Rp ${sisaLimit.toLocaleString('id-ID')})`,
            },
          }
        }
      }

      // Validasi 6: Saldo cukup?
      const saldoSaatIni = siswa ? siswa.saldo : kartuTamu!.saldo
      if (saldoSaatIni < totalBelanja) {
        const kurang = totalBelanja - saldoSaatIni
        return {
          status: 400,
          data: {
            message: `Saldo kurang Rp ${kurang.toLocaleString('id-ID')}`,
            kekurangan: kurang,
          },
        }
      }

      // Sukses: potong saldo & kurangi stok
      if (siswa) {
        siswa.saldo -= totalBelanja
        siswa.belanja_hari_ini += totalBelanja
      } else if (kartuTamu) {
        kartuTamu.saldo -= totalBelanja
      }

      for (const cartItem of items) {
        const menuItem = menuList.find((m) => m.id === cartItem.menu_id)
        if (menuItem) {
          menuItem.stok -= cartItem.qty
        }
      }

      const trxId = Date.now()
      recordedTransactions.set(trxId, {
        total: totalBelanja,
        siswaUid: siswa ? siswa.uid : undefined,
        kartuTamuUid: kartuTamu ? kartuTamu.uid : undefined,
        items: items.map((it) => ({ menuId: it.menu_id, qty: it.qty })),
      })

      const itemDetails = items.map((it) => {
        const m = menuList.find((menu) => menu.id === it.menu_id)
        const nama = m ? m.nama : `Menu #${it.menu_id}`
        const harga = m ? m.harga_jual : 10000
        return {
          menuId: it.menu_id,
          namaMenu: nama,
          qty: it.qty,
          hargaSatuan: harga,
          subtotal: it.qty * harga,
        }
      })

      mockSesiTransactions.unshift({
        id: trxId,
        transaksiId: trxId,
        nomorReferensi: `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(trxId).slice(-4)}`,
        waktu: new Date().toISOString(),
        pembeliTipe: siswa ? 'SISWA' : 'KARTU_TAMU',
        pembeliNama: siswa ? siswa.nama : kartuTamu!.label_pemegang,
        pembeliKelas: siswa?.kelas,
        pembeliNis: siswa?.nis,
        pembeliFotoUrl: siswa?.foto_url,
        kartuUid,
        items: itemDetails,
        total: totalBelanja,
        status: 'SUKSES',
      })

      const successResponse = {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Transaksi berhasil',
          data: {
            transaksi_id: trxId,
            transaksiId: trxId,
            total: totalBelanja,
            waktu: new Date().toISOString(),
            pembeli: siswa
              ? {
                  tipe: 'SISWA' as const,
                  subjekTipe: 'SISWA' as const,
                  nama: siswa.nama,
                  kelas: siswa.kelas,
                  nis: siswa.nis,
                  foto_url: siswa.foto_url,
                  fotoUrl: siswa.foto_url,
                  sisa_saldo: siswa.saldo,
                  saldoSisa: siswa.saldo,
                }
              : {
                  tipe: 'KARTU_TAMU' as const,
                  subjekTipe: 'KARTU_TAMU' as const,
                  nomor_kartu: kartuTamu!.nomor_kartu,
                  label_pemegang: kartuTamu!.label_pemegang,
                  nama: kartuTamu!.label_pemegang,
                  sisa_saldo: kartuTamu!.saldo,
                  saldoSisa: kartuTamu!.saldo,
                },
          },
        },
      }

      if (idempKey) {
        idempotencyStore.set(idempKey, successResponse)
      }

      return successResponse
    }

    // --- 4b. Kasir: Void Transaksi (Darurat & Manual Sesi) ---
    const voidMatch = url.match(/\/kasir\/transaksi\/(\d+)\/void/)
    if (voidMatch && method === 'post') {
      const trxId = Number(voidMatch[1])
      const voidPayload = (payload as { alasan?: string }) || {}
      const alasanFinal =
        voidPayload.alasan || 'Wajah pembeli tidak cocok dengan foto kartu'

      // Update di mockSesiTransactions
      const targetSesiTrx = mockSesiTransactions.find(
        (t) => t.id === trxId || t.transaksiId === trxId
      )
      if (targetSesiTrx) {
        targetSesiTrx.status = 'VOID'
        targetSesiTrx.voidAlasan = alasanFinal
        targetSesiTrx.voidAt = new Date().toISOString()
        targetSesiTrx.voidOleh = 'Petugas Kasir'
      }

      const trx = recordedTransactions.get(trxId)
      if (trx) {
        if (trx.siswaUid) {
          const targetSiswa = siswaList.find((s) => s.uid === trx.siswaUid)
          if (targetSiswa) {
            targetSiswa.saldo += trx.total
            targetSiswa.belanja_hari_ini = Math.max(
              0,
              targetSiswa.belanja_hari_ini - trx.total
            )
          }
        } else if (trx.kartuTamuUid) {
          const targetKartu = kartuTamuList.find(
            (k) => k.uid === trx.kartuTamuUid
          )
          if (targetKartu) {
            targetKartu.saldo += trx.total
          }
        }

        for (const item of trx.items) {
          const targetMenu = menuList.find((m) => m.id === item.menuId)
          if (targetMenu) {
            targetMenu.stok += item.qty
          }
        }
        recordedTransactions.delete(trxId)
      }

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Transaksi berhasil dibatalkan (void)',
          data: {
            transaksi_id: trxId,
            status: 'VOID',
            alasan: alasanFinal,
          },
        },
      }
    }

    // --- 5a. Kasir: Riwayat Transaksi Sesi Hari Ini ---
    if (
      (url.includes('/api/kasir/transaksi/sesi') ||
        url.includes('/api/v1/kasir/transaksi')) &&
      method === 'get'
    ) {
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Riwayat transaksi sesi kasir berhasil dimuat',
          data: [...mockSesiTransactions],
        },
      }
    }

    // --- 5b. Kasir: Rekapitulasi Sesi Kasir ---
    if (
      (url.includes('/rekap') && url.includes('/kasir/sesi')) &&
      method === 'get'
    ) {
      const liveRekap = getLiveRekap()
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Rekap sesi kasir berhasil dimuat',
          data: liveRekap,
        },
      }
    }

    // --- 5c. Kasir: Tutup Sesi Kasir Harian ---
    if (
      (url.includes('/tutup') && url.includes('/kasir/sesi')) &&
      method === 'post'
    ) {
      const liveRekap = getLiveRekap()
      currentSesiMock.status = 'DITUTUP'
      currentSesiMock.ditutupAt = new Date().toISOString()
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Sesi kasir harian ditutup',
          data: {
            ...currentSesiMock,
            totalBruto: liveRekap.totalBruto,
            totalVoid: liveRekap.totalVoid,
            totalBersih: liveRekap.totalBersih,
            totalTransaksi: liveRekap.jumlahTransaksi,
          },
        },
      }
    }

    // --- 5d. Kasir: Buka Sesi Kasir ---
    if (
      (url.includes('/buka') && url.includes('/kasir/sesi')) &&
      method === 'post'
    ) {
      const liveRekap = getLiveRekap()
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Sesi kasir dibuka',
          data: {
            ...currentSesiMock,
            totalBruto: liveRekap.totalBruto,
            totalVoid: liveRekap.totalVoid,
            totalBersih: liveRekap.totalBersih,
            totalTransaksi: liveRekap.jumlahTransaksi,
          },
        },
      }
    }

    // --- 5e. Kasir: Sesi Kasir Aktif ---
    if (
      (url.includes('/api/kasir/sesi/aktif') ||
        url.includes('/api/v1/kasir/sesi') ||
        (url.includes('/api/kasir/sesi') && !url.includes('/rekap') && !url.includes('/tutup') && !url.includes('/buka') && !url.includes('/transaksi'))) &&
      method === 'get'
    ) {
      const liveRekap = getLiveRekap()
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          data: {
            ...currentSesiMock,
            sesi_id: currentSesiMock.id,
            titik_kasir: currentSesiMock.titikKasirNama,
            total_transaksi: liveRekap.jumlahTransaksi,
            total_bruto: liveRekap.totalBruto,
            total_void: liveRekap.totalVoid,
            total_bersih: liveRekap.totalBersih,
            totalBruto: liveRekap.totalBruto,
            totalVoid: liveRekap.totalVoid,
            totalBersih: liveRekap.totalBersih,
            totalTransaksi: liveRekap.jumlahTransaksi,
          },
        },
      }
    }

    // --- 6. TU: Pencarian Siswa & Kartu Tamu / Kandidat Saldo ---
    if (
      (url.includes('/api/saldo/refund/kandidat') ||
        url.includes('/api/v1/tu/siswa') ||
        url.includes('/api/tu/siswa')) &&
      method === 'get'
    ) {
      const urlObj = new URL(url, 'http://localhost')
      const isTidakAktif =
        urlObj.searchParams.get('hanyaTidakAktif') === 'true' ||
        params?.hanyaTidakAktif === true ||
        params?.hanyaTidakAktif === 'true'

      if (isTidakAktif) {
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Berhasil mengambil daftar siswa nonaktif',
            data: siswaNonaktifList,
          },
        }
      }

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Berhasil mengambil daftar siswa',
          data: siswaList,
        },
      }
    }

    // --- 7. TU: Setoran Kas TU Harian ---
    // GET /api/saldo/setoran-tu/rekap, /api/saldo/setoran-tu, /api/v1/tu/setoran, or /api/tu/setoran
    if (
      (url.includes('/api/saldo/setoran-tu') ||
        url.includes('/api/v1/tu/setoran') ||
        url.includes('/api/tu/setoran')) &&
      !url.includes('/konfirmasi') &&
      method === 'get'
    ) {
      const urlObj = new URL(url, 'http://localhost')
      const tanggalParam =
        urlObj.searchParams.get('tanggal') || (params?.tanggal as string)
      const petugasIdParam =
        urlObj.searchParams.get('petugasId') || (params?.petugasId as string)
      const statusParam =
        urlObj.searchParams.get('status') || (params?.status as string)

      let filtered = [...setoranKasList]
      if (tanggalParam) {
        filtered = filtered.filter((s) => s.tanggal === tanggalParam)
      }
      if (petugasIdParam) {
        filtered = filtered.filter(
          (s) => s.petugas_id === Number(petugasIdParam)
        )
      }
      if (statusParam && statusParam !== 'ALL') {
        filtered = filtered.filter((s) => s.status === statusParam)
      }

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Daftar setoran kas TU berhasil diambil',
          data: filtered,
        },
      }
    }

    // POST /api/saldo/setoran-tu or /api/v1/tu/setoran/konfirmasi or /api/tu/setoran/konfirmasi
    if (
      (url.includes('/api/saldo/setoran-tu') ||
        url.includes('/api/v1/tu/setoran') ||
        url.includes('/api/tu/setoran')) &&
      (url.includes('/konfirmasi') || method === 'post')
    ) {
      const idMatch = url.match(/\/setoran\/([^/]+)\/konfirmasi/)
      const targetId =
        (idMatch ? idMatch[1] : (payload.id as string)) ||
        (payload.setoran_id as string) ||
        (payload.setoranId as string)
      const tanggal = String(payload.tanggal || '')
      const uangFisik =
        Number(
          payload.jumlahDisetor ?? payload.uang_fisik ?? payload.uangFisik
        ) || 0
      const catatan = String(payload.catatan ?? payload.keterangan ?? '').trim()
      const bendaharaNama = String(
        payload.bendahara_nama ?? 'Siti Rahma (Bendahara)'
      )

      let setoranIdx = -1
      if (targetId) {
        setoranIdx = setoranKasList.findIndex((s) => s.id === targetId)
      } else if (tanggal) {
        setoranIdx = setoranKasList.findIndex((s) => s.tanggal === tanggal)
      }

      if (setoranIdx === -1 && setoranKasList.length > 0) {
        setoranIdx = 0
      }

      if (setoranIdx === -1) {
        return {
          status: 404,
          data: {
            code: 404,
            status: 'NOT_FOUND',
            message: `Setoran kas tidak ditemukan`,
          },
        }
      }

      const item = setoranKasList[setoranIdx]
      const selisih = uangFisik - item.total_sistem

      if (selisih !== 0 && !catatan) {
        return {
          status: 400,
          data: {
            code: 400,
            status: 'BAD_REQUEST',
            message:
              'Terdapat selisih kas fisik! Alasan / Berita acara selisih wajib diisi.',
          },
        }
      }

      setoranKasList[setoranIdx] = {
        ...item,
        uang_fisik: uangFisik,
        selisih,
        status: 'TERKONFIRMASI',
        catatan:
          catatan ||
          (selisih === 0
            ? 'Uang fisik pas sesuai total sistem'
            : `Selisih kas ${selisih < 0 ? 'kurang' : 'lebih'} Rp ${Math.abs(selisih).toLocaleString('id-ID')}`),
        bendahara_id: 10,
        bendahara_nama: bendaharaNama,
        konfirmasi_pada: new Date().toISOString(),
      }

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Setoran kas TU berhasil dikonfirmasi bendahara',
          data: setoranKasList[setoranIdx],
        },
      }
    }

    // --- 8. Saldo Query (Siswa & Kartu Tamu) ---
    // GET /api/saldo?subjekTipe=...&subjekId=...
    if (
      url.includes('/api/saldo') &&
      !url.includes('/api/saldo/topup') &&
      !url.includes('/api/saldo/koreksi') &&
      method === 'get'
    ) {
      const urlObj = new URL(url, 'http://localhost')
      const subjekTipe = urlObj.searchParams.get('subjekTipe') || 'SISWA'
      const subjekId = Number(urlObj.searchParams.get('subjekId'))

      if (subjekTipe === 'KARTU_TAMU') {
        const kt = kartuTamuList.find((k) => k.id === subjekId)
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            data: {
              subjekTipe: 'KARTU_TAMU',
              subjekId,
              saldo: kt ? kt.saldo : 0,
              belanjaHariIni: 0,
              limitHarian: null,
              mutasiTerbaru: [],
            },
          },
        }
      } else {
        const siswa = siswaList.find((s) => s.siswa_id === subjekId)
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            data: {
              subjekTipe: 'SISWA',
              subjekId,
              saldo: siswa ? siswa.saldo : 0,
              belanjaHariIni: siswa ? siswa.belanja_hari_ini : 0,
              limitHarian: siswa ? siswa.limit_harian : null,
              mutasiTerbaru: [],
            },
          },
        }
      }
    }

    // --- 9. Mutasi Koreksi Bendahara ---
    // GET /api/saldo/koreksi (Riwayat Mutasi Koreksi)
    if (
      (url.includes('/api/saldo/koreksi') ||
        url.includes('/api/v1/bendahara/koreksi')) &&
      method === 'get'
    ) {
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Daftar riwayat mutasi koreksi bendahara berhasil dimuat',
          data: koreksiList,
        },
      }
    }

    // GET /api/kasir/transaksi or /api/transaksi/sesi-tutup or /api/v1/kasir/transaksi-lampau
    if (
      (url.includes('/api/kasir/transaksi') ||
        url.includes('/api/transaksi/sesi-tutup') ||
        url.includes('/api/v1/kasir/transaksi-lampau')) &&
      method === 'get'
    ) {
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          data: transaksiSesiTutupList,
        },
      }
    }

    // POST /api/saldo/koreksi (Eksekusi Koreksi Saldo / Pembalik Transaksi)
    if (url.includes('/api/saldo/koreksi') && method === 'post') {
      const subjekTipe =
        ((payload.subjekTipe || payload.subjek_tipe) as string) || 'SISWA'
      const subjekId = Number(payload.subjekId ?? payload.subjek_id)
      const arah = String(payload.arah || 'DEBIT').toUpperCase() as
        | 'DEBIT'
        | 'KREDIT'
      const nominal = Number(payload.nominal) || 0
      const alasan = String(payload.alasan || '').trim()
      const referensiId = String(
        payload.referensiId ||
          payload.referensi_id ||
          `BA-KOR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
      ).trim()
      const jenisKoreksi = String(
        payload.jenisKoreksi || payload.jenis_koreksi || 'PENYESUAIAN_AUDIT'
      ) as
        | 'SALAH_INPUT_TOPUP'
        | 'PEMBALIK_TRANSAKSI_KASIR'
        | 'PENYESUAIAN_AUDIT'
      const transaksiTerkaitId =
        payload.transaksiTerkaitId || payload.transaksi_terkait_id

      if (!subjekId || nominal <= 0) {
        return {
          status: 400,
          data: {
            code: 400,
            status: 'BAD_REQUEST',
            message: 'Subjek ID dan nominal koreksi valid (> 0) wajib diisi',
          },
        }
      }

      if (!alasan) {
        return {
          status: 400,
          data: {
            code: 400,
            status: 'BAD_REQUEST',
            message: 'Alasan koreksi audit wajib diisi (PRD §9.2 & §11.7)',
          },
        }
      }

      if (!referensiId) {
        return {
          status: 400,
          data: {
            code: 400,
            status: 'BAD_REQUEST',
            message:
              'Nomor Berita Acara / Referensi koreksi wajib diisi untuk integritas audit & idempotency',
          },
        }
      }

      let subjekNama: string
      let subjekInfo: string
      let saldoSebelum: number
      let saldoSetelah: number

      if (subjekTipe === 'SISWA') {
        const siswa = siswaList.find((s) => s.siswa_id === subjekId)
        if (!siswa) {
          return {
            status: 404,
            data: {
              code: 404,
              status: 'NOT_FOUND',
              message: 'Siswa tidak ditemukan',
            },
          }
        }
        subjekNama = siswa.nama
        subjekInfo = `${siswa.kelas} (NIS: ${siswa.nis})`
        saldoSebelum = siswa.saldo

        if (arah === 'DEBIT') {
          if (siswa.saldo < nominal) {
            return {
              status: 400,
              data: {
                code: 400,
                status: 'BAD_REQUEST',
                message: `Koreksi DEBIT ditolak: Saldo siswa saat ini (Rp ${siswa.saldo.toLocaleString('id-ID')}) tidak mencukupi untuk dikurangi Rp ${nominal.toLocaleString('id-ID')} (saldo tidak boleh minus)`,
              },
            }
          }
          siswa.saldo -= nominal
        } else {
          siswa.saldo += nominal
        }
        saldoSetelah = siswa.saldo
      } else {
        // KARTU_TAMU
        const kt = kartuTamuList.find((k) => k.id === subjekId)
        if (!kt) {
          return {
            status: 404,
            data: {
              code: 404,
              status: 'NOT_FOUND',
              message: 'Kartu tamu tidak ditemukan',
            },
          }
        }
        subjekNama = kt.label_pemegang || `Kartu ${kt.nomor_kartu}`
        subjekInfo = `Kartu: ${kt.nomor_kartu}`
        saldoSebelum = kt.saldo

        if (arah === 'DEBIT') {
          if (kt.saldo < nominal) {
            return {
              status: 400,
              data: {
                code: 400,
                status: 'BAD_REQUEST',
                message: `Koreksi DEBIT ditolak: Saldo kartu tamu saat ini (Rp ${kt.saldo.toLocaleString('id-ID')}) tidak mencukupi untuk dikurangi Rp ${nominal.toLocaleString('id-ID')}`,
              },
            }
          }
          kt.saldo -= nominal
        } else {
          kt.saldo += nominal
        }
        saldoSetelah = kt.saldo
      }

      // Tandai transaksi sesi tutup terkait jika ada
      if (transaksiTerkaitId) {
        const trIdx = transaksiSesiTutupList.findIndex(
          (t) => t.id === String(transaksiTerkaitId)
        )
        if (trIdx !== -1) {
          transaksiSesiTutupList[trIdx].status = 'DIKOREKSI'
          transaksiSesiTutupList[trIdx].koreksi_referensi_id = referensiId
        }
      }

      const newKoreksi: MutasiKoreksiMock = {
        id: `KOR-${Date.now()}`,
        referensi_id: referensiId,
        waktu: new Date().toISOString(),
        subjek_tipe: subjekTipe as 'SISWA' | 'KARTU_TAMU',
        subjek_id: subjekId,
        subjek_nama: subjekNama,
        subjek_info: subjekInfo,
        jenis_koreksi: jenisKoreksi,
        arah,
        nominal,
        saldo_sebelum: saldoSebelum,
        saldo_setelah: saldoSetelah,
        alasan,
        bendahara_id: 10,
        bendahara_nama: 'Siti Rahma (Bendahara)',
        transaksi_terkait_id: transaksiTerkaitId
          ? String(transaksiTerkaitId)
          : undefined,
      }

      koreksiList.unshift(newKoreksi)

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Mutasi koreksi bendahara berhasil dicatat di ledger saldo',
          data: {
            subjekTipe,
            subjekId,
            nominal,
            arah,
            saldoSebelum,
            saldoSetelah,
            referensiId,
            alasan,
            mutasi: newKoreksi,
          },
        },
      }
    }

    // POST /api/kartu-tamu/refund
    if (url.includes('/api/kartu-tamu/refund') && method === 'post') {
      const kartuId = Number(payload.kartuId || payload.kartu_id)
      const referensiId = String(
        payload.referensiId ||
          payload.referensi_id ||
          `REFUND-KT-${Date.now().toString().slice(-6)}`
      )
      const catatan = String(payload.catatan || 'Refund saldo kartu tamu')

      const card = kartuTamuList.find((k) => k.id === kartuId)
      if (!card) {
        return { status: 404, data: { message: 'Kartu tamu tidak ditemukan' } }
      }

      const nominalRefund = card.saldo
      card.saldo = 0
      card.is_active = false
      card.status = 'AVAILABLE'

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Refund kartu tamu berhasil diproses',
          data: {
            kartuId: card.id,
            nomorKartu: card.nomor_kartu,
            nominalRefund,
            referensiId,
            catatan,
          },
        },
      }
    }

    // POST /api/kartu-tamu/pindah-saldo
    if (url.includes('/api/kartu-tamu/pindah-saldo') && method === 'post') {
      const kartuSumberId = Number(
        payload.kartuSumberId || payload.kartu_sumber_id
      )
      const kartuTujuanId = Number(
        payload.kartuTujuanId || payload.kartu_tujuan_id
      )
      const referensiId = String(
        payload.referensiId ||
          payload.referensi_id ||
          `PINDAH-KT-${Date.now().toString().slice(-6)}`
      )
      const catatan = String(payload.catatan || 'Pemindahan saldo kartu tamu')

      const sumber = kartuTamuList.find((k) => k.id === kartuSumberId)
      const tujuan = kartuTamuList.find((k) => k.id === kartuTujuanId)

      if (!sumber || !tujuan) {
        return {
          status: 404,
          data: {
            message: 'Kartu sumber atau kartu tujuan tidak ditemukan',
          },
        }
      }

      const nominalTransfer = sumber.saldo
      sumber.saldo = 0
      tujuan.saldo += nominalTransfer

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Pemindahan saldo kartu tamu berhasil',
          data: {
            referensiId,
            kartuSumberId: sumber.id,
            kartuTujuanId: tujuan.id,
            nominal: nominalTransfer,
            catatan,
          },
        },
      }
    }

    // --- Kontrol Kartu (Backend-aligned /api/kontrol-kartu/*) ---
    // POST /api/kontrol-kartu/blokir
    if (url.includes('/api/kontrol-kartu/blokir') && method === 'post') {
      const subjekTipe = String(payload.subjekTipe || 'SISWA').toUpperCase()
      const subjekId = Number(payload.subjekId)
      const diblokir = Boolean(payload.diblokir)
      const alasan = String(payload.alasan || '')

      if (subjekTipe === 'KARTU_TAMU') {
        const card = kartuTamuList.find((k) => k.id === subjekId)
        if (!card) {
          return {
            status: 404,
            data: { message: 'Kartu tamu tidak ditemukan' },
          }
        }
        card.is_active = !diblokir
        card.status = diblokir ? 'BLOCKED' : 'AVAILABLE'
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: diblokir
              ? 'Kartu tamu berhasil diblokir'
              : 'Kartu tamu berhasil dibuka blokirnya',
            data: { subjekTipe, subjekId, diblokir, alasan },
          },
        }
      } else {
        const siswa = siswaList.find((s) => s.siswa_id === subjekId)
        if (!siswa) {
          return { status: 404, data: { message: 'Siswa tidak ditemukan' } }
        }
        siswa.is_blocked = diblokir
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: diblokir
              ? 'Kartu siswa berhasil diblokir'
              : 'Kartu siswa berhasil dibuka blokirnya',
            data: { subjekTipe, subjekId, diblokir, alasan },
          },
        }
      }
    }

    // PUT /api/kontrol-kartu/limit-harian
    if (url.includes('/api/kontrol-kartu/limit-harian') && method === 'put') {
      const subjekTipe = String(payload.subjekTipe || 'SISWA').toUpperCase()
      const subjekId = Number(payload.subjekId)
      const nominal =
        payload.nominal !== null && payload.nominal !== undefined
          ? Number(payload.nominal)
          : null

      const siswa = siswaList.find((s) => s.siswa_id === subjekId)
      if (!siswa) {
        return { status: 404, data: { message: 'Siswa tidak ditemukan' } }
      }

      siswa.limit_harian = nominal || 0
      siswa.limit_harian_enabled = nominal !== null && nominal > 0
      siswa.updated_at = new Date().toISOString()

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Limit harian berhasil diperbarui',
          data: {
            subjekTipe,
            subjekId,
            limitHarian: siswa.limit_harian,
            limitHarianEnabled: siswa.limit_harian_enabled,
          },
        },
      }
    }

    // POST /api/kontrol-kartu/blokir-item
    if (url.includes('/api/kontrol-kartu/blokir-item') && method === 'post') {
      const subjekTipe = String(payload.subjekTipe || 'SISWA').toUpperCase()
      const subjekId = Number(payload.subjekId)
      const menuId = payload.menuId ? Number(payload.menuId) : null
      const kategoriId = payload.kategoriId ? Number(payload.kategoriId) : null
      const diblokir = payload.diblokir !== false

      if (subjekTipe === 'SISWA') {
        const siswa = siswaList.find((s) => s.siswa_id === subjekId)
        if (siswa) {
          if (!siswa.blocked_items) siswa.blocked_items = []
          if (!siswa.blocked_categories) siswa.blocked_categories = []

          if (menuId) {
            if (diblokir && !siswa.blocked_items.includes(menuId)) {
              siswa.blocked_items.push(menuId)
            } else if (!diblokir) {
              siswa.blocked_items = siswa.blocked_items.filter((id) => id !== menuId)
            }
          }
          if (kategoriId) {
            if (diblokir && !siswa.blocked_categories.includes(kategoriId)) {
              siswa.blocked_categories.push(kategoriId)
            } else if (!diblokir) {
              siswa.blocked_categories = siswa.blocked_categories.filter((id) => id !== kategoriId)
            }
          }
          siswa.updated_at = new Date().toISOString()
        }
      }

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: diblokir
            ? 'Item / Kategori berhasil diblokir'
            : 'Blokir item / kategori berhasil dibuka',
          data: { subjekTipe, subjekId, menuId, kategoriId, diblokir },
        },
      }
    }

    // GET /api/kontrol-kartu/{subjekTipe}/{subjekId}
    if (url.includes('/api/kontrol-kartu/') && method === 'get') {
      const match = url.match(/\/api\/kontrol-kartu\/([^/]+)\/([^/]+)/)
      if (match) {
        const subjekTipe = match[1].toUpperCase()
        const subjekId = Number(match[2])
        if (subjekTipe === 'KARTU_TAMU') {
          const card = kartuTamuList.find((k) => k.id === subjekId)
          if (!card)
            return {
              status: 404,
              data: { message: 'Kartu tamu tidak ditemukan' },
            }
          return {
            status: 200,
            data: {
              code: 200,
              status: 'SUCCESS',
              data: {
                subjekTipe,
                subjekId,
                diblokir: !card.is_active,
                limitHarian: null,
              },
            },
          }
        } else {
          const siswa = siswaList.find((s) => s.siswa_id === subjekId)
          if (!siswa)
            return {
              status: 404,
              data: { message: 'Siswa tidak ditemukan' },
            }
          return {
            status: 200,
            data: {
              code: 200,
              status: 'SUCCESS',
              data: {
                subjekTipe,
                subjekId,
                diblokir: siswa.is_blocked,
                limitHarian: siswa.limit_harian_enabled
                  ? siswa.limit_harian
                  : null,
              },
            },
          }
        }
      }
    }

    // Kartu Tamu Endpoints: /api/kartu-tamu and /api/v1/tu/kartu-tamu
    if (
      (url.includes('/api/kartu-tamu') ||
        url.includes('/api/v1/tu/kartu-tamu')) &&
      !url.includes('/refund') &&
      !url.includes('/pindah-saldo')
    ) {
      // POST: Buat kartu baru
      if (method === 'post') {
        const nomor =
          (payload.nomorKartu as string) ||
          (payload.nomor_kartu as string) ||
          `KT-00${kartuTamuList.length + 1}`
        const uid =
          (payload.rfidUid as string) ||
          (payload.uid as string) ||
          `04KT${Date.now().toString().slice(-4)}`
        const catatan =
          (payload.catatan as string) ||
          (payload.label_pemegang as string) ||
          ''
        const newCard: KartuTamuMock = {
          id: Date.now(),
          nomor_kartu: nomor,
          uid,
          label_pemegang: catatan,
          saldo: 0,
          is_active: true,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        }
        kartuTamuList.push(newCard)
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Kartu tamu berhasil dibuat',
            data: {
              ...newCard,
              nomorKartu: newCard.nomor_kartu,
              rfidUid: newCard.uid,
              catatan: newCard.label_pemegang,
              aktif: newCard.is_active,
              sekolahId: 10,
              dibuatOleh: 1,
              dibuatPada: newCard.created_at,
            },
          },
        }
      }

      // PUT: Update kartu / unblock
      if (method === 'put') {
        const match = url.match(/\/kartu-tamu\/(\d+)/)
        const id = match ? Number(match[1]) : 0
        const card = kartuTamuList.find((k) => k.id === id)
        if (card) {
          if (payload.aktif !== undefined) {
            card.is_active = Boolean(payload.aktif)
            card.status = payload.aktif ? 'AVAILABLE' : 'BLOCKED'
          }
          if (payload.catatan !== undefined) {
            card.label_pemegang = String(payload.catatan)
          }
          if (payload.nomorKartu) {
            card.nomor_kartu = String(payload.nomorKartu)
          }
          if (payload.rfidUid) {
            card.uid = String(payload.rfidUid)
          }
        }
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Kartu tamu berhasil diperbarui',
            data: card,
          },
        }
      }

      // DELETE: Nonaktifkan / blokir kartu
      if (method === 'delete') {
        const match = url.match(/\/kartu-tamu\/(\d+)/)
        const id = match ? Number(match[1]) : 0
        const card = kartuTamuList.find((k) => k.id === id)
        if (card) {
          card.is_active = false
          card.status = 'BLOCKED'
        }
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Kartu tamu berhasil dinonaktifkan',
            data: { aktif: false },
          },
        }
      }

      // GET: Ambil daftar kartu tamu
      if (method === 'get') {
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            data: kartuTamuList.map((k) => ({
              ...k,
              nomorKartu: k.nomor_kartu,
              rfidUid: k.uid,
              catatan: k.label_pemegang,
              aktif: k.is_active,
              sekolahId: 10,
              dibuatOleh: 1,
              dibuatPada: k.created_at,
            })),
          },
        }
      }
    }

    // --- 7. TU: Topup Tunai Saldo Siswa (Sesuai Backend SaldoController /api/saldo/topup) ---
    if (
      (url.includes('/api/saldo/topup') || url.includes('/api/v1/tu/topup')) &&
      method === 'post'
    ) {
      const subjekTipe = (payload.subjekTipe as string) || 'SISWA'
      const subjekId = Number(payload.subjekId ?? payload.siswa_id)
      const nominal = Number(payload.nominal) || 0
      const penyetor =
        (payload.penyetor as string) ||
        (payload.nama_penyetor as string) ||
        'Orang Tua / Wali'
      const petugasNama =
        (payload.petugas_nama as string) || 'Wibisana Bama (Petugas TU)'

      const now = new Date()
      const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '')
      const randomSeq = Math.floor(1000 + Math.random() * 9000)
      const referensiId =
        (payload.referensiId as string) || `TU-TOPUP-${dateCode}-${randomSeq}`

      if (!subjekId || nominal <= 0) {
        return {
          status: 400,
          data: { message: 'ID subjek dan nominal top-up valid wajib diisi' },
        }
      }

      if (!referensiId || referensiId.trim() === '') {
        return {
          status: 400,
          data: { message: 'Nomor referensi/bukti wajib diisi' },
        }
      }

      if (subjekTipe === 'SISWA') {
        const siswa = siswaList.find((s) => s.siswa_id === subjekId)
        if (!siswa) {
          return { status: 404, data: { message: 'Siswa tidak ditemukan' } }
        }

        if (siswa.is_blocked) {
          return {
            status: 400,
            data: { message: 'Top-up ditolak: Kartu siswa sedang diblokir' },
          }
        }

        const MAX_SALDO = 500000
        if (siswa.saldo + nominal > MAX_SALDO) {
          return {
            status: 400,
            data: {
              message: `Top-up ditolak: Saldo baru (Rp ${(
                siswa.saldo + nominal
              ).toLocaleString(
                'id-ID'
              )}) melebihi batas saldo maksimal sekolah (Rp ${MAX_SALDO.toLocaleString('id-ID')})`,
            },
          }
        }

        const saldoAwal = siswa.saldo
        siswa.saldo += nominal
        const saldoBaru = siswa.saldo

        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            message: 'Top-up berhasil',
            data: {
              mutasi: {
                id: Date.now(),
                sekolahId: 10,
                subjekTipe: 'SISWA',
                subjekId: siswa.siswa_id,
                arah: 'KREDIT',
                jenis: 'TOPUP_TUNAI',
                nominal,
                saldoSetelah: saldoBaru,
                idempotencyKey: `TOPUP-TUNAI-${referensiId}`,
                referensiTipe: 'TOPUP',
                referensiId,
                keterangan: `Top-up tunai oleh ${penyetor}`,
                aktorId: 1,
                waktu: now.toISOString(),
                createdAt: now.toISOString(),
              },
              saldoSetelah: saldoBaru,
              idempotentReplay: false,
              // Backward compatibility fields for UI
              ref_no: referensiId,
              waktu: now.toISOString(),
              petugas_nama: petugasNama,
              nama_penyetor: penyetor,
              saldo_awal: saldoAwal,
              saldo_baru: saldoBaru,
              siswa: {
                siswa_id: siswa.siswa_id,
                nis: siswa.nis,
                nama: siswa.nama,
                kelas: siswa.kelas,
                foto_url: siswa.foto_url,
              },
            },
          },
        }
      } else {
        // KARTU_TAMU
        const kartuTamu = kartuTamuList.find((k) => k.id === subjekId)
        if (!kartuTamu) {
          return {
            status: 404,
            data: { message: 'Kartu tamu tidak ditemukan' },
          }
        }
        kartuTamu.saldo += nominal

        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            message: 'Top-up kartu tamu berhasil',
            data: {
              mutasi: {
                id: Date.now(),
                sekolahId: 10,
                subjekTipe: 'KARTU_TAMU',
                subjekId: kartuTamu.id,
                arah: 'KREDIT',
                jenis: 'TOPUP_TUNAI',
                nominal,
                saldoSetelah: kartuTamu.saldo,
                idempotencyKey: `TOPUP-TUNAI-${referensiId}`,
                referensiTipe: 'TOPUP',
                referensiId,
                keterangan: `Top-up tunai kartu tamu oleh ${penyetor}`,
                aktorId: 1,
                waktu: now.toISOString(),
                createdAt: now.toISOString(),
              },
              saldoSetelah: kartuTamu.saldo,
              idempotentReplay: false,
            },
          },
        }
      }
    }

    // --- 8. Stok: Barang Masuk, Pembalik, dan Riwayat ---
    if (url.includes('/api/stok/barang-masuk-pembalik') && method === 'post') {
      const mutasiId = Number(payload.mutasiId)
      const targetMutasi = riwayatStokList.find((r) => r.id === mutasiId)
      if (!targetMutasi) {
        return {
          status: 404,
          data: { message: 'Data barang masuk tidak ditemukan' },
        }
      }

      const sisa = targetMutasi.sisaDapatDibalik ?? targetMutasi.qty
      const qtyBalik = payload.qty ? Math.min(sisa, Number(payload.qty)) : sisa
      if (qtyBalik <= 0 || qtyBalik > sisa) {
        return {
          status: 400,
          data: { message: 'Qty pembalik tidak valid atau melebihi sisa' },
        }
      }

      const alasan = String(payload.alasan || '').trim()
      if (!alasan) {
        return { status: 400, data: { message: 'Alasan pembalik wajib diisi' } }
      }

      const referensiId = String(
        payload.referensiId || `BMP-${Date.now()}`
      ).trim()

      const targetMenu = menuList.find((m) => m.id === targetMutasi.menuId)
      const stokSebelum = targetMenu ? targetMenu.stok : 0
      const stokSesudah = Math.max(0, stokSebelum - qtyBalik)
      if (targetMenu) {
        targetMenu.stok = stokSesudah
      }

      targetMutasi.sudahDibalik = (targetMutasi.sudahDibalik || 0) + qtyBalik
      targetMutasi.sisaDapatDibalik = sisa - qtyBalik
      targetMutasi.dapatDibalik = (targetMutasi.sisaDapatDibalik || 0) > 0

      const now = new Date()
      const newId =
        riwayatStokList.length > 0
          ? Math.max(...riwayatStokList.map((r) => r.id)) + 1
          : 1
      const mutasiPembalik: MockRiwayatItem = {
        id: newId,
        menuId: targetMutasi.menuId,
        menuNama: targetMutasi.menuNama,
        arah: 'KELUAR',
        jenis: 'BARANG_MASUK_PEMBALIK',
        qty: qtyBalik,
        hargaBeliSatuan: targetMutasi.hargaBeliSatuan,
        totalNilai: (targetMutasi.hargaBeliSatuan || 0) * qtyBalik,
        hppSnapshot: targetMutasi.hppSnapshot,
        stokSetelah: stokSesudah,
        referensiTipe: 'BARANG_MASUK_PEMBALIK',
        referensiId,
        alasan,
        mutasiAsalId: targetMutasi.id,
        sudahDibalik: null,
        sisaDapatDibalik: null,
        dapatDibalik: false,
        aktorId: 1,
        waktu: now.toISOString(),
      }
      riwayatStokList.unshift(mutasiPembalik)

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Barang masuk pembalik tercatat',
          data: {
            mutasiId: newId,
            menuId: targetMutasi.menuId,
            stokSebelum,
            stokSesudah,
            hppSebelum: targetMutasi.hppSnapshot,
            hppSesudah: targetMutasi.hppSnapshot,
            jenis: 'BARANG_MASUK_PEMBALIK',
            waktu: now.toISOString(),
          },
        },
      }
    }

    if (url.includes('/api/stok/barang-masuk') && method === 'post') {
      const menuId = Number(payload.menuId)
      const qty = Number(payload.qty) || 0
      const hargaBeli = Number(payload.hargaBeliPerUnit) || 0
      const referensiId = String(
        payload.referensiId || `BM-${Date.now()}`
      ).trim()

      if (!menuId || qty <= 0) {
        return { status: 400, data: { message: 'Menu ID dan Qty harus valid' } }
      }

      const targetMenu = menuList.find((m) => m.id === menuId)
      if (!targetMenu) {
        return { status: 404, data: { message: 'Menu tidak ditemukan' } }
      }

      const stokSebelum = targetMenu.stok
      const stokSesudah = stokSebelum + qty
      targetMenu.stok = stokSesudah

      const now = new Date()
      const newId =
        riwayatStokList.length > 0
          ? Math.max(...riwayatStokList.map((r) => r.id)) + 1
          : 1
      const itemMasuk: MockRiwayatItem = {
        id: newId,
        menuId,
        menuNama: targetMenu.nama,
        arah: 'MASUK',
        jenis: 'BARANG_MASUK',
        qty,
        hargaBeliSatuan: hargaBeli,
        totalNilai: qty * hargaBeli,
        hppSnapshot: hargaBeli,
        stokSetelah: stokSesudah,
        referensiTipe: 'BARANG_MASUK',
        referensiId,
        alasan: null,
        mutasiAsalId: null,
        sudahDibalik: 0,
        sisaDapatDibalik: qty,
        dapatDibalik: true,
        aktorId: 1,
        waktu: now.toISOString(),
      }
      riwayatStokList.unshift(itemMasuk)

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Barang masuk tercatat',
          data: {
            mutasiId: newId,
            menuId,
            stokSebelum,
            stokSesudah,
            hppSebelum: Math.round(targetMenu.harga_jual * 0.7),
            hppSesudah: hargaBeli,
            jenis: 'BARANG_MASUK',
            waktu: now.toISOString(),
          },
        },
      }
    }

    if (url.includes('/api/stok/opname-batch') && method === 'post') {
      const referensiId = String(
        payload.referensiId || `OPN-${Date.now()}`
      ).trim()
      const items =
        (payload.items as Array<{
          menuId: number
          qtyFisik: number
          alasan: string
          rusak?: boolean
        }>) || []

      const hasilItems: Array<{
        menuId: number
        stokSebelum: number
        stokFisik: number
        selisih: number
        jenis: string | null
        mutasiId: number | null
        stokSetelah: number
      }> = []

      let jumlahBerubah = 0
      let jumlahTanpaSelisih = 0
      const now = new Date()

      for (const it of items) {
        const targetMenu = menuList.find((m) => m.id === Number(it.menuId))
        const stokSebelum = targetMenu ? targetMenu.stok : 0
        const stokFisik = Number(it.qtyFisik) || 0
        const selisih = stokFisik - stokSebelum

        if (selisih === 0) {
          jumlahTanpaSelisih++
          hasilItems.push({
            menuId: Number(it.menuId),
            stokSebelum,
            stokFisik,
            selisih: 0,
            jenis: null,
            mutasiId: null,
            stokSetelah: stokSebelum,
          })
          continue
        }

        jumlahBerubah++
        const jenis =
          selisih < 0
            ? it.rusak
              ? 'BARANG_RUSAK'
              : 'OPNAME_KELUAR'
            : 'OPNAME_MASUK'

        const arah = selisih > 0 ? 'MASUK' : 'KELUAR'
        const stokSetelah = stokFisik
        if (targetMenu) {
          targetMenu.stok = stokSetelah
        }

        const newId =
          riwayatStokList.length > 0
            ? Math.max(...riwayatStokList.map((r) => r.id)) + 1
            : 1

        const itemMutasi: MockRiwayatItem = {
          id: newId,
          menuId: Number(it.menuId),
          menuNama: targetMenu ? targetMenu.nama : `Menu #${it.menuId}`,
          arah,
          jenis,
          qty: Math.abs(selisih),
          hargaBeliSatuan: targetMenu
            ? targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)
            : 0,
          totalNilai:
            Math.abs(selisih) *
            (targetMenu
              ? targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)
              : 0),
          hppSnapshot: targetMenu
            ? targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)
            : 0,
          stokSetelah,
          referensiTipe: jenis,
          referensiId,
          alasan: it.alasan,
          mutasiAsalId: null,
          sudahDibalik: null,
          sisaDapatDibalik: null,
          dapatDibalik: false,
          aktorId: 1,
          waktu: now.toISOString(),
        }
        riwayatStokList.unshift(itemMutasi)

        hasilItems.push({
          menuId: Number(it.menuId),
          stokSebelum,
          stokFisik,
          selisih,
          jenis,
          mutasiId: newId,
          stokSetelah,
        })
      }

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Penyesuaian stok batch tercatat',
          data: {
            referensiId,
            jumlahBerubah,
            jumlahTanpaSelisih,
            items: hasilItems,
          },
        },
      }
    }

    if (
      url.includes('/api/stok/opname') &&
      !url.includes('/opname-batch') &&
      method === 'post'
    ) {
      const menuId = Number(payload.menuId)
      const qtyFisik = Number(payload.qtyFisik) || 0
      const alasan = String(payload.alasan || '').trim()
      const referensiId = String(
        payload.referensiId || `OPN-${Date.now()}`
      ).trim()

      const targetMenu = menuList.find((m) => m.id === menuId)
      const stokSebelum = targetMenu ? targetMenu.stok : 0
      const selisih = qtyFisik - stokSebelum

      if (targetMenu) {
        targetMenu.stok = qtyFisik
      }

      const jenis = selisih < 0 ? 'OPNAME_KELUAR' : 'OPNAME_MASUK'
      const arah = selisih > 0 ? 'MASUK' : 'KELUAR'
      const now = new Date()
      const newId =
        riwayatStokList.length > 0
          ? Math.max(...riwayatStokList.map((r) => r.id)) + 1
          : 1

      if (selisih !== 0) {
        const itemMutasi: MockRiwayatItem = {
          id: newId,
          menuId,
          menuNama: targetMenu ? targetMenu.nama : `Menu #${menuId}`,
          arah,
          jenis,
          qty: Math.abs(selisih),
          hargaBeliSatuan: targetMenu
            ? targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)
            : 0,
          totalNilai:
            Math.abs(selisih) *
            (targetMenu
              ? targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)
              : 0),
          hppSnapshot: targetMenu
            ? targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)
            : 0,
          stokSetelah: qtyFisik,
          referensiTipe: jenis,
          referensiId,
          alasan,
          mutasiAsalId: null,
          sudahDibalik: null,
          sisaDapatDibalik: null,
          dapatDibalik: false,
          aktorId: 1,
          waktu: now.toISOString(),
        }
        riwayatStokList.unshift(itemMutasi)
      }

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Penyesuaian stok tercatat',
          data: {
            mutasiId: newId,
            menuId,
            stokSebelum,
            stokSesudah: qtyFisik,
            hppSebelum: targetMenu
              ? targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)
              : 0,
            hppSesudah: targetMenu
              ? targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)
              : 0,
            jenis,
            waktu: now.toISOString(),
          },
        },
      }
    }

    if (url.includes('/api/stok/riwayat') && method === 'get') {
      const urlObj = new URL(url, 'http://localhost')
      const jenisParam = urlObj.searchParams.get('jenis')
      const menuIdParam = urlObj.searchParams.get('menuId')

      let filtered = [...riwayatStokList]
      if (jenisParam) {
        filtered = filtered.filter((r) => r.jenis === jenisParam)
      }
      if (menuIdParam) {
        filtered = filtered.filter((r) => r.menuId === Number(menuIdParam))
      }
      const dariParam = urlObj.searchParams.get('dari')
      const sampaiParam = urlObj.searchParams.get('sampai')
      if (dariParam) {
        const dariDate = new Date(dariParam).getTime()
        filtered = filtered.filter(
          (r) => new Date(r.waktu).getTime() >= dariDate
        )
      }
      if (sampaiParam) {
        const sampaiDate = new Date(sampaiParam).getTime()
        filtered = filtered.filter(
          (r) => new Date(r.waktu).getTime() <= sampaiDate
        )
      }

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Riwayat mutasi stok berhasil dimuat',
          data: {
            items: filtered,
            total: filtered.length,
            halaman: 0,
            ukuran: 50,
            totalHalaman: 1,
          },
        },
      }
    }

    if (url.includes('/api/stok/menipis') && method === 'get') {
      const menipisList = menuList
        .filter((m) => m.stok <= m.stok_minimum)
        .map((m) => ({
          menuId: m.id,
          stok: m.stok,
          stokMinimum: m.stok_minimum,
          hpp: m.hpp || Math.round(m.harga_jual * 0.7),
          nilaiPersediaan: m.stok * (m.hpp || Math.round(m.harga_jual * 0.7)),
          menipis: true,
        }))

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Daftar stok menipis',
          data: menipisList,
        },
      }
    }

    if (url.includes('/api/laporan/stok') && method === 'get') {
      const urlObj = new URL(url, 'http://localhost')
      const hanyaMenipis = urlObj.searchParams.get('hanyaMenipis') === 'true'

      let list = menuList.map((m) => {
        const hpp = m.hpp || Math.round(m.harga_jual * 0.7)
        const stok = m.stok
        const stokMin = m.stok_minimum || 0
        const menipis = stok <= stokMin
        return {
          menuId: m.id,
          nama: m.nama,
          namaMenu: m.nama,
          kategoriId: m.kategori_id,
          stok,
          stokBerjalan: stok,
          stokMinimum: stokMin,
          hpp,
          nilaiPersediaan: stok * hpp,
          menipis,
        }
      })

      if (hanyaMenipis) {
        list = list.filter((item) => item.menipis)
      }

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Laporan stok dan nilai persediaan berhasil dimuat',
          data: list,
        },
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LAPORAN REKONSILIASI HARIAN & INVARIANT (PRD §9.5, §5)
    // ─────────────────────────────────────────────────────────────
    if (url.includes('/api/laporan/rekonsiliasi') && method === 'get') {
      const urlObj = new URL(url, 'http://localhost')
      const simulasiSelisih =
        params?.simulasiSelisih === true ||
        params?.simulasiSelisih === 'true' ||
        params?.search === 'simulasiSelisih' ||
        urlObj.searchParams.get('simulasiSelisih') === 'true' ||
        urlObj.searchParams.get('search') === 'simulasiSelisih'

      const totalSaldoSiswa = siswaList.reduce((acc, s) => acc + (s.saldo || 0), 0)
      const totalSaldoKartuTamu = kartuTamuList.reduce((acc, k) => acc + (k.saldo || 0), 0)
      const saldoMengendap = totalSaldoSiswa + totalSaldoKartuTamu

      const penjualanBruto = 3420000
      const voidPenjualan = 45000
      const penjualanBersih = penjualanBruto - voidPenjualan // 3.375.000

      const refund = 150000
      // Invariant: Topup - Refund = Saldo Mengendap + Penjualan Bersih
      // Topup = Saldo Mengendap + Penjualan Bersih + Refund
      const topupTarget = saldoMengendap + penjualanBersih + refund
      const topupOnline = Math.round(topupTarget * 0.4)
      const topupTunai = topupTarget - topupOnline

      const topupBersih = topupOnline + topupTunai - refund
      const totalPenggunaan = saldoMengendap + penjualanBersih

      let selisih = topupBersih - totalPenggunaan
      if (simulasiSelisih) {
        selisih = 75000 // Simulasi selisih Rp 75.000 untuk pengujian banner merah
      }

      const totalKreditSemua = topupOnline + topupTunai + voidPenjualan
      const totalDebitSemua = penjualanBruto + refund

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Laporan rekonsiliasi berhasil dimuat',
          data: {
            dari: '2026-10-08T00:00:00+07:00',
            sampai: '2026-10-08T23:59:59+07:00',
            topupOnline,
            topupTunai,
            penjualan: penjualanBruto,
            voidPenjualan,
            penjualanBersih,
            koreksiMasuk: 15000,
            koreksiKeluar: 0,
            refund,
            transfer: 0,
            saldoMengendap,
            saldoSiswa: totalSaldoSiswa,
            saldoKartuTamu: totalSaldoKartuTamu,
            totalKreditSemua,
            totalDebitSemua,
            selisih,
            seimbang: selisih === 0,
            totalTopupSemua: topupOnline + topupTunai,
            totalRefundSemua: refund,
            topupBersih,
            totalPenggunaan,
          },
        },
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LAPORAN PENJUALAN & LABA KOTOR (PRD §9.5)
    // ─────────────────────────────────────────────────────────────
    if (url.includes('/api/laporan/penjualan/item') && method === 'get') {
      const barisItem = menuList.map((m, idx) => {
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

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Penjualan per item berhasil dimuat',
          data: barisItem,
        },
      }
    }

    if (url.includes('/api/laporan/penjualan/kategori') && method === 'get') {
      const barisKategori = kategoriList.map((k) => {
        const menusInKat = menuList.filter((m) => m.kategori_id === k.id)
        const qty = menusInKat.length * 30 || 20
        const totalJual = menusInKat.reduce(
          (acc, m) => acc + m.harga_jual * 30,
          0
        ) || 350000
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

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Penjualan per kategori berhasil dimuat',
          data: barisKategori,
        },
      }
    }

    if (url.includes('/api/laporan/penjualan/kasir') && method === 'get') {
      const barisKasir = titikKasirList.map((tk, idx) => {
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

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Penjualan per kasir berhasil dimuat',
          data: barisKasir,
        },
      }
    }

    if (url.includes('/api/laporan/penjualan') && method === 'get') {
      const penjualanBruto = 3420000
      const jumlahVoid = 3
      const nilaiVoid = 45000
      const penjualanBersih = 3375000
      const totalHpp = 2180000
      const labaKotor = penjualanBersih - totalHpp
      const marginLabaPersen = Math.round((labaKotor / penjualanBersih) * 1000) / 10

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Ringkasan penjualan berhasil dimuat',
          data: {
            dari: '2026-10-08T00:00:00+07:00',
            sampai: '2026-10-08T23:59:59+07:00',
            jumlahTransaksi: 185,
            penjualanBruto,
            jumlahVoid,
            nilaiVoid,
            penjualanBersih,
            totalHpp,
            labaKotor,
            marginLabaPersen,
          },
        },
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LAPORAN SALDO MENGENDAP & KEWAJIBAN SEKOLAH (PRD §9.5)
    // ─────────────────────────────────────────────────────────────
    if (url.includes('/api/laporan/saldo-mengendap/siswa') && method === 'get') {
      const listSiswa = siswaList.map((s) => ({
        siswaId: s.siswa_id,
        nis: s.nis,
        nisn: (s as unknown as { nisn?: string }).nisn || s.nis,
        nama: s.nama,
        kelas: s.kelas,
        saldo: s.saldo,
        belanjaHariIni: s.belanja_hari_ini,
        limitHarian: s.limit_harian,
        isBlocked: s.is_blocked,
        parentName: s.parent_name || 'Orang Tua Murid',
        parentPhone: s.parent_phone || '-',
        terakhirTransaksi: s.updated_at || '2026-10-08T11:00:00Z',
      }))

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Daftar saldo siswa berhasil dimuat',
          data: listSiswa,
        },
      }
    }

    if (url.includes('/api/laporan/saldo-mengendap/kartu-tamu') && method === 'get') {
      const listKartuTamu = kartuTamuList.map((k) => ({
        id: k.id,
        nomorKartu: k.nomor_kartu,
        uid: k.uid,
        labelPemegang: k.label_pemegang,
        saldo: k.saldo,
        status: k.status,
        createdAt: k.created_at,
      }))

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Daftar saldo kartu tamu berhasil dimuat',
          data: listKartuTamu,
        },
      }
    }

    if (url.includes('/api/laporan/saldo-mengendap') && method === 'get') {
      const saldoSiswa = siswaList.reduce((acc, s) => acc + (s.saldo || 0), 0)
      const saldoKartuTamu = kartuTamuList.reduce((acc, k) => acc + (k.saldo || 0), 0)

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Ringkasan saldo mengendap berhasil dimuat',
          data: {
            saldoSiswa,
            saldoKartuTamu,
            total: saldoSiswa + saldoKartuTamu,
            jumlahSiswa: siswaList.length,
            jumlahKartuTamu: kartuTamuList.length,
          },
        },
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LAPORAN RIWAYAT BELANJA PER SISWA (KOMPLAIN ORTU)
    // ─────────────────────────────────────────────────────────────
    const riwayatSiswaMatch = url.match(/\/api\/laporan\/siswa\/(\d+)\/riwayat/)
    if (riwayatSiswaMatch && method === 'get') {
      const sId = Number(riwayatSiswaMatch[1])
      const targetSiswa = siswaList.find((s) => s.siswa_id === sId) || siswaList[0]
      const riwayatList = MOCK_RIWAYAT_SISWA[sId] || [
        {
          id: `TRX-20261008-${sId}`,
          waktu: '2026-10-08T10:15:00Z',
          jenis: 'BELANJA' as const,
          arah: 'DEBIT' as const,
          nominal: 15000,
          saldo_setelah: targetSiswa.saldo,
          titik_kasir: 'Kasir 1 - Kantin Utama',
          petugas: 'Ahmad Kasir',
          referensi_id: `TRX-20261008-${sId}`,
          keterangan: 'Pembelian makan istirahat',
          items: [{ nama: 'Nasi Goreng Ayam', qty: 1, harga: 15000, subtotal: 15000 }],
        },
      ]

      const profil = {
        siswaId: targetSiswa.siswa_id,
        nis: targetSiswa.nis,
        nama: targetSiswa.nama,
        kelas: targetSiswa.kelas,
        fotoUrl: targetSiswa.foto_url,
        saldo: targetSiswa.saldo,
        belanjaHariIni: targetSiswa.belanja_hari_ini,
        limitHarian: targetSiswa.limit_harian,
        isBlocked: targetSiswa.is_blocked,
        parentName: targetSiswa.parent_name || 'Orang Tua Murid',
        parentPhone: targetSiswa.parent_phone || '-',
        catatanKontrol: targetSiswa.catatan_kontrol,
      }

      const formattedRiwayat = riwayatList.map((r) => ({
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
      }))

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Riwayat transaksi siswa berhasil dimuat',
          data: {
            profil,
            riwayat: formattedRiwayat,
          },
        },
      }
    }

    // ─────────────────────────────────────────────────────────────
    // LAPORAN KERUGIAN STOK (PRD §9.5)
    // ─────────────────────────────────────────────────────────────
    if (url.includes('/api/laporan/kerugian-stok/ringkasan') && method === 'get') {
      const totalKerugian = MOCK_KERUGIAN_STOK.reduce((acc, k) => acc + k.total_nilai, 0)
      const totalQtyHilang = MOCK_KERUGIAN_STOK.reduce((acc, k) => acc + k.qty, 0)

      const opnameItems = MOCK_KERUGIAN_STOK.filter((k) => k.jenis === 'OPNAME_KELUAR')
      const rusakItems = MOCK_KERUGIAN_STOK.filter((k) => k.jenis === 'BARANG_RUSAK')

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Ringkasan kerugian stok berhasil dimuat',
          data: {
            totalKerugian,
            totalQtyHilang,
            jumlahKejadian: MOCK_KERUGIAN_STOK.length,
            kerugianOpname: opnameItems.reduce((acc, k) => acc + k.total_nilai, 0),
            qtyOpname: opnameItems.reduce((acc, k) => acc + k.qty, 0),
            kerugianBarangRusak: rusakItems.reduce((acc, k) => acc + k.total_nilai, 0),
            qtyBarangRusak: rusakItems.reduce((acc, k) => acc + k.qty, 0),
          },
        },
      }
    }

    if (url.includes('/api/laporan/kerugian-stok') && method === 'get') {
      const listKerugian = MOCK_KERUGIAN_STOK.map((k) => ({
        id: k.id,
        waktu: k.waktu,
        menuId: k.menu_id,
        namaMenu: k.nama_menu,
        kategoriNama: k.kategori_nama,
        jenis: k.jenis,
        qty: k.qty,
        hppSnapshot: k.hpp_snapshot,
        totalNilai: k.total_nilai,
        alasan: k.alasan,
        beritaAcaraId: k.berita_acara_id,
        petugas: k.petugas,
      }))

      return {
        status: 200,
        data: {
          code: 200,
          responseCode: 200,
          status: 'SUCCESS',
          message: 'Daftar kerugian stok berhasil dimuat',
          data: listKerugian,
        },
      }
    }

    const stokMenuMatch = url.match(/\/api\/stok\/(\d+)$/)
    if (stokMenuMatch && method === 'get') {
      const menuId = Number(stokMenuMatch[1])
      const targetMenu = menuList.find((m) => m.id === menuId)
      if (targetMenu) {
        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            message: 'Data stok menu',
            data: {
              menuId: targetMenu.id,
              stok: targetMenu.stok,
              stokMinimum: targetMenu.stok_minimum,
              hpp: targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7),
              nilaiPersediaan:
                targetMenu.stok *
                (targetMenu.hpp || Math.round(targetMenu.harga_jual * 0.7)),
              menipis: targetMenu.stok <= targetMenu.stok_minimum,
            },
          },
        }
      }
    }

    // --- 9. Refund Saldo Siswa Keluar / Lulus (PRD §9.3) ---
    if (
      (url.includes('/api/v1/tu/siswa/nonaktif') ||
        url.includes('/api/saldo/refund/siswa-nonaktif')) &&
      method === 'get'
    ) {
      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Berhasil mengambil daftar siswa nonaktif',
          data: siswaNonaktifList,
        },
      }
    }

    // POST: Refund ke Orang Tua (Tunai / Transfer Bank)
    if (
      url.includes('/api/saldo/refund') &&
      !url.includes('/api/saldo/refund/siswa-nonaktif') &&
      method === 'post'
    ) {
      const siswaId = Number(
        payload.subjekId ?? payload.siswaId ?? payload.siswa_id
      )
      const metode = (payload.metode as string) || 'TUNAI'
      const namaPenerima = String(
        payload.namaPenerima || payload.nama_penerima || 'Orang Tua / Wali'
      )
      const kontakPenerima = String(
        payload.kontakPenerima || payload.kontak_penerima || ''
      )
      const bank = payload.bank ? String(payload.bank) : undefined
      const noRekening = payload.noRekening
        ? String(payload.noRekening)
        : undefined
      const namaRekening = payload.namaRekening
        ? String(payload.namaRekening)
        : undefined
      const buktiUrl = payload.buktiUrl ? String(payload.buktiUrl) : undefined
      const catatan = String(
        payload.catatan || 'Refund sisa saldo siswa keluar/lulus'
      )

      const target = siswaNonaktifList.find((s) => s.siswa_id === siswaId)
      if (!target) {
        return {
          status: 404,
          data: { message: 'Data siswa nonaktif tidak ditemukan' },
        }
      }

      if (target.saldo <= 0) {
        return {
          status: 400,
          data: { message: 'Siswa tidak memiliki sisa saldo (saldo Rp 0)' },
        }
      }

      const refNo = String(
        payload.referensiId || `REFUND-${Date.now().toString().slice(-6)}`
      )
      const now = new Date().toISOString()
      const nominalRefund = target.saldo

      // Mengosongkan saldo dan memblokir kartu fisik otomatis permanen
      target.saldo = 0
      target.is_card_blocked = true
      target.is_refunded = true
      target.refund_info = {
        tipe: 'REFUND_ORTU',
        metode: metode as 'TUNAI' | 'TRANSFER_BANK',
        nominal: nominalRefund,
        tanggal: now,
        referensi_id: refNo,
        keterangan: catatan,
        bank,
        nomor_rekening: noRekening,
        nama_rekening: namaRekening,
        bukti_url: buktiUrl,
      }

      // Sinkronkan ke daftar siswa aktif jika ada
      const activeMatch = siswaList.find(
        (s) => s.siswa_id === siswaId || s.uid === target.rfid_uid
      )
      if (activeMatch) {
        activeMatch.saldo = 0
        activeMatch.is_blocked = true
      }

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Refund sisa saldo berhasil diproses',
          data: {
            ref_no: refNo,
            siswa_id: target.siswa_id,
            nis: target.nis,
            nama: target.nama,
            kelas_terakhir: target.kelas_terakhir,
            nominal: nominalRefund,
            metode,
            nama_penerima: namaPenerima,
            kontak_penerima: kontakPenerima,
            bank,
            nomor_rekening: noRekening,
            nama_rekening: namaRekening,
            bukti_url: buktiUrl,
            status_kartu_lama: 'DIBLOKIR_PERMANEN',
            saldo_akhir: 0,
            waktu: now,
            petugas_nama: 'Wibisana Bama (Petugas TU/Bendahara)',
          },
        },
      }
    }

    // POST: Pindah Saldo ke Saudara Kandung (Atomik)
    if (
      (url.includes('/api/saldo/pindah-saldo') ||
        url.includes('/api/saldo/transfer-saudara')) &&
      method === 'post'
    ) {
      const siswaAsalId = Number(
        payload.siswaSumberId ??
          payload.siswaAsalId ??
          payload.siswa_asal_id ??
          payload.siswaId
      )
      const siswaTujuanId = Number(
        payload.siswaTujuanId ?? payload.siswa_tujuan_id
      )
      const beritaAcara = String(
        payload.catatan ||
          payload.beritaAcara ||
          payload.berita_acara ||
          'Pindah saldo ke saudara kandung'
      )

      const asal = siswaNonaktifList.find((s) => s.siswa_id === siswaAsalId)
      const tujuan = siswaList.find((s) => s.siswa_id === siswaTujuanId)

      if (!asal || !tujuan) {
        return {
          status: 404,
          data: {
            message: 'Data siswa asal atau siswa penerima tidak ditemukan',
          },
        }
      }

      if (asal.saldo <= 0) {
        return {
          status: 400,
          data: {
            message: 'Siswa asal tidak memiliki sisa saldo untuk dipindahkan',
          },
        }
      }

      if (tujuan.is_blocked) {
        return {
          status: 400,
          data: {
            message:
              'Kartu siswa tujuan sedang diblokir, tidak dapat menerima transfer',
          },
        }
      }

      const refNo = String(
        payload.referensiId || `TRF-SDR-${Date.now().toString().slice(-6)}`
      )
      const now = new Date().toISOString()
      const nominalTransfer = asal.saldo
      const saldoAwalTujuan = tujuan.saldo

      // Transaksi Atomik:
      // 1. Kosongkan saldo asal & blokir kartu lama permanen
      asal.saldo = 0
      asal.is_card_blocked = true
      asal.is_refunded = true
      asal.refund_info = {
        tipe: 'TRANSFER_SAUDARA',
        nominal: nominalTransfer,
        tanggal: now,
        referensi_id: refNo,
        keterangan: beritaAcara,
        saudara_tujuan_id: tujuan.siswa_id,
        saudara_tujuan_nama: tujuan.nama,
      }

      const asalInActiveList = siswaList.find((s) => s.siswa_id === siswaAsalId)
      if (asalInActiveList) {
        asalInActiveList.saldo = 0
        asalInActiveList.is_blocked = true
      }

      // 2. Tambahkan saldo ke saudara tujuan secara atomik
      tujuan.saldo += nominalTransfer

      return {
        status: 200,
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Pemindahan saldo ke saudara kandung berhasil secara atomik',
          data: {
            ref_no: refNo,
            siswa_asal: {
              siswa_id: asal.siswa_id,
              nis: asal.nis,
              nama: asal.nama,
              kelas_terakhir: asal.kelas_terakhir,
              status_kartu: 'DIBLOKIR_PERMANEN',
              saldo_akhir: 0,
            },
            siswa_tujuan: {
              siswa_id: tujuan.siswa_id,
              nis: tujuan.nis,
              nama: tujuan.nama,
              kelas: tujuan.kelas,
              saldo_awal: saldoAwalTujuan,
              saldo_akhir: tujuan.saldo,
              nominal_diterima: nominalTransfer,
            },
            nominal: nominalTransfer,
            berita_acara: beritaAcara,
            waktu: now,
            petugas_nama: 'Wibisana Bama (Petugas TU/Bendahara)',
          },
        },
      }
    }

    // --- 10. Kontrol Siswa atas Nama Orang Tua (PRD §9.6 Admin) ---
    if (url.includes('/api/v1/kontrol-siswa')) {
      const match = url.match(/\/kontrol-siswa\/(\d+)/)
      const targetId = match ? Number(match[1]) : null

      if (method === 'get') {
        if (targetId) {
          const s = siswaList.find((item) => item.siswa_id === targetId)
          if (!s)
            return { status: 404, data: { message: 'Siswa tidak ditemukan' } }
          return {
            status: 200,
            data: {
              code: 200,
              status: 'SUCCESS',
              data: s,
            },
          }
        }
        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            data: siswaList,
          },
        }
      }

      if (method === 'put' && targetId) {
        const s = siswaList.find((item) => item.siswa_id === targetId)
        if (!s)
          return { status: 404, data: { message: 'Siswa tidak ditemukan' } }

        if (payload.limit_harian !== undefined) {
          s.limit_harian = Number(payload.limit_harian) || 0
        }
        if (payload.limit_harian_enabled !== undefined) {
          s.limit_harian_enabled = Boolean(payload.limit_harian_enabled)
          if (!s.limit_harian_enabled) {
            s.limit_harian = 0
          }
        }
        if (
          payload.blocked_items !== undefined &&
          Array.isArray(payload.blocked_items)
        ) {
          s.blocked_items = payload.blocked_items.map((id) => Number(id))
        }
        if (
          payload.blocked_categories !== undefined &&
          Array.isArray(payload.blocked_categories)
        ) {
          s.blocked_categories = payload.blocked_categories.map((id) =>
            Number(id)
          )
        }
        if (payload.catatan_kontrol !== undefined) {
          s.catatan_kontrol = String(payload.catatan_kontrol)
        }
        s.updated_at = new Date().toISOString()

        return {
          status: 200,
          data: {
            code: 200,
            status: 'SUCCESS',
            message: 'Pengaturan kontrol siswa berhasil diperbarui',
            data: s,
          },
        }
      }
    }

    // --- 11. Pengaturan Operasional Kantin (PRD §9.1 & §10, issue #15 & #42) ---
    if (
      url.includes('/api/pengaturan-kantin/titik-kasir') ||
      url.includes('/api/titik-kasir')
    ) {
      const match = url.match(/(?:\/titik-kasir|\/titik-kasir\/)(\d+)/)
      const targetId = match ? Number(match[1]) : null

      // GET detail satu titik kasir
      if (method === 'get' && targetId) {
        const item = titikKasirList.find((t) => t.id === targetId)
        if (!item) {
          return { status: 404, data: { message: 'Titik kasir tidak ditemukan' } }
        }
        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            data: {
              id: item.id,
              nama: item.nama,
              kode: item.kode,
              aktif: item.aktif !== undefined ? item.aktif : item.is_active,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            },
          },
        }
      }

      // GET daftar titik kasir
      if (method === 'get') {
        const urlObj = new URL(url, 'http://localhost')
        const hanyaAktif =
          urlObj.searchParams.get('hanyaAktif') === 'true' ||
          urlObj.searchParams.get('aktif') === 'true'

        const filtered = hanyaAktif
          ? titikKasirList.filter((t) => t.is_active || t.aktif)
          : [...titikKasirList]

        const formatted = filtered.map((t) => ({
          id: t.id,
          nama: t.nama,
          kode: t.kode,
          aktif: t.aktif !== undefined ? t.aktif : t.is_active,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }))

        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            data: formatted,
          },
        }
      }

      // POST buat titik kasir baru
      if (method === 'post' && !targetId) {
        const p = (payload || {}) as Record<string, unknown>
        const nama = String(p.nama || '').trim()
        const kode = String(p.kode || '').trim().toUpperCase()
        const isActive =
          p.aktif !== undefined
            ? Boolean(p.aktif)
            : p.is_active !== undefined
              ? Boolean(p.is_active)
              : true

        if (!nama) {
          return {
            status: 400,
            data: { message: 'Nama titik kasir wajib diisi' },
          }
        }

        if (kode && titikKasirList.some((t) => t.kode.toUpperCase() === kode)) {
          return {
            status: 400,
            data: { message: `Kode perangkat "${kode}" sudah terdaftar` },
          }
        }

        const nextId =
          titikKasirList.length > 0
            ? Math.max(...titikKasirList.map((t) => t.id)) + 1
            : 1
        const nowIso = new Date().toISOString()

        const newItem: TitikKasirMock = {
          id: nextId,
          sekolah_id: 1,
          nama,
          kode: kode || `POS-${String(nextId).padStart(2, '0')}`,
          is_active: isActive,
          aktif: isActive,
          created_at: nowIso,
          updated_at: nowIso,
        }

        titikKasirList.push(newItem)

        return {
          status: 201,
          data: {
            code: 201,
            responseCode: 201,
            status: 'SUCCESS',
            message: 'Titik kasir dibuat',
            data: {
              id: newItem.id,
              nama: newItem.nama,
              kode: newItem.kode,
              aktif: newItem.aktif,
              createdAt: newItem.created_at,
              updatedAt: newItem.updated_at,
            },
          },
        }
      }

      // PATCH toggle status aktif/nonaktif
      if (
        (method === 'patch' || (method === 'put' && url.includes('/toggle'))) &&
        targetId
      ) {
        const p = (payload || {}) as Record<string, unknown>
        const item = titikKasirList.find((t) => t.id === targetId)
        if (!item) {
          return { status: 404, data: { message: 'Titik kasir tidak ditemukan' } }
        }

        const nextStatus =
          p.aktif !== undefined
            ? Boolean(p.aktif)
            : p.is_active !== undefined
              ? Boolean(p.is_active)
              : !item.aktif

        item.is_active = nextStatus
        item.aktif = nextStatus
        item.updated_at = new Date().toISOString()

        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            message: `Titik kasir "${item.nama}" diperbarui`,
            data: {
              id: item.id,
              nama: item.nama,
              kode: item.kode,
              aktif: item.aktif,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            },
          },
        }
      }

      // PUT ubah titik kasir
      if (method === 'put' && targetId) {
        const p = (payload || {}) as Record<string, unknown>
        const item = titikKasirList.find((t) => t.id === targetId)
        if (!item) {
          return { status: 404, data: { message: 'Titik kasir tidak ditemukan' } }
        }

        const kode = String(p.kode || item.kode).trim().toUpperCase()
        if (
          kode &&
          titikKasirList.some((t) => t.id !== targetId && t.kode.toUpperCase() === kode)
        ) {
          return {
            status: 400,
            data: { message: `Kode perangkat "${kode}" sudah digunakan titik kasir lain` },
          }
        }

        if (p.nama !== undefined) {
          item.nama = String(p.nama).trim()
        }
        item.kode = kode
        if (p.aktif !== undefined) {
          item.aktif = Boolean(p.aktif)
          item.is_active = Boolean(p.aktif)
        } else if (p.is_active !== undefined) {
          item.aktif = Boolean(p.is_active)
          item.is_active = Boolean(p.is_active)
        }
        item.updated_at = new Date().toISOString()

        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            message: 'Titik kasir diperbarui',
            data: {
              id: item.id,
              nama: item.nama,
              kode: item.kode,
              aktif: item.aktif,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            },
          },
        }
      }

      // DELETE nonaktifkan titik kasir (soft delete / hapus)
      if (method === 'delete' && targetId) {
        const idx = titikKasirList.findIndex((t) => t.id === targetId)
        if (idx === -1) {
          return { status: 404, data: { message: 'Titik kasir tidak ditemukan' } }
        }

        const target = titikKasirList[idx]
        target.is_active = false
        target.aktif = false
        target.updated_at = new Date().toISOString()

        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            message: `Titik kasir "${target.nama}" dinonaktifkan`,
            data: {
              id: target.id,
              nama: target.nama,
              kode: target.kode,
              aktif: false,
              createdAt: target.created_at,
              updatedAt: target.updated_at,
            },
          },
        }
      }
    }

    // --- 12. Pengaturan Operasional Kantin (PRD §9.1 & §10) ---
    if (
      url.includes('/api/pengaturan-kantin') ||
      url.includes('/api/pengaturan')
    ) {
      if (method === 'get') {
        const jamTutup =
          pengaturanKantin.jam_tutup_otomatis ||
          pengaturanKantin.jam_tutup_kasir ||
          '23:59:00'

        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            data: {
              sekolahId: 1,
              namaKantin: pengaturanKantin.nama_kantin,
              jamTutupOtomatis: jamTutup,
              konfirmasiManual: Boolean(pengaturanKantin.konfirmasi_manual),
              durasiFotoDetik: Number(pengaturanKantin.durasi_foto_detik) || 3,
              minTopup: Number(pengaturanKantin.min_topup) || 5000,
              maksTopup: Number(pengaturanKantin.max_topup) || 500000,
              batasSaldoSiswa: Number(pengaturanKantin.max_saldo_siswa) || 1000000,
              batasSaldoKartuTamu:
                Number(pengaturanKantin.max_saldo_kartu_tamu) || 500000,
              disimpan: true,
              updatedAt: pengaturanKantin.updated_at || new Date().toISOString(),
            },
          },
        }
      }

      if (method === 'put') {
        const p = (payload || {}) as Record<string, unknown>
        const namaKantin =
          p.namaKantin !== undefined
            ? String(p.namaKantin)
            : p.nama_kantin !== undefined
              ? String(p.nama_kantin)
              : String(pengaturanKantin.nama_kantin)

        const jamTutupRaw = String(
          p.jamTutupOtomatis ||
          p.jam_tutup_otomatis ||
          p.jamTutupKasir ||
          p.jam_tutup_kasir ||
          '23:59'
        )
        const jamTutupFormatted =
          jamTutupRaw.length === 5 ? `${jamTutupRaw}:00` : jamTutupRaw

        const konfirmasi =
          p.konfirmasiManual !== undefined
            ? Boolean(p.konfirmasiManual)
            : p.konfirmasi_manual !== undefined
              ? Boolean(p.konfirmasi_manual)
              : Boolean(pengaturanKantin.konfirmasi_manual)

        const durasiFoto =
          p.durasiFotoDetik !== undefined
            ? Number(p.durasiFotoDetik)
            : p.durasi_foto_detik !== undefined
              ? Number(p.durasi_foto_detik)
              : Number(pengaturanKantin.durasi_foto_detik)

        const minTopup =
          p.minTopup !== undefined
            ? Number(p.minTopup)
            : p.min_topup !== undefined
              ? Number(p.min_topup)
              : Number(pengaturanKantin.min_topup)

        const maksTopup =
          p.maksTopup !== undefined
            ? Number(p.maksTopup)
            : p.max_topup !== undefined
              ? Number(p.max_topup)
              : Number(pengaturanKantin.max_topup)

        const batasSaldoSiswa =
          p.batasSaldoSiswa !== undefined
            ? Number(p.batasSaldoSiswa)
            : p.max_saldo_siswa !== undefined
              ? Number(p.max_saldo_siswa)
              : Number(pengaturanKantin.max_saldo_siswa)

        const batasSaldoKartuTamu =
          p.batasSaldoKartuTamu !== undefined
            ? Number(p.batasSaldoKartuTamu)
            : p.max_saldo_kartu_tamu !== undefined
              ? Number(p.max_saldo_kartu_tamu)
              : Number(pengaturanKantin.max_saldo_kartu_tamu)

        const nowIso = new Date().toISOString()

        pengaturanKantin = {
          ...pengaturanKantin,
          nama_kantin: namaKantin,
          jam_tutup_kasir: jamTutupFormatted.substring(0, 5),
          jam_tutup_otomatis: jamTutupFormatted,
          konfirmasi_manual: konfirmasi,
          durasi_foto_detik: durasiFoto,
          min_topup: minTopup,
          max_topup: maksTopup,
          max_saldo_siswa: batasSaldoSiswa,
          max_saldo_kartu_tamu: batasSaldoKartuTamu,
          disimpan: true,
          updated_at: nowIso,
          updated_by: 'Admin Sekolah (Tervalidasi kantin-be)',
        }

        return {
          status: 200,
          data: {
            code: 200,
            responseCode: 200,
            status: 'SUCCESS',
            message: 'Pengaturan kantin diperbarui',
            data: {
              sekolahId: 1,
              namaKantin,
              jamTutupOtomatis: jamTutupFormatted,
              konfirmasiManual: konfirmasi,
              durasiFotoDetik: durasiFoto,
              minTopup,
              maksTopup,
              batasSaldoSiswa,
              batasSaldoKartuTamu,
              disimpan: true,
              updatedAt: nowIso,
            },
          },
        }
      }
    }

    return null
  }
}
