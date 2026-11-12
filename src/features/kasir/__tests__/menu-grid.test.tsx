import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import '@/styles/index.css'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import type { KategoriItem, MenuItem } from '@/features/katalog/types'
import { DEFAULT_PENGATURAN_KANTIN } from '@/features/pengaturan/types'
import { pengaturanApi } from '@/features/pengaturan/api/pengaturan-api'
import { kasirApi } from '../api/kasir-api'
import { MenuGrid } from '../components/MenuGrid'
import { KasirPosPage } from '../KasirPosPage'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'

const sampleKategoris: KategoriItem[] = [
  { id: 1, nama: 'Makanan', urutan: 1, aktif: true },
  { id: 2, nama: 'Minuman', urutan: 2, aktif: true },
  { id: 3, nama: 'Alat Tulis', urutan: 3, aktif: true },
]

const sampleMenus: MenuItem[] = [
  {
    id: 1,
    kategoriId: 1,
    nama: 'Ayam Geprek',
    hargaJual: 13000,
    satuan: 'PORSI',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 20,
    aktif: true,
  },
  {
    id: 2,
    kategoriId: 1,
    nama: 'Mie Ayam',
    hargaJual: 10000,
    satuan: 'PORSI',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 15,
    aktif: true,
  },
  {
    id: 3,
    kategoriId: 1,
    nama: 'Nasi Goreng',
    hargaJual: 12000,
    satuan: 'PORSI',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 12,
    aktif: true,
  },
  {
    id: 4,
    kategoriId: 1,
    nama: 'Nasi Kuning',
    hargaJual: 11000,
    satuan: 'PORSI',
    fotoUrl: null,
    stokMinimum: 5,
    stokBerjalan: 10,
    aktif: true,
  },
  {
    id: 5,
    kategoriId: 2,
    nama: 'Es Teh Manis',
    hargaJual: 3000,
    satuan: 'PCS',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 30,
    aktif: true,
  },
  {
    id: 6,
    kategoriId: 2,
    nama: 'Jus Alpukat Mentega Spesial Susu Cokelat Ekstra',
    hargaJual: 150000,
    satuan: 'BUNGKUS BESAR',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 10,
    aktif: true,
  },
  {
    id: 7,
    kategoriId: 2,
    nama: 'Air Mineral',
    hargaJual: 4000,
    satuan: 'BOTOL',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 25,
    aktif: true,
  },
  {
    id: 8,
    kategoriId: 3,
    nama: 'Pulpen',
    hargaJual: 3500,
    satuan: 'PCS',
    fotoUrl: null,
    stokMinimum: 5,
    stokBerjalan: 40,
    aktif: true,
  },
  {
    id: 9,
    kategoriId: 1,
    nama: 'Soto Ayam',
    hargaJual: 14000,
    satuan: 'PORSI',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 10,
    aktif: true,
  },
  {
    id: 10,
    kategoriId: 1,
    nama: 'Bakso Urat',
    hargaJual: 15000,
    satuan: 'PORSI',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 8,
    aktif: true,
  },
  {
    id: 11,
    kategoriId: 1,
    nama: 'Nasi Uduk',
    hargaJual: 10000,
    satuan: 'PORSI',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 12,
    aktif: true,
  },
  {
    id: 12,
    kategoriId: 1,
    nama: 'Tempe Mendoan',
    hargaJual: 2000,
    satuan: 'PCS',
    fotoUrl: TINY_PNG,
    stokMinimum: 5,
    stokBerjalan: 20,
    aktif: true,
  },
]

const measureCardRects = () => {
  const cards = Array.from(
    document.querySelectorAll('[data-slot="card"]')
  ) as HTMLElement[]
  return cards.map((card) => {
    const rect = card.getBoundingClientRect()
    return {
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    }
  })
}

