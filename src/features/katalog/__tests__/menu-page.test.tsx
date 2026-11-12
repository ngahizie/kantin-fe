import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import '@/styles/index.css'
import {
  KATALOG_SYNC_CHANNEL_NAME,
  KATALOG_SYNC_STORAGE_KEY,
} from '@/lib/katalog-sync'
import { MenuPage } from '../MenuPage'
import { katalogApi } from '../api/katalog-api'
import type { KategoriItem, MenuItem } from '../types'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children: React.ReactNode }) => (
    <header>{children}</header>
  ),
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div data-testid='profile-dropdown' />,
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div data-testid='theme-switch' />,
}))

const KATEGORI_AWAL: KategoriItem[] = [
  { id: 1, nama: 'Makanan', urutan: 1, aktif: true },
]

const MENU_AWAL: MenuItem[] = [
  {
    id: 10,
    kategoriId: 1,
    nama: 'Nasi Kuning Awal',
    kodeBarcode: '89900010',
    hargaJual: 12000,
    satuan: 'PORSI',
    fotoUrl: null,
    stokMinimum: 5,
    stokBerjalan: 20,
    aktif: true,
  },
]

const MENU_TERBARU: MenuItem[] = [
  {
    id: 11,
    kategoriId: 1,
    nama: 'Soto Ayam Baru',
    kodeBarcode: '89900011',
    hargaJual: 15000,
    satuan: 'PORSI',
    fotoUrl: null,
    stokMinimum: 5,
    stokBerjalan: 18,
    aktif: true,
  },
  ...MENU_AWAL,
]

