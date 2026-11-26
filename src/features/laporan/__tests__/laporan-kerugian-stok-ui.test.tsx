import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
import { laporanApi } from '../api/laporan-api'
import { LaporanKerugianStokPage } from '../laporan-kerugian-stok-page'
import { useRoleStore } from '@/stores/use-role-store'
import { useAuthStore } from '@/stores/auth-store'
import { Route } from '@/routes/_authenticated/laporan/kerugian-stok/index'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { exportTableToPdf } from '@/lib/pdfExport'

vi.mock('@/lib/pdfExport', () => ({
  exportTableToPdf: vi.fn(),
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/layout/header-actions', () => ({
  HeaderBreadcrumb: ({ section, title }: { section?: string; title: string }) => (
    <div>{section} &gt; {title}</div>
  ),
  HeaderActions: () => <div>Actions</div>,
}))

const MOCK_KERUGIAN_LIST = [
  {
    id: 1,
    waktu: '2026-11-23T08:00:00+07:00',
    menuId: 10,
    namaMenu: 'Roti Bakar Cokelat',
    kategoriNama: 'Snack',
    jenis: 'BARANG_RUSAK',
    qty: 3,
    hppSnapshot: 5000,
    totalNilai: 15000,
    alasan: 'Kadaluarsa / berjamur',
    beritaAcaraId: 'BA-RSK-001',
    petugas: 'Budi Santoso',
  },
  {
    id: 2,
    waktu: '2026-11-23T09:30:00+07:00',
    menuId: 12,
    namaMenu: 'Susu Kotak UHT',
    kategoriNama: 'Minuman Dingin',
    jenis: 'OPNAME_KELUAR',
    qty: 2,
    hppSnapshot: 4000,
    totalNilai: 8000,
    alasan: 'Selisih opname fisik minus',
    beritaAcaraId: 'BA-OPN-002',
    petugas: 'Siti Aminah',
  },
]

const MOCK_RINGKASAN = {
  totalKerugian: 23000,
  totalQtyHilang: 5,
  jumlahKejadian: 2,
  kerugianOpname: 8000,
  qtyOpname: 2,
  kerugianBarangRusak: 15000,
  qtyBarangRusak: 3,
}