describe('MenuGrid & MenuItemCard konsistensi ukuran kartu', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('menjaga lebar dan tinggi kartu seragam meskipun judul 1 baris vs 2 baris, gambar vs fallback, atau satuan panjang', async () => {
    await page.viewport(1280, 800)

    const screen = await render(
      <div className='w-[960px] overflow-y-auto [scrollbar-gutter:stable]'>
        <MenuGrid
          menus={sampleMenus}
          getCartQty={() => 0}
          onAddToCart={vi.fn()}
        />
      </div>
    )

    const initialRects = measureCardRects()
    expect(initialRects).toHaveLength(sampleMenus.length)
    const baseline = initialRects[0]
    for (const rect of initialRects) {
      expect(rect.width).toBeCloseTo(baseline.width, 0)
      expect(rect.height).toBeCloseTo(baseline.height, 0)
    }

    const cardEls = Array.from(
      document.querySelectorAll('[data-slot="card"]')
    ) as HTMLElement[]
    for (const card of cardEls) {
      expect(getComputedStyle(card).borderRadius).toBe('14px')
    }

    // Berpindah ke subkumpulan hanya 1 item berjudul pendek: ukurannya harus tetap sama persis
    await screen.rerender(
      <div className='w-[960px] overflow-y-auto [scrollbar-gutter:stable]'>
        <MenuGrid
          menus={[sampleMenus[7]]}
          getCartQty={() => 0}
          onAddToCart={vi.fn()}
        />
      </div>
    )

    const singleRects = measureCardRects()
    expect(singleRects).toHaveLength(1)
    expect(singleRects[0].width).toBeCloseTo(baseline.width, 0)
    expect(singleRects[0].height).toBeCloseTo(baseline.height, 0)
  })

  it('menjaga footer tidak terlipat 2 baris di layar sempit mobile 2 kolom', async () => {
    await page.viewport(390, 844)

    await render(
      <div className='w-[375px]'>
        <MenuGrid
          menus={[sampleMenus[0], sampleMenus[5], sampleMenus[7]]}
          getCartQty={() => 0}
          onAddToCart={vi.fn()}
        />
      </div>
    )

    const mobileRects = measureCardRects()
    expect(mobileRects).toHaveLength(3)
    for (const rect of mobileRects) {
      expect(rect.width).toBeCloseTo(mobileRects[0].width, 0)
      expect(rect.height).toBeCloseTo(mobileRects[0].height, 0)
    }
  })

  it('menerapkan scrollbar-gutter: stable dan mempertahankan dimensi kartu yang sama saat berganti kategori di KasirPosPage', async () => {
    await page.viewport(1440, 900)

    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue(sampleMenus)
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue(sampleKategoris)
    vi.spyOn(pengaturanApi, 'getPengaturan').mockResolvedValue({
      ...DEFAULT_PENGATURAN_KANTIN,
      namaKantin: 'Kantin Uji',
      durasiFotoDetik: 15,
      updatedAt: '2026-11-11T00:00:00Z',
      updatedBy: 'Admin',
    })
    vi.spyOn(pengaturanApi, 'getTitikKasirList').mockResolvedValue([
      {
        id: 1,
        sekolahId: 1,
        nama: 'Kasir Utama',
        kode: 'KSR-01',
        aktif: true,
        createdAt: '2026-11-11T00:00:00Z',
        updatedAt: '2026-11-11T00:00:00Z',
      },
    ])
    vi.spyOn(kasirApi, 'getSesiAktif').mockResolvedValue({
      id: 99,
      titikKasirId: 1,
      titikKasirNama: 'Kasir Utama',
      tanggal: '2026-11-11',
      status: 'TERBUKA',
      totalBruto: 0,
      totalVoid: 0,
      totalBersih: 0,
      totalTransaksi: 0,
      dibukaAt: '2026-11-11T07:00:00Z',
    })
    vi.spyOn(kasirApi, 'getRekapSesi').mockResolvedValue({
      sesiKasirId: 99,
      jumlahTransaksi: 0,
      jumlahVoid: 0,
      totalBruto: 0,
      totalVoid: 0,
      totalBersih: 0,
    })
    vi.spyOn(kasirApi, 'getRiwayatTransaksiSesi').mockResolvedValue([])

    const screen = await render(
      <div className='h-[700px] w-full'>
        <KasirPosPage />
      </div>
    )

    await expect.element(screen.getByText('Ayam Geprek')).toBeInTheDocument()

    const scrollArea = document.querySelector(
      '.overflow-y-auto.\\[scrollbar-gutter\\:stable\\]'
    ) as HTMLElement | null
    expect(scrollArea).not.toBeNull()
    expect(getComputedStyle(scrollArea!).scrollbarGutter).toBe('stable')

    const allCategoryRects = measureCardRects()
    expect(allCategoryRects.length).toBe(sampleMenus.length)
    const refWidth = allCategoryRects[0].width
    const refHeight = allCategoryRects[0].height

    // Pindah ke kategori Minuman (3 item termasuk judul 2 baris)
    await userEvent.click(screen.getByRole('button', { name: /^Minuman/i }))
    await expect.element(screen.getByText('Es Teh Manis')).toBeInTheDocument()
    const minumanRects = measureCardRects()
    expect(minumanRects).toHaveLength(3)
    for (const r of minumanRects) {
      expect(r.width).toBeCloseTo(refWidth, 0)
      expect(r.height).toBeCloseTo(refHeight, 0)
    }

    // Pindah ke kategori Alat Tulis (1 item judul pendek)
    await userEvent.click(screen.getByRole('button', { name: /^Alat Tulis/i }))
    await expect.element(screen.getByText('Pulpen')).toBeInTheDocument()
    const alatTulisRects = measureCardRects()
    expect(alatTulisRects).toHaveLength(1)
    expect(alatTulisRects[0].width).toBeCloseTo(refWidth, 0)
    expect(alatTulisRects[0].height).toBeCloseTo(refHeight, 0)
  })
})
