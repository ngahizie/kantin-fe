import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { Route } from '@/routes/_authenticated/laporan/keuntungan/index'
import { LaporanLabaKotorPage } from '../laporan-laba-kotor-page'
import { sanitizeFormulaCell } from '@/lib/excelExport'

const { mockExportExcel, mockExportPdf } = vi.hoisted(() => ({
  mockExportExcel: vi.fn(),
  mockExportPdf: vi.fn(),
}))

vi.mock('@/lib/excelExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/excelExport')>()
  return {
    ...actual,
    exportTableToExcel: (options: unknown) => {
      mockExportExcel(options)
      return { filename: 'test.xlsx' }
    },
  }
})

vi.mock('@/lib/pdfExport', () => ({
  exportTableToPdf: (options: unknown) => {
    mockExportPdf(options)
    return { doc: {}, filename: 'test.pdf', buffer: new ArrayBuffer(0) }
  },
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/layout/header-actions', () => ({
  HeaderBreadcrumb: () => <div>Breadcrumb</div>,
  HeaderActions: () => <div>HeaderActions</div>,
}))

const MOCK_SUMMARY = {
  dari: '2026-11-20T00:00:00+07:00',
  sampai: '2026-11-20T23:59:59+07:00',
  jumlahTransaksi: 12,
  penjualanBruto: 300000,
  penjualanBersih: 300000,
  totalModal: 180000,
  laba: 120000,
  marginPersen: 40.0,
}

const MOCK_ITEMS = [
  {
    menuId: 101,
    nama: '=1+1 Dangerous Formula',
    kategoriNama: '@SpecialKategori',
    qty: 10,
    hargaSatuan: 20000,
    hpp: 12000,
    total: 200000,
    modal: 120000,
    laba: 80000,
    marginPersen: 40.0,
  },
  {
    menuId: 102,
    nama: 'Ayam Geprek Sambal Matah',
    kategoriNama: 'Makanan Berat',
    qty: 5,
    hargaSatuan: 20000,
    hpp: 12000,
    total: 100000,
    modal: 60000,
    laba: 40000,
    marginPersen: 40.0,
  },
]

