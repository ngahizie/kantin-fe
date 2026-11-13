import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { MenuDetailModal } from '../MenuDetailModal'
import { katalogApi } from '../api/katalog-api'
import type { MenuItem } from '../types'

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

describe('MenuDetailModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue([
      { id: 2, nama: 'Minuman', aktif: true },
    ] as never)
  })

  it('menampilkan nama, harga, kategori, dan stok dari endpoint detail', async () => {
    const spy = vi
      .spyOn(katalogApi, 'getMenuDetail')
      .mockResolvedValue(menuContoh)

    const screen = await render(
      <MenuDetailModal
        open={true}
        onOpenChange={() => {}}
        menuId={4}
      />
    )

    await expect.element(screen.getByText('Air Mineral')).toBeInTheDocument()
    await expect.element(screen.getByText('Rp 4.000')).toBeInTheDocument()
    await expect.element(screen.getByText('Minuman')).toBeInTheDocument()
    await expect.element(screen.getByText('14')).toBeInTheDocument()
    await expect.element(screen.getByText('AKTIF')).toBeInTheDocument()

    // Memakai endpoint detail, bukan mengambil dari daftar.
    expect(spy).toHaveBeenCalledWith(4)
  })

  it('menyelaraskan warna background root saat modal terbuka agar tidak ada celah di sisi scrollbar', async () => {
    vi.spyOn(katalogApi, 'getMenuDetail').mockResolvedValue(menuContoh)

    await render(
      <MenuDetailModal
        open={true}
        onOpenChange={() => {}}
        menuId={4}
      />
    )

    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement
    expect(overlay).not.toBeNull()
    expect(overlay.classList.contains('w-screen')).toBe(true)
  })

  it('memberi pesan ramah saat menu tidak ditemukan (404)', async () => {
    vi.spyOn(katalogApi, 'getMenuDetail').mockRejectedValue({
      response: { status: 404 },
    })

    const screen = await render(
      <MenuDetailModal
        open={true}
        onOpenChange={() => {}}
        menuId={4}
      />
    )

    await expect
      .element(screen.getByText(/Menu dengan nomor ini tidak ditemukan/i))
      .toBeInTheDocument()
    await expect
      .element(screen.getByRole('button', { name: /Coba lagi/i }))
      .toBeInTheDocument()
  })

  it('tidak memanggil API saat modal tertutup atau menuId tidak valid', async () => {
    const spy = vi.spyOn(katalogApi, 'getMenuDetail')

    await render(
      <MenuDetailModal
        open={false}
        onOpenChange={() => {}}
        menuId={4}
      />
    )

    expect(spy).not.toHaveBeenCalled()
  })

  it('membuang data menu lama saat ganti menuId', async () => {
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

    const screen = await render(
      <MenuDetailModal
        open={true}
        onOpenChange={() => {}}
        menuId={4}
      />
    )
    await expect.element(screen.getByText('Air Mineral')).toBeInTheDocument()

    await screen.rerender(
      <MenuDetailModal
        open={true}
        onOpenChange={() => {}}
        menuId={5}
      />
    )

    await expect
      .element(screen.getByText('Air Mineral'))
      .not.toBeInTheDocument()

    selesaikanLima(menuLima)
    await expect.element(screen.getByText('Teh Botol')).toBeInTheDocument()
  })

  it('mengubah path foto relatif menjadi URL storage', async () => {
    vi.spyOn(katalogApi, 'getMenuDetail').mockResolvedValue({
      ...menuContoh,
      fotoUrl: 'menu/4.jpg',
    })

    const screen = await render(
      <MenuDetailModal
        open={true}
        onOpenChange={() => {}}
        menuId={4}
      />
    )

    await expect.element(screen.getByText('Air Mineral')).toBeInTheDocument()
    const gambar = document.querySelector('img')
    expect(gambar?.getAttribute('src')).toContain(
      `/api/storage/file?path=${encodeURIComponent('menu/4.jpg')}`
    )
  })

  it('memanggil onEdit saat tombol Ubah Menu diklik', async () => {
    vi.spyOn(katalogApi, 'getMenuDetail').mockResolvedValue(menuContoh)
    const onEditSpy = vi.fn()
    const onOpenChangeSpy = vi.fn()

    const screen = await render(
      <MenuDetailModal
        open={true}
        onOpenChange={onOpenChangeSpy}
        menuId={4}
        onEdit={onEditSpy}
      />
    )

    await expect.element(screen.getByText('Air Mineral')).toBeInTheDocument()
    const tombolUbah = screen.getByRole('button', { name: /Ubah Menu/i })
    await userEvent.click(tombolUbah)

    expect(onOpenChangeSpy).toHaveBeenCalledWith(false)
    expect(onEditSpy).toHaveBeenCalledWith(menuContoh)
  })
})
