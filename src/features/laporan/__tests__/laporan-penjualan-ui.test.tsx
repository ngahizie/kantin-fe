import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import apiClient from '@/lib/api-client'
import { LaporanLabaKotorPage } from '../LaporanLabaKotorPage'
import { LaporanPenjualanPage } from '../LaporanPenjualanPage'

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div>Theme</div>,
}))

const BE_SUMMARY = {
  dari: '2026-10-08T00:00:00+07:00',
  sampai: '2026-10-08T23:59:59+07:00',
  jumlahTransaksi: 6,
  penjualanBruto: 145000,
  jumlahRefund: 1,
  nilaiRefund: 12000,
  penjualanBersih: 145000,
  totalModal: 70000,
  laba: 75000,
  marginPersen: 51.72,
}

const BE_ITEMS = [
  {
    kunciId: 10,
    nama: 'Nasi Goreng Spesial',
    qty: 5,
    total: 75000,
    hargaSatuan: 15000,
    modal: 35000,
    marginPersen: 53.33,
  },
  {
    kunciId: 11,
    nama: 'Es Teh Tawar',
    qty: 10,
    total: 70000,
    hargaSatuan: 7000,
    modal: 35000,
    marginPersen: 50,
  },
]

const BE_CATEGORIES = [
  {
    kunciId: 2,
    nama: 'Makanan Berat',
    qty: 5,
    total: 75000,
    hargaSatuan: null,
    modal: 35000,
    marginPersen: 53.33,
  },
]

const BE_KASIRS = [
  {
    titikKasirId: 1,
    namaTitikKasir: 'Kasir Utama',
    petugas: null,
    jumlahTransaksi: 6,
    penjualanBruto: 157000,
    nilaiVoid: 12000,
    penjualanBersih: 145000,
  },
]

describe('Laporan Penjualan & Laba Kotor UI vs Kontrak BE #291', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('merender LaporanLabaKotorPage secara akurat dari field BE #291 meski /katalog 403 dan mendukung filter pencarian', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/laporan/penjualan') {
        return { data: { code: 200, status: 'SUCCESS', data: BE_SUMMARY } }
      }
      if (url === '/api/laporan/penjualan/item') {
        return { data: { code: 200, status: 'SUCCESS', data: BE_ITEMS } }
      }
      if (url.startsWith('/api/katalog/')) {
        throw Object.assign(new Error('Forbidden'), { response: { status: 403 } })
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const screen = await render(<LaporanLabaKotorPage />)

    await expect.element(screen.getByText('51.72%')).toBeInTheDocument()
    await expect.element(screen.getByText(/70\.000/).first()).toBeInTheDocument()
    await expect.element(screen.getByText(/75\.000/).first()).toBeInTheDocument()
    await expect
      .element(screen.getByRole('cell', { name: 'Nasi Goreng Spesial' }))
      .toBeInTheDocument()
    await expect.element(screen.getByText('53.33%')).toBeInTheDocument()

    const bodyText = screen.container.textContent || ''
    expect(bodyText).not.toMatch(/undefined/i)
    expect(bodyText).not.toMatch(/\bNaN\b/)

    // Cari tanpa error walaupun kategoriNama tidak dikirim oleh BE #291
    const searchInput = screen.getByPlaceholder('Cari menu / kategori...')
    await userEvent.fill(searchInput, 'nasi')

    await expect
      .element(screen.getByRole('cell', { name: 'Nasi Goreng Spesial' }))
      .toBeInTheDocument()
    await expect.element(screen.getByText('Es Teh Tawar')).not.toBeInTheDocument()
  })

  it('merender LaporanPenjualanPage lengkap dengan perkayaan katalog & safe filter pada semua tab', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/laporan/penjualan') {
        return { data: { code: 200, status: 'SUCCESS', data: BE_SUMMARY } }
      }
      if (url === '/api/laporan/penjualan/item') {
        return { data: { code: 200, status: 'SUCCESS', data: BE_ITEMS } }
      }
      if (url === '/api/laporan/penjualan/kategori') {
        return { data: { code: 200, status: 'SUCCESS', data: BE_CATEGORIES } }
      }
      if (url === '/api/laporan/penjualan/kasir') {
        return { data: { code: 200, status: 'SUCCESS', data: BE_KASIRS } }
      }
      if (url === '/api/katalog/kategori') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: [{ id: 2, nama: 'Makanan Berat' }],
          },
        }
      }
      if (url === '/api/katalog/menu') {
        return {
          data: {
            code: 200,
            status: 'SUCCESS',
            data: [
              { id: 10, kategoriId: 2, nama: 'Nasi Goreng Spesial' },
              { id: 12, kategoriId: 2, nama: 'Ayam Bakar' },
            ],
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    const screen = await render(<LaporanPenjualanPage />)

    await expect.element(screen.getByText('Margin: 51.72%')).toBeInTheDocument()
    await expect.element(screen.getByText('1 transaksi di-refund')).toBeInTheDocument()
    await expect.element(screen.getByText('Nasi Goreng Spesial')).toBeInTheDocument()
    await expect.element(screen.getByText('Makanan Berat')).toBeInTheDocument()

    const initialText = screen.container.textContent || ''
    expect(initialText).not.toMatch(/undefined/i)
    expect(initialText).not.toMatch(/\bNaN\b/)

    // Tab Per Kategori (menampilkan perkayaan jumlah menu dari /api/katalog/menu)
    await userEvent.click(screen.getByRole('tab', { name: /Per Kategori/i }))
    await expect.element(screen.getByText('2 menu')).toBeInTheDocument()

    // Tab Per Titik Kasir (petugas null tidak crash saat pencarian)
    await userEvent.click(screen.getByRole('tab', { name: /Per Titik Kasir/i }))
    await expect.element(screen.getByText('Kasir Utama')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholder('Cari data laporan...')
    await userEvent.fill(searchInput, 'utama')
    await expect.element(screen.getByText('Kasir Utama')).toBeInTheDocument()
  })
})