describe('LaporanKerugianStokPage UI & Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useRoleStore.getState().setRole('pengelola')
  })

  it('merender data kerugian stok dan kartu ringkasan secara akurat', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/laporan/kerugian-stok') {
        return { data: { code: 200, status: 'SUCCESS', data: MOCK_KERUGIAN_LIST } }
      }
      if (url === '/api/laporan/kerugian-stok/ringkasan') {
        return { data: { code: 200, status: 'SUCCESS', data: MOCK_RINGKASAN } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const screen = await render(<LaporanKerugianStokPage />)

    await expect.element(screen.getByText('Laporan Kerugian Stok')).toBeInTheDocument()
    await expect.element(screen.getByText('Roti Bakar Cokelat')).toBeInTheDocument()
    await expect.element(screen.getByText('Susu Kotak UHT')).toBeInTheDocument()
    await expect.element(screen.getByText('BA-RSK-001')).toBeInTheDocument()
    await expect.element(screen.getByText('BA-OPN-002')).toBeInTheDocument()
    await expect.element(screen.getByText('Total (2 Item)')).toBeInTheDocument()
  })

  it('menampilkan banner peringatan dan tombol coba lagi saat server gagal merespons (SEC-01)', async () => {
    let attempts = 0
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      attempts++
      if (attempts <= 2) {
        throw new Error('500 Internal Server Error: Database failure')
      }
      if (url === '/api/laporan/kerugian-stok') {
        return { data: { code: 200, status: 'SUCCESS', data: MOCK_KERUGIAN_LIST } }
      }
      if (url === '/api/laporan/kerugian-stok/ringkasan') {
        return { data: { code: 200, status: 'SUCCESS', data: MOCK_RINGKASAN } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const screen = await render(<LaporanKerugianStokPage />)

    await expect.element(screen.getByText('Gagal Memuat Data Kerugian Stok', { exact: true })).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /Coba Lagi/i })
    await expect.element(retryBtn).toBeInTheDocument()

    // Klik coba lagi untuk memulihkan data
    await userEvent.click(retryBtn)

    await expect.element(screen.getByText('Roti Bakar Cokelat')).toBeInTheDocument()
  })

  it('menghitung totalNilai summaryRow ekspor sesuai subset baris filteredList (SEC-02)', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/laporan/kerugian-stok') {
        return { data: { code: 200, status: 'SUCCESS', data: MOCK_KERUGIAN_LIST } }
      }
      if (url === '/api/laporan/kerugian-stok/ringkasan') {
        // Anggap ringkasan global bernilai 999999 untuk menguji bahwa ekspor tidak memakai angka global ini untuk baris ringkasan tabel
        return { data: { code: 200, status: 'SUCCESS', data: { ...MOCK_RINGKASAN, totalKerugian: 999999 } } }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const eksporSpy = vi
      .spyOn(laporanApi, 'eksporExcel')
      .mockResolvedValue('Laporan_KERUGIAN_STOK.xlsx')

    const screen = await render(<LaporanKerugianStokPage />)

    await expect.element(screen.getByText('Roti Bakar Cokelat')).toBeInTheDocument()

    // Cari input pencarian untuk memfilter hanya 1 item
    const searchInput = screen.getByPlaceholder(/Cari menu, alasan, BA\.\.\./i)
    await userEvent.fill(searchInput, 'Roti Bakar')

    // Klik tombol Ekspor -> Buka dropdown format
    const exportBtn = screen.getByRole('button', { name: /^Ekspor$/i })
    await userEvent.click(exportBtn)

    // Pilih Spreadsheet Excel -> memanggil ekspor resmi backend (/api/laporan/ekspor)
    const excelOption = screen.getByTestId('btn-export-excel-option')
    await userEvent.click(excelOption)

    expect(eksporSpy).toHaveBeenCalledTimes(1)
    expect(eksporSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'KERUGIAN_STOK' })
    )

    // Buka kembali dropdown format untuk PDF
    await userEvent.click(exportBtn)
    const pdfOption = screen.getByTestId('btn-export-pdf-option')
    await userEvent.click(pdfOption)

    expect(exportTableToPdf).toHaveBeenCalledTimes(1)
    const pdfCallArg = vi.mocked(exportTableToPdf).mock.calls[0][0]
    expect(pdfCallArg.data).toHaveLength(1)
    expect(pdfCallArg.summaryRow?.qty).toBe('3 Unit')
    expect(pdfCallArg.summaryRow?.totalNilai).toContain('15.000')
  })

  describe('SEC-04: Penegakan Otorisasi Route Guard dan Navigasi Sidebar (PRD §9.5)', () => {
    it('mengizinkan peran pengelola, bendahara, dan kepsek pada route guard beforeLoad', () => {
      const allowedRoles = ['pengelola', 'bendahara', 'kepsek'] as const

      for (const role of allowedRoles) {
        useAuthStore.getState().auth.setUser({
          userId: 1,
          nama: 'User ' + role,
          email: `${role}@kantin.id`,
          sekolahId: 1,
          sekolahNama: 'SMA 1',
          roles: [role],
          currentRole: role,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => (Route.options as any).beforeLoad()).not.toThrow()
      }
    })

    it('menolak peran admin, tu, kasir, siswa, dan orang_tua pada route guard beforeLoad dengan redirect /403', () => {
      const forbiddenRoles = ['admin', 'tu', 'kasir', 'siswa', 'orang_tua'] as const

      for (const role of forbiddenRoles) {
        useAuthStore.getState().auth.setUser({
          userId: 2,
          nama: 'User ' + role,
          email: `${role}@kantin.id`,
          sekolahId: 1,
          sekolahNama: 'SMA 1',
          roles: [role],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentRole: role as any,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => (Route.options as any).beforeLoad()).toThrow()
      }
    })

    it('memastikan navigasi sidebar kerugian stok hanya untuk pengelola, bendahara, dan kepsek', () => {
      const kerugianItem = sidebarData.navGroups
        .flatMap((g) => g.items)
        .flatMap((item) => (item.items ? item.items : [item]))
        .find((item) => item.url === '/laporan/kerugian-stok')

      expect(kerugianItem).toBeDefined()
      expect(kerugianItem?.roles).not.toContain('tu')
      expect(kerugianItem?.roles).toEqual(['pengelola', 'bendahara', 'kepsek'])
    })
  })

  describe('SEC-03 (#198): Paginasi Kerugian Stok, Batas Ukuran & Subtotal Periode Penuh', () => {
    const PAGINATED_ROWS = [
      {
        id: 101,
        waktu: '2026-11-23T12:00:00+07:00',
        menuId: 1,
        namaMenu: 'Item Alpha',
        kategoriNama: 'Makanan',
        jenis: 'BARANG_RUSAK' as const,
        qty: 1,
        hppSnapshot: 5000,
        totalNilai: 5000,
        alasan: 'Basi',
        beritaAcaraId: 'BA-101',
        petugas: 'Petugas A',
      },
      {
        id: 102,
        waktu: '2026-11-23T11:00:00+07:00',
        menuId: 2,
        namaMenu: 'Item Beta',
        kategoriNama: 'Makanan',
        jenis: 'OPNAME_KELUAR' as const,
        qty: 2,
        hppSnapshot: 5000,
        totalNilai: 10000,
        alasan: 'Selisih fisik',
        beritaAcaraId: 'BA-102',
        petugas: 'Petugas B',
      },
      {
        id: 103,
        waktu: '2026-11-23T10:00:00+07:00',
        menuId: 3,
        namaMenu: 'Item Gamma',
        kategoriNama: 'Minuman',
        jenis: 'BARANG_RUSAK' as const,
        qty: 3,
        hppSnapshot: 5000,
        totalNilai: 15000,
        alasan: 'Kemasan bocor',
        beritaAcaraId: 'BA-103',
        petugas: 'Petugas C',
      },
      {
        id: 104,
        waktu: '2026-11-23T09:00:00+07:00',
        menuId: 4,
        namaMenu: 'Item Delta',
        kategoriNama: 'Snack',
        jenis: 'OPNAME_KELUAR' as const,
        qty: 4,
        hppSnapshot: 5000,
        totalNilai: 20000,
        alasan: 'Selisih opname',
        beritaAcaraId: 'BA-104',
        petugas: 'Petugas D',
      },
      {
        id: 105,
        waktu: '2026-11-23T08:00:00+07:00',
        menuId: 5,
        namaMenu: 'Item Epsilon',
        kategoriNama: 'Snack',
        jenis: 'BARANG_RUSAK' as const,
        qty: 5,
        hppSnapshot: 5000,
        totalNilai: 25000,
        alasan: 'Kadaluarsa',
        beritaAcaraId: 'BA-105',
        petugas: 'Petugas E',
      },
    ]

    const PAGINATED_RINGKASAN = {
      totalKerugian: 75000,
      totalQtyHilang: 15,
      jumlahKejadian: 5,
      kerugianOpname: 30000,
      qtyOpname: 6,
      kerugianBarangRusak: 45000,
      qtyBarangRusak: 9,
    }

    beforeEach(() => {
      vi.mocked(exportTableToPdf).mockClear()
    })

    it('mengirim parameter halaman/ukuran, menavigasi halaman, dan menjaga subtotal footer + ekspor sesuai periode penuh', async () => {
      const requestedParams: Array<Record<string, unknown>> = []

      vi.spyOn(apiClient, 'get').mockImplementation(async (url: string, config?: { params?: unknown }) => {
        if (url === '/api/laporan/kerugian-stok') {
          const params = (config?.params as Record<string, unknown> | undefined) ?? {}
          requestedParams.push(params)
          const halaman = Number(params.halaman ?? 0)
          const ukuran = Number(params.ukuran ?? 200)
          const start = halaman * ukuran
          const slice = PAGINATED_ROWS.slice(start, start + ukuran)
          const total = PAGINATED_ROWS.length
          return {
            data: {
              code: 200,
              status: 'SUCCESS',
              data: slice,
              total,
              showing: slice.length,
              totalPages: Math.ceil(total / ukuran),
              currentPage: halaman,
            },
          }
        }
        if (url === '/api/laporan/kerugian-stok/ringkasan') {
          return { data: { code: 200, status: 'SUCCESS', data: PAGINATED_RINGKASAN } }
        }
        throw new Error(`Unexpected GET ${url}`)
      })

      const screen = await render(<LaporanKerugianStokPage pageSize={2} />)

      // Halaman 1: hanya 2 baris pertama, tapi footer tetap total periode penuh (5 item, 15 qty, Rp 75.000)
      await expect.element(screen.getByText('Item Alpha')).toBeInTheDocument()
      await expect.element(screen.getByText('Item Beta')).toBeInTheDocument()
      await expect.element(screen.getByText('Item Gamma')).not.toBeInTheDocument()
      await expect.element(screen.getByText('Menampilkan 1–2 dari 5 kejadian')).toBeInTheDocument()
      await expect.element(screen.getByText('Halaman 1 dari 3')).toBeInTheDocument()
      await expect.element(screen.getByText('Total (5 Item)')).toBeInTheDocument()
      await expect.element(screen.getByRole('cell', { name: /Rp\s*75\.000/i })).toBeInTheDocument()

      expect(requestedParams[0]).toMatchObject({ halaman: 0, ukuran: 2 })

      // Navigasi ke halaman 2 dan halaman 3, lalu kembali ke halaman 2
      const nextBtn = screen.getByRole('button', { name: /Selanjutnya/i })
      const prevBtn = screen.getByRole('button', { name: /Sebelumnya/i })

      await userEvent.click(nextBtn)
      await expect.element(screen.getByText('Item Gamma')).toBeInTheDocument()
      await expect.element(screen.getByText('Item Delta')).toBeInTheDocument()
      await expect.element(screen.getByText('Menampilkan 3–4 dari 5 kejadian')).toBeInTheDocument()
      await expect.element(screen.getByText('Halaman 2 dari 3')).toBeInTheDocument()

      await userEvent.click(nextBtn)
      await expect.element(screen.getByText('Item Epsilon')).toBeInTheDocument()
      await expect.element(screen.getByText('Menampilkan 5–5 dari 5 kejadian')).toBeInTheDocument()
      await expect.element(screen.getByText('Halaman 3 dari 3')).toBeInTheDocument()

      await userEvent.click(prevBtn)
      await expect.element(screen.getByText('Item Gamma')).toBeInTheDocument()
      await expect.element(screen.getByText('Halaman 2 dari 3')).toBeInTheDocument()

      // Ekspor Excel menggunakan jalur resmi backend (eksporExcel), sedangkan PDF merender seluruh periode
      const eksporSpy = vi
        .spyOn(laporanApi, 'eksporExcel')
        .mockResolvedValue('Laporan_KERUGIAN_STOK.xlsx')
      const exportBtn = screen.getByRole('button', { name: /^Ekspor$/i })
      await userEvent.click(exportBtn)
      await userEvent.click(screen.getByTestId('btn-export-excel-option'))

      await vi.waitFor(() => {
        expect(eksporSpy).toHaveBeenCalledTimes(1)
      })
      expect(eksporSpy).toHaveBeenCalledWith(
        expect.objectContaining({ jenis: 'KERUGIAN_STOK' })
      )

      await userEvent.click(exportBtn)
      await userEvent.click(screen.getByTestId('btn-export-pdf-option'))

      await vi.waitFor(() => {
        expect(exportTableToPdf).toHaveBeenCalledTimes(1)
      })
      const pdfCallArg = vi.mocked(exportTableToPdf).mock.calls[0][0]
      expect(pdfCallArg.data).toHaveLength(5)
      expect(pdfCallArg.summaryRow?.qty).toBe('15 Unit')
      expect(pdfCallArg.summaryRow?.totalNilai).toContain('75.000')

      // Pastikan tidak pernah mengirim ukuran > 200
      expect(requestedParams.every((p) => Number(p.ukuran) <= 200)).toBe(true)
    })

    it('menjepit ukuran halaman maksimal 200 dan halaman minimal 0 agar tidak ditolak backend', async () => {
      const requestedParams: Array<Record<string, unknown>> = []

      vi.spyOn(apiClient, 'get').mockImplementation(async (url: string, config?: { params?: unknown }) => {
        if (url === '/api/laporan/kerugian-stok') {
          const params = (config?.params as Record<string, unknown> | undefined) ?? {}
          requestedParams.push(params)
          return {
            data: {
              code: 200,
              status: 'SUCCESS',
              data: MOCK_KERUGIAN_LIST,
              total: 2,
              showing: 2,
              totalPages: 1,
              currentPage: 0,
            },
          }
        }
        if (url === '/api/laporan/kerugian-stok/ringkasan') {
          return { data: { code: 200, status: 'SUCCESS', data: MOCK_RINGKASAN } }
        }
        throw new Error(`Unexpected GET ${url}`)
      })

      const screen = await render(<LaporanKerugianStokPage pageSize={500} />)
      await expect.element(screen.getByText('Roti Bakar Cokelat')).toBeInTheDocument()

      await laporanApi.getKerugianStokHalaman({ halaman: -4, ukuran: 999 })

      expect(requestedParams[0]).toMatchObject({ halaman: 0, ukuran: 200 })
      expect(requestedParams[1]).toMatchObject({ halaman: 0, ukuran: 200 })
    })
  })
})
