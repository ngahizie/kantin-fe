import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { MenuDetailPage } from '../MenuDetailPage'
import { katalogApi } from '../api/katalog-api'
import type { MenuItem } from '../types'

// Halaman ini membaca `menuId` dari route param; nilainya dipatok per tes.
const route = vi.hoisted(() => ({ menuId: '4' }))

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ menuId: route.menuId }),
  useNavigate: () => vi.fn(),
}))

const menuContoh: MenuItem = {
  id: 4,
  kategoriId: 2,
  nama: 'Air Mineral',
  hargaJual: 4000,
  satuan: 'BOTOL',
  fotoUrl: null,
  stokMinimum: 10,
  stokBerjalan: 14,
  aktif: true,
}

const renderHalaman = () =>
  render(
    <SidebarProvider>
      <MenuDetailPage />
    </SidebarProvider>
  )

describe('MenuDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    route.menuId = '4'
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([
      { id: 2, nama: 'Minuman', aktif: true },
    ] as never)
  })

  it('menampilkan nama, harga, kategori, dan stok dari endpoint detail', async () => {
    const spy = vi
      .spyOn(katalogApi, 'getMenuDetail')
      .mockResolvedValue(menuContoh)

    const screen = await renderHalaman()

    await expect.element(screen.getByText('Air Mineral')).toBeInTheDocument()
    await expect.element(screen.getByText('Rp 4.000')).toBeInTheDocument()
    await expect.element(screen.getByText('Minuman')).toBeInTheDocument()
    await expect.element(screen.getByText('14')).toBeInTheDocument()
    await expect.element(screen.getByText('AKTIF')).toBeInTheDocument()

    // Memakai endpoint detail, bukan mengambil dari daftar.
    expect(spy).toHaveBeenCalledWith(4)
  })

  it('memberi pesan ramah saat menu tidak ditemukan (404)', async () => {
    vi.spyOn(katalogApi, 'getMenuDetail').mockRejectedValue({
      response: { status: 404 },
    })

    const screen = await renderHalaman()

    await expect
      .element(screen.getByText(/Menu dengan nomor ini tidak ditemukan/i))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('Kembali ke daftar'))
      .toBeInTheDocument()
  })

  it('tidak memanggil API saat nomor menu bukan angka', async () => {
    route.menuId = 'abc'
    const spy = vi.spyOn(katalogApi, 'getMenuDetail')

    const screen = await renderHalaman()

    await expect.element(screen.getByText(/tidak valid/i)).toBeInTheDocument()
    // Tidak menembak GET /api/katalog/menu/NaN
    expect(spy).not.toHaveBeenCalled()
  })

  it('menampilkan peringatan dan menahan tombol Ubah saat kategori gagal dimuat', async () => {
    vi.spyOn(katalogApi, 'getMenuDetail').mockResolvedValue(menuContoh)
    vi.spyOn(katalogApi, 'getKategoriList').mockRejectedValue(
      new Error('jaringan putus')
    )

    const screen = await renderHalaman()

    await expect
      .element(screen.getByText(/Daftar kategori gagal dimuat/i))
      .toBeInTheDocument()

    const tombolUbah = screen.getByRole('button', { name: /Ubah Menu/i })
    await expect.element(tombolUbah).toBeDisabled()
  })

  it('mengubah path foto relatif menjadi URL storage', async () => {
    vi.spyOn(katalogApi, 'getMenuDetail').mockResolvedValue({
      ...menuContoh,
      fotoUrl: 'menu/4.jpg',
    })

    const screen = await renderHalaman()

    await expect.element(screen.getByText('Air Mineral')).toBeInTheDocument()
    const gambar = document.querySelector('img')
    expect(gambar?.getAttribute('src')).toContain(
      `/api/storage/file?path=${encodeURIComponent('menu/4.jpg')}`
    )
  })
})