describe('MenuPage — Auto-Refresh Event-Driven (Hanya Saat Ada Perubahan)', () => {
  beforeEach(() => {
    localStorage.removeItem(KATALOG_SYNC_STORAGE_KEY)
    vi.restoreAllMocks()
    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue(KATEGORI_AWAL)
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.removeItem(KATALOG_SYNC_STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('tidak mendaftarkan timer polling dan tidak refresh saat focus/visibilitychange tanpa perubahan', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const getMenuSpy = vi
      .spyOn(katalogApi, 'getMenuList')
      .mockResolvedValue(MENU_AWAL)

    const screen = await render(<MenuPage />)
    await expect.element(screen.getByText('Nasi Kuning Awal')).toBeInTheDocument()
    expect(getMenuSpy).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy).not.toHaveBeenCalled()

    // Tidak ada tombol Segarkan manual di halaman menu
    await expect
      .element(screen.getByRole('button', { name: /Segarkan/i }))
      .not.toBeInTheDocument()

    // Simulasi berpindah fokus dan pageshow tanpa perubahan apa pun -> tetap tidak memanggil API
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))

    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(getMenuSpy).toHaveBeenCalledTimes(1)
  })

  it('langsung menyegarkan data ketika menerima event perubahan dari tab lain lewat BroadcastChannel', async () => {
    const getMenuSpy = vi
      .spyOn(katalogApi, 'getMenuList')
      .mockResolvedValueOnce(MENU_AWAL)
      .mockResolvedValueOnce(MENU_TERBARU)

    const screen = await render(<MenuPage />)
    await expect.element(screen.getByText('Nasi Kuning Awal')).toBeInTheDocument()
    expect(getMenuSpy).toHaveBeenCalledTimes(1)

    const remoteChannel = new BroadcastChannel(KATALOG_SYNC_CHANNEL_NAME)
    try {
      remoteChannel.postMessage({
        id: 'cross-tab-sale-1',
        reason: 'kasir',
        sourceTabId: 'tab-kasir-2',
        timestamp: Date.now(),
      })

      await expect.element(screen.getByText('Soto Ayam Baru')).toBeInTheDocument()
      expect(getMenuSpy).toHaveBeenCalledTimes(2)
    } finally {
      remoteChannel.close()
    }
  })

  it('menahan auto-refresh saat modal edit terbuka lalu menyinkronkan tepat sekali setelah modal ditutup', async () => {
    const getMenuSpy = vi
      .spyOn(katalogApi, 'getMenuList')
      .mockResolvedValueOnce(MENU_AWAL)
      .mockResolvedValueOnce([
        {
          ...MENU_AWAL[0],
          stokBerjalan: 14,
        },
      ])

    const screen = await render(<MenuPage />)
    await expect.element(screen.getByText('Nasi Kuning Awal')).toBeInTheDocument()
    expect(getMenuSpy).toHaveBeenCalledTimes(1)

    // Buka modal edit menu
    await screen.getByTitle('Ubah Menu').click()
    await expect.element(screen.getByText('Ubah Menu Kantin')).toBeInTheDocument()

    const remoteChannel = new BroadcastChannel(KATALOG_SYNC_CHANNEL_NAME)
    try {
      remoteChannel.postMessage({
        id: 'cross-tab-stok-1',
        reason: 'stok',
        sourceTabId: 'tab-stok-1',
        timestamp: Date.now(),
      })

      // Beri waktu event sampai — selama modal terbuka tidak boleh melakukan fetch
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(getMenuSpy).toHaveBeenCalledTimes(1)

      // Tutup modal -> perubahan tertunda langsung disinkronkan
      await screen.getByRole('button', { name: 'Batal' }).click()

      await vi.waitFor(() => {
        expect(getMenuSpy).toHaveBeenCalledTimes(2)
      })
      await expect.element(screen.getByText('14')).toBeInTheDocument()
    } finally {
      remoteChannel.close()
    }
  })

  it('menyinkronkan perubahan yang terlewat dari storage saat kembali fokus atau pageshow', async () => {
    const getMenuSpy = vi
      .spyOn(katalogApi, 'getMenuList')
      .mockResolvedValueOnce(MENU_AWAL)
      .mockResolvedValueOnce(MENU_TERBARU)

    const screen = await render(<MenuPage />)
    await expect.element(screen.getByText('Nasi Kuning Awal')).toBeInTheDocument()
    expect(getMenuSpy).toHaveBeenCalledTimes(1)

    // Simulasi mutasi dari tab lain tercatat di storage saat tab ini sempat tertidur/bfcache
    localStorage.setItem(
      KATALOG_SYNC_STORAGE_KEY,
      JSON.stringify({
        id: 'missed-evt-99',
        reason: 'menu',
        sourceTabId: 'tab-lain',
        timestamp: Date.now(),
      })
    )

    window.dispatchEvent(new Event('focus'))

    await expect.element(screen.getByText('Soto Ayam Baru')).toBeInTheDocument()
    expect(getMenuSpy).toHaveBeenCalledTimes(2)

    // Fokus berikutnya tanpa id perubahan baru tidak memicu fetch ulang
    window.dispatchEvent(new Event('focus'))
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(getMenuSpy).toHaveBeenCalledTimes(2)
  })

  it('tidak memicu fetch ulang berlebih di tab sendiri saat toggle aktif/nonaktif', async () => {
    const getMenuSpy = vi
      .spyOn(katalogApi, 'getMenuList')
      .mockResolvedValueOnce(MENU_AWAL)

    const updateSpy = vi
      .spyOn(katalogApi, 'updateMenu')
      .mockImplementation(async (_id, payload) => {
        // Simulasi pemancaran event dari katalogApi.updateMenu
        const { notifyKatalogChanged } = await import('@/lib/katalog-sync')
        notifyKatalogChanged('menu')
        return {
          ...MENU_AWAL[0],
          aktif: Boolean(payload.aktif),
        }
      })

    const screen = await render(<MenuPage />)
    await expect.element(screen.getByText('Nasi Kuning Awal')).toBeInTheDocument()

    const switchBtn = screen.getByRole('switch', {
      name: 'Nonaktifkan Nasi Kuning Awal',
    })
    await switchBtn.click()

    await expect
      .element(screen.getByRole('switch', { name: 'Aktifkan Nasi Kuning Awal' }))
      .toBeInTheDocument()
    expect(updateSpy).toHaveBeenCalledTimes(1)

    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(getMenuSpy).toHaveBeenCalledTimes(1)
  })

  it('menyinkronkan tepat sekali saat menyimpan perubahan dari modal form meski event mutasi ikut terpancar', async () => {
    const getMenuSpy = vi
      .spyOn(katalogApi, 'getMenuList')
      .mockResolvedValueOnce(MENU_AWAL)
      .mockResolvedValueOnce([
        {
          ...MENU_AWAL[0],
          nama: 'Nasi Kuning Spesial',
        },
      ])

    vi.spyOn(katalogApi, 'updateMenu').mockImplementation(async (_id, payload) => {
      const { notifyKatalogChanged } = await import('@/lib/katalog-sync')
      notifyKatalogChanged('menu')
      return {
        ...MENU_AWAL[0],
        nama: payload.nama,
      }
    })

    const screen = await render(<MenuPage />)
    await expect.element(screen.getByText('Nasi Kuning Awal')).toBeInTheDocument()

    await screen.getByTitle('Ubah Menu').click()
    await expect.element(screen.getByText('Ubah Menu Kantin')).toBeInTheDocument()

    const namaInput = screen.getByPlaceholder(
      'Contoh: Nasi Goreng Spesial, Es Teh Manis'
    )
    await namaInput.fill('Nasi Kuning Spesial')
    await screen.getByRole('button', { name: 'Simpan Perubahan' }).click()

    await expect.element(screen.getByText('Nasi Kuning Spesial')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(getMenuSpy).toHaveBeenCalledTimes(2)
  })

  it('menunda sync saat tab tersembunyi dan langsung memuat ulang saat tab kembali terlihat', async () => {
    let visibility: DocumentVisibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })

    const getMenuSpy = vi
      .spyOn(katalogApi, 'getMenuList')
      .mockResolvedValueOnce(MENU_AWAL)
      .mockResolvedValueOnce(MENU_TERBARU)

    const remoteChannel = new BroadcastChannel(KATALOG_SYNC_CHANNEL_NAME)
    try {
      const screen = await render(<MenuPage />)
      await expect.element(screen.getByText('Nasi Kuning Awal')).toBeInTheDocument()
      expect(getMenuSpy).toHaveBeenCalledTimes(1)

      visibility = 'hidden'
      document.dispatchEvent(new Event('visibilitychange'))

      remoteChannel.postMessage({
        id: 'hidden-tab-evt-1',
        reason: 'kasir',
        sourceTabId: 'tab-kasir-hidden',
        timestamp: Date.now(),
      })

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(getMenuSpy).toHaveBeenCalledTimes(1)

      visibility = 'visible'
      document.dispatchEvent(new Event('visibilitychange'))

      await expect.element(screen.getByText('Soto Ayam Baru')).toBeInTheDocument()
      expect(getMenuSpy).toHaveBeenCalledTimes(2)
    } finally {
      remoteChannel.close()
      delete (document as unknown as { visibilityState?: DocumentVisibilityState })
        .visibilityState
    }
  })
})

