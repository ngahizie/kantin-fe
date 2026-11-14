import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { MenuDetailPage } from '../MenuDetailPage'
import { katalogApi } from '../api/katalog-api'
import { stokApi } from '../../stok/api/stok-api'
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
    vi.spyOn(stokApi, 'getRiwayatStok').mockResolvedValue({
      items: [],
      total: 0,
      halaman: 0,
      ukuran: 50,
      totalHalaman: 0,
    })
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
    await expect
      .element(screen.getByRole('button', { name: /Ubah Menu/i }))
      .toBeDisabled()
    await expect
      .element(screen.getByRole('button', { name: /Coba lagi/i }))
      .not.toBeInTheDocument()
  })

  it('membuang data menu lama saat pindah /menu/4 ke /menu/5', async () => {
    const menuLima: MenuItem = {
      ...menuContoh,
      id: 5,
      nama: 'Teh Botol',
      hargaJual: 5000,
    }
    let selesaikanLima: (m: MenuItem) => void = () => {}
    const tundaLima = new Promise<MenuItem>((resolve) => {
      selesaikanLima = resolve
    })
    vi.spyOn(katalogApi, 'getMenuDetail').mockImplementation(
      (id: number) => (id === 5 ? tundaLima : Promise.resolve(menuContoh))
    )

    const screen = await renderHalaman()
    await expect.element(screen.getByText('Air Mineral')).toBeInTheDocument()

    // Pindah rute di sisi klien; respons menu 5 belum datang.
    route.menuId = '5'
    await screen.rerender(
      <SidebarProvider>
        <MenuDetailPage />
      </SidebarProvider>
    )

    // State lama harus sudah dibuang (komponen dipasang ulang lewat key).
    await expect
      .element(screen.getByText('Air Mineral'))
      .not.toBeInTheDocument()

    selesaikanLima(menuLima)
    await expect.element(screen.getByText('Teh Botol')).toBeInTheDocument()
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
