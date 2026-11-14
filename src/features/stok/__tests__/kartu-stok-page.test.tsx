import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { KartuStokPage } from '../KartuStokPage'
import { stokApi } from '../api/stok-api'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import type { MenuItem } from '@/features/katalog/types'

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({ menuId: '1' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: React.ReactNode }) => (
    <header>{children}</header>
  ),
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div>Theme</div>,
}))

describe('KartuStokPage — Tampilan Total Masuk & Total Keluar tanpa +/-', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('menampilkan angka Total Masuk/Total Keluar dan kolom Masuk/Keluar tanpa awalan + atau -', async () => {
    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValueOnce([
      {
        id: 1,
        nama: 'Nasi Goreng Spesial',
        kategoriId: 1,
        hargaJual: 15000,
        stokBerjalan: 15,
        stokMinimum: 5,
        satuan: 'Porsi',
        aktif: true,
      },
    ] as unknown as MenuItem[])

    vi.spyOn(stokApi, 'getStokMenu').mockResolvedValueOnce({
      menuId: 1,
      stok: 15,
      stokMinimum: 5,
      hpp: 10000,
      nilaiPersediaan: 150000,
      menipis: false,
    })

    vi.spyOn(stokApi, 'getRiwayatStok').mockResolvedValueOnce({
      items: [
        {
          id: 101,
          menuId: 1,
          menuNama: 'Nasi Goreng Spesial',
          arah: 'MASUK',
          jenis: 'BARANG_MASUK',
          qty: 50,
          stokSetelah: 50,
          referensiId: 'BM-20261112-001',
          dapatDibalik: true,
          waktu: '2026-11-12T07:00:00+07:00',
        },
        {
          id: 102,
          menuId: 1,
          menuNama: 'Nasi Goreng Spesial',
          arah: 'KELUAR',
          jenis: 'PENJUALAN',
          qty: 35,
          stokSetelah: 15,
          referensiId: 'TRX-20261112-001',
          dapatDibalik: false,
          waktu: '2026-11-12T08:00:00+07:00',
        },
      ],
      total: 2,
      halaman: 0,
      ukuran: 200,
      totalHalaman: 1,
    })

    const screen = await render(<KartuStokPage />)

    await expect.element(screen.getByText('BM-20261112-001')).toBeInTheDocument()

    // KPI Cards Total Masuk & Total Keluar harus bersih tanpa tanda +/-
    const totalMasukHeading = screen.getByText('Total Masuk').element().nextElementSibling
    const totalKeluarHeading = screen.getByText('Total Keluar').element().nextElementSibling
    expect(totalMasukHeading?.textContent?.trim()).toBe('50')
    expect(totalKeluarHeading?.textContent?.trim()).toBe('35')
    await expect
      .element(screen.getByText('+50', { exact: true }))
      .not.toBeInTheDocument()
    await expect
      .element(screen.getByText('-35', { exact: true }))
      .not.toBeInTheDocument()

    // Kolom terpisah Masuk & Keluar pada tabel juga tidak memakai +/-
    const rows = Array.from(screen.container.querySelectorAll('tbody tr'))
    expect(rows).toHaveLength(2)
    expect(rows[0]?.children[3]?.textContent?.trim()).toBe('Nasi Goreng Spesial')
    expect(rows[0]?.children[5]?.textContent?.trim()).toBe('50')
    expect(rows[0]?.children[6]?.textContent?.trim()).toBe('-')
    expect(rows[1]?.children[3]?.textContent?.trim()).toBe('Nasi Goreng Spesial')
    expect(rows[1]?.children[5]?.textContent?.trim()).toBe('-')
    expect(rows[1]?.children[6]?.textContent?.trim()).toBe('35')
  })
})