describe('MenuPage — Stabilitas Tata Letak Saat Berganti Filter', () => {
  beforeEach(() => {
    localStorage.removeItem(KATALOG_SYNC_STORAGE_KEY)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.removeItem(KATALOG_SYNC_STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it('menjaga lebar kolom tabel, ukuran tombol filter, tinggi minimum card, dan footer paginasi tetap konsisten saat filter berganti', async () => {
    await page.viewport(1280, 900)

    const kategoriVariatif: KategoriItem[] = [
      { id: 1, nama: 'Makanan', urutan: 1, aktif: true },
      { id: 2, nama: 'Minuman & Es Kemasan Segar', urutan: 2, aktif: true },
      { id: 3, nama: 'Snack Ringan', urutan: 3, aktif: true },
    ]

    const menuVariatif: MenuItem[] = [
      {
        id: 1,
        kategoriId: 1,
        nama: 'Nasi Goreng Ayam Kampung Spesial Dengan Telur Mata Sapi Super Lengkap',
        kodeBarcode: '899100001',
        hargaJual: 18000,
        satuan: 'PORSI',
        fotoUrl: null,
        stokMinimum: 5,
        stokBerjalan: 25,
        aktif: true,
      },
      {
        id: 2,
        kategoriId: 2,
        nama: 'Es Teh',
        kodeBarcode: null,
        hargaJual: 4000,
        satuan: 'GELAS',
        fotoUrl: null,
        stokMinimum: 5,
        stokBerjalan: 30,
        aktif: true,
      },
    ]

    vi.spyOn(katalogApi, 'getKategoriList').mockResolvedValue(kategoriVariatif)
    vi.spyOn(katalogApi, 'getMenuList').mockResolvedValue(menuVariatif)

    const screen = await render(<MenuPage />)
    await expect.element(screen.getByText('Es Teh')).toBeInTheDocument()

    expect(getComputedStyle(document.documentElement).scrollbarGutter).toBe('stable')

    const measureHeaderCols = () =>
      Array.from(document.querySelectorAll('th[data-slot="table-head"]')).map((el) => {
        const rect = el.getBoundingClientRect()
        return { left: rect.left, width: rect.width }
      })

    const kategoriBtn = screen.getByRole('button', { name: 'Kategori' })
    const statusBtn = screen.getByRole('button', { name: 'Status' })
    const initialKategoriWidth = (await kategoriBtn.element()).getBoundingClientRect().width
    const initialStatusWidth = (await statusBtn.element()).getBoundingClientRect().width
    const initialCols = measureHeaderCols()
    expect(initialCols).toHaveLength(10)

    const tableCard = document.querySelector('table')?.closest('[data-slot="card"]') as HTMLElement | null
    expect(tableCard).not.toBeNull()
    const initialCardWidth = tableCard!.getBoundingClientRect().width
    const initialCardHeight = tableCard!.getBoundingClientRect().height

    // 1. Pilih kategori dengan label panjang ("Minuman & Es Kemasan Segar")
    await userEvent.click(kategoriBtn)
    await userEvent.click(
      screen.getByRole('option', { name: 'Minuman & Es Kemasan Segar' })
    )
    await expect.element(screen.getByText(/Nasi Goreng/)).not.toBeInTheDocument()
    await expect.element(screen.getByText('Es Teh')).toBeInTheDocument()
    expect(tableCard!.textContent).toContain('Menampilkan 1–1 dari 1 menu')

    expect((await kategoriBtn.element()).getBoundingClientRect().width).toBeCloseTo(
      initialKategoriWidth,
      0
    )
    expect(tableCard!.getBoundingClientRect().width).toBeCloseTo(initialCardWidth, 0)
    expect(tableCard!.getBoundingClientRect().height).toBeCloseTo(initialCardHeight, 0)

    const filteredCols = measureHeaderCols()
    filteredCols.forEach((col, index) => {
      expect(col.left).toBeCloseTo(initialCols[index].left, 0)
      expect(col.width).toBeCloseTo(initialCols[index].width, 0)
    })

    // 2. Ubah filter Status ke kondisi yang menghasilkan 0 data ("Hanya Nonaktif")
    await userEvent.click(statusBtn)
    await userEvent.click(screen.getByRole('option', { name: 'Hanya Nonaktif' }))
    await expect.element(screen.getByText('Tidak ada menu ditemukan')).toBeInTheDocument()
    await expect.element(screen.getByText('Menampilkan 0 menu')).toBeInTheDocument()

    expect((await statusBtn.element()).getBoundingClientRect().width).toBeCloseTo(
      initialStatusWidth,
      0
    )
    expect(tableCard!.getBoundingClientRect().width).toBeCloseTo(initialCardWidth, 0)
    expect(tableCard!.getBoundingClientRect().height).toBeCloseTo(initialCardHeight, 0)

    const emptyCols = measureHeaderCols()
    emptyCols.forEach((col, index) => {
      expect(col.left).toBeCloseTo(initialCols[index].left, 0)
      expect(col.width).toBeCloseTo(initialCols[index].width, 0)
    })
  })
})
