import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
import { LaporanKerugianStokPage } from '../LaporanKerugianStokPage'
import { useRoleStore } from '@/stores/useRoleStore'

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
})