describe('Audit Keamanan & Fungsional Laporan Keuntungan (/laporan/keuntungan)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    mockExportExcel.mockClear()
    mockExportPdf.mockClear()
  })

  describe('LABA-01: Penegakan Otorisasi Route Guard Role (PRD §9.5)', () => {
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
  })

  describe('LABA-02: Date Range Filter & Integrasi Parameter API', () => {
    it('memuat data dengan parameter tanggal awal dan mendukung filter tanggal dinamis', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
        if (url === '/api/laporan/penjualan') {
          return { data: { code: 200, status: 'SUCCESS', data: MOCK_SUMMARY } }
        }
        if (url === '/api/laporan/penjualan/item') {
          return { data: { code: 200, status: 'SUCCESS', data: MOCK_ITEMS } }
        }
        if (url.startsWith('/api/katalog/')) {
          return { data: { code: 200, status: 'SUCCESS', data: [] } }
        }
        throw new Error(`Unexpected GET ${url}`)
      })

      const screen = await render(<LaporanLabaKotorPage />)

      // Verifikasi komponen Date Filter terpasang di antarmuka
      await expect.element(screen.getByRole('button', { name: /Hari ini/i })).toBeInTheDocument()

      // Verifikasi pemanggilan API menyertakan rentang tanggal (default TODAY mengirim tanggal)
      expect(getSpy).toHaveBeenCalledWith(
        '/api/laporan/penjualan',
        expect.objectContaining({
          params: expect.objectContaining({
            tanggal: expect.any(String),
          }),
        })
      )
      expect(getSpy).toHaveBeenCalledWith(
        '/api/laporan/penjualan/item',
        expect.objectContaining({
          params: expect.objectContaining({
            tanggal: expect.any(String),
          }),
        })
      )

      // Verifikasi ringkasan kartu laba kotor terisi akurat
      await expect.element(screen.getByText('40%').first()).toBeInTheDocument()
      await expect.element(screen.getByText(/120\.000/).first()).toBeInTheDocument()
      await expect.element(screen.getByText(/180\.000/).first()).toBeInTheDocument()
    })
  })

  describe('LABA-03: Formula Injection Protection (CWE-1236)', () => {
    it('melakukan sanitasi pada nilai string yang diawali karakter formula (=, +, -, @, \\t, \\r)', () => {
      expect(sanitizeFormulaCell('=1+1')).toBe("'=1+1")
      expect(sanitizeFormulaCell('+cmd|/C')).toBe("'+cmd|/C")
      expect(sanitizeFormulaCell('-20%')).toBe("'-20%")
      expect(sanitizeFormulaCell('@Special')).toBe("'@Special")
      expect(sanitizeFormulaCell('\talert(1)')).toBe("'\talert(1)")
      expect(sanitizeFormulaCell('\rcalc')).toBe("'\rcalc")
      expect(sanitizeFormulaCell('   =trailing')).toBe("'=trailing")
      expect(sanitizeFormulaCell('Nasi Goreng')).toBe('Nasi Goreng')
      expect(sanitizeFormulaCell(null)).toBe('-')
      expect(sanitizeFormulaCell(undefined)).toBe('-')
      expect(sanitizeFormulaCell('')).toBe('-')
      expect(sanitizeFormulaCell('   ')).toBe('-')
    })

    it('mengirimkan data tersanitasi ke exportTableToExcel dan exportTableToPdf', async () => {
      vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
        if (url === '/api/laporan/penjualan') {
          return { data: { code: 200, status: 'SUCCESS', data: MOCK_SUMMARY } }
        }
        if (url === '/api/laporan/penjualan/item') {
          return { data: { code: 200, status: 'SUCCESS', data: MOCK_ITEMS } }
        }
        if (url.startsWith('/api/katalog/')) {
          return { data: { code: 200, status: 'SUCCESS', data: [] } }
        }
        throw new Error(`Unexpected GET ${url}`)
      })

      const screen = await render(<LaporanLabaKotorPage />)

      // Buka dialog ekspor
      const exportBtn = screen.getByRole('button', { name: /Ekspor/i })
      await expect.element(exportBtn).toBeInTheDocument()
      await userEvent.click(exportBtn)

      // Klik opsi Excel
      const excelOption = screen.getByTestId('btn-export-excel-option')
      await expect.element(excelOption).toBeInTheDocument()
      await userEvent.click(excelOption)

      expect(mockExportExcel).toHaveBeenCalledTimes(1)
      const excelCall = mockExportExcel.mock.calls[0][0] as {
        metadata: Record<string, unknown>
        data: Array<{ nama: string; kategoriNama: string }>
      }
      expect(excelCall.metadata).toHaveProperty('Periode')
      expect(excelCall.data[0].nama).toBe("'=1+1 Dangerous Formula")
      expect(excelCall.data[0].kategoriNama).toBe("'@SpecialKategori")
      expect(excelCall.data[1].nama).toBe('Ayam Geprek Sambal Matah')

      // Buka kembali dialog ekspor untuk PDF
      await userEvent.click(exportBtn)
      const pdfOption = screen.getByTestId('btn-export-pdf-option')
      await expect.element(pdfOption).toBeInTheDocument()
      await userEvent.click(pdfOption)

      expect(mockExportPdf).toHaveBeenCalledTimes(1)
      const pdfCall = mockExportPdf.mock.calls[0][0] as {
        metadata: Record<string, unknown>
        data: Array<{ nama: string; kategoriNama: string }>
      }
      expect(pdfCall.metadata).toHaveProperty('Periode')
      expect(pdfCall.data[0].nama).toBe("'=1+1 Dangerous Formula")
    })
  })

  describe('LABA-04: Boundary & Non-Negative Checks', () => {
    it('menangani data anomalik dengan pembatas non-negatif tanpa crash atau NaN', async () => {
      const ANOMALY_SUMMARY = {
        jumlahTransaksi: 0,
        penjualanBersih: 0,
        totalModal: 0,
        laba: 0,
        marginPersen: 0,
      }

      const ANOMALY_ITEMS = [
        {
          menuId: 999,
          nama: 'Item Anomali Negatif',
          kategoriNama: 'Lainnya',
          qty: 0,
          hargaSatuan: null,
          hpp: null,
          total: -5000,
          modal: -2000,
          laba: null,
          marginPersen: null,
        },
      ]

      vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
        if (url === '/api/laporan/penjualan') {
          return { data: { code: 200, status: 'SUCCESS', data: ANOMALY_SUMMARY } }
        }
        if (url === '/api/laporan/penjualan/item') {
          return { data: { code: 200, status: 'SUCCESS', data: ANOMALY_ITEMS } }
        }
        return { data: { code: 200, status: 'SUCCESS', data: [] } }
      })

      const screen = await render(<LaporanLabaKotorPage />)

      const bodyText = screen.container.textContent || ''
      expect(bodyText).not.toMatch(/undefined/i)
      expect(bodyText).not.toMatch(/\bNaN\b/)
    })
  })
})
