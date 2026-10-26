import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { BarangMasukPage } from '../BarangMasukPage'
import { stokApi } from '../api/stok-api'
import { katalogApi } from '@/features/katalog/api/katalog-api'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      user: {
        userId: '1',
        nama: 'Pengelola Test',
        email: 'pengelola@test.com',
        currentRole: 'pengelola',
        roles: ['pengelola'],
      },
    },
  }),
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../components/BarangMasukForm', () => ({
  BarangMasukForm: () => <div>Form Barang Masuk</div>,
}))

vi.mock('../components/RiwayatStokTable', () => ({
  RiwayatStokTable: () => <div>Tabel Riwayat</div>,
}))

describe('BarangMasukPage — Indikator Peringatan Stok Menipis', () => {
  beforeEach(() => {
    vi.spyOn(stokApi, 'getRiwayatStok').mockResolvedValue({
      items: [],
      total: 0,
      halaman: 0,
      ukuran: 20,
      totalHalaman: 0,
    })
  })

  it('menampilkan "Semua Aman" dengan warna hijau (emerald) dan BUKAN merah saat tidak ada stok menipis', async () => {
    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([
      {
        id: 1,
        nama: 'Nasi Goreng',
        kategoriId: 1,
        hargaJual: 15000,
        stokBerjalan: 20,
        satuan: 'Porsi',
        isActive: true,
      },
    ] as any)

    vi.spyOn(stokApi, 'getStokMenipis').mockResolvedValue([])

    const screen = await render(<BarangMasukPage />)

    const amanHeading = screen.getByText('Semua Aman')
    await expect.element(amanHeading).toBeInTheDocument()

    // Verifikasi kelas warna hijau emerald dan tidak mengandung class destructive
    const element = amanHeading.element()
    expect(element.className).toContain('text-emerald-600')
    expect(element.className).not.toContain('text-destructive')
  })

  it('menampilkan jumlah menu dan warna peringatan saat ada stok menipis', async () => {
    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue([
      { id: 1, nama: 'Menu 1', hargaJual: 10000, stokBerjalan: 2, satuan: 'Pcs' },
      { id: 2, nama: 'Menu 2', hargaJual: 10000, stokBerjalan: 10, satuan: 'Pcs' },
    ] as any)

    vi.spyOn(stokApi, 'getStokMenipis').mockResolvedValue([
      {
        menuId: 1,
        stok: 2,
        stokMinimum: 5,
        hpp: 8000,
        nilaiPersediaan: 16000,
        menipis: true,
      },
    ])

    const screen = await render(<BarangMasukPage />)

    const menipisHeading = screen.getByText('1 Menu')
    await expect.element(menipisHeading).toBeInTheDocument()

    // Verifikasi elemen induk h3 menggunakan warna peringatan amber
    const element = menipisHeading.element().parentElement!
    expect(element.className).toContain('text-amber-600')
    expect(element.className).not.toContain('text-emerald-600')
  })
})
