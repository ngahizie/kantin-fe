import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
import { LaporanKerugianStokPage } from '../LaporanKerugianStokPage'
import { useRoleStore } from '@/stores/useRoleStore'
import { useAuthStore } from '@/stores/auth-store'
import { Route } from '@/routes/_authenticated/laporan/kerugian-stok/index'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import { exportTableToExcel } from '@/lib/excelExport'
import { exportTableToPdf } from '@/lib/pdfExport'

vi.mock('@/lib/excelExport', () => ({
  exportTableToExcel: vi.fn(),
}))

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

    const screen = await render(<LaporanKerugianStokPage />)

    await expect.element(screen.getByText('Roti Bakar Cokelat')).toBeInTheDocument()

    // Cari input pencarian untuk memfilter hanya 1 item
    const searchInput = screen.getByPlaceholder(/Cari menu, alasan, BA\.\.\./i)
    await userEvent.fill(searchInput, 'Roti Bakar')

    // Klik tombol Ekspor -> Buka dropdown format
    const exportBtn = screen.getByRole('button', { name: /^Ekspor$/i })
    await userEvent.click(exportBtn)

    // Pilih Spreadsheet Excel
    const excelOption = screen.getByTestId('btn-export-excel-option')
    await userEvent.click(excelOption)

    expect(exportTableToExcel).toHaveBeenCalledTimes(1)
    const excelCallArg = vi.mocked(exportTableToExcel).mock.calls[0][0]
    expect(excelCallArg.data).toHaveLength(1)
    expect(excelCallArg.summaryRow?.qty).toBe(3)
    // Harus bernilai 15000 (total Roti Bakar saja), bukan 999999 atau 23000
    expect(excelCallArg.summaryRow?.totalNilai).toBe(15000)

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

  describe('SEC-04: Penegakan Otorisasi Route Guard dan Navigasi Sidebar', () => {
    it('mengizinkan peran pengelola, bendahara, tu, dan kepsek pada route guard beforeLoad', () => {
      const allowedRoles = ['pengelola', 'bendahara', 'tu', 'kepsek'] as const

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

    it('menolak peran selain yang diizinkan pada route guard beforeLoad dengan redirect /403', () => {
      const forbiddenRoles = ['admin', 'kasir', 'siswa', 'orang_tua'] as const

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

    it('memastikan navigasi sidebar kerugian stok mengizinkan peran tu', () => {
      const kerugianItem = sidebarData.navGroups
        .flatMap((g) => g.items)
        .flatMap((item) => (item.items ? item.items : [item]))
        .find((item) => item.url === '/laporan/kerugian-stok')

      expect(kerugianItem).toBeDefined()
      expect(kerugianItem?.roles).toContain('tu')
      expect(kerugianItem?.roles).toEqual(['pengelola', 'bendahara', 'tu', 'kepsek'])
    })
  })
})
