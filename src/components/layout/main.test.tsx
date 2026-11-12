import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import '@/styles/index.css'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Header } from './header'
import { HeaderActions, HeaderBreadcrumb } from './header-actions'
import { Main } from './main'
import { PengaturanKantinPage } from '@/features/pengaturan/PengaturanKantinPage'
import { TitikKasirPage } from '@/features/pengaturan/TitikKasirPage'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => (
    <button type='button' className='h-8 w-8 rounded-full'>
      Theme
    </button>
  ),
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => (
    <button type='button' className='h-8 w-8 rounded-full'>
      Profile
    </button>
  ),
}))

vi.mock('@/stores/usePengaturanStore', () => ({
  usePengaturanStore: () => ({
    pengaturan: {
      namaKantin: 'Kantin Sehat SKOOLIA',
      jamTutupOtomatis: '23:59',
      konfirmasiManual: false,
      durasiFotoDetik: 3,
      minTopup: 5000,
      maksTopup: 500000,
      batasSaldoSiswa: 1000000,
      kebijakanSaldoMengendap: 'REFUND',
      ambangHari: 90,
      updatedAt: null,
    },
    fetchPengaturan: vi.fn().mockResolvedValue(null),
    updatePengaturan: vi.fn().mockResolvedValue(undefined),
    loadingPengaturan: false,
    activeTitikKasirId: null,
    setActiveTitikKasirId: vi.fn(),
    fetchTitikKasir: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/features/pengaturan/api/pengaturan-api', () => ({
  pengaturanApi: {
    getTitikKasirList: vi.fn().mockResolvedValue([]),
  },
}))

describe('Main & Header Page Padding Consistency', () => {
  it('memiliki padding seragam 24px (kiri/kanan/atas) & 48px (bawah) serta sejajar dengan Header di layar desktop 1280px dan lebar 1920px', async () => {
    for (const [width, height] of [
      [1280, 800],
      [1920, 1080],
    ] as const) {
      await page.viewport(width, height)

      const { container, unmount } = await render(
        <SidebarProvider defaultOpen={false}>
          <SidebarInset className='@container/content'>
            <Header fixed>
              <HeaderBreadcrumb section='Test Section' title='Test Page' />
              <HeaderActions />
            </Header>
            <Main className='space-y-6'>
              <div data-testid='page-content' className='h-24 w-full bg-card rounded-xl' />
            </Main>
          </SidebarInset>
        </SidebarProvider>
      )

      const headerEl = container.querySelector('header')!
      const mainEl = container.querySelector('main')!
      const triggerEl = container.querySelector('[data-sidebar="trigger"]')!
      const profileBtn = Array.from(headerEl.querySelectorAll('button')).find(
        (b) => b.textContent === 'Profile'
      )!
      const contentEl = container.querySelector('[data-testid="page-content"]')!

      const mainStyle = getComputedStyle(mainEl)
      expect(mainStyle.paddingLeft).toBe('24px')
      expect(mainStyle.paddingRight).toBe('24px')
      expect(mainStyle.paddingTop).toBe('24px')
      expect(mainStyle.paddingBottom).toBe('48px')

      const headerRect = headerEl.getBoundingClientRect()
      const triggerRect = triggerEl.getBoundingClientRect()
      const profileRect = profileBtn.getBoundingClientRect()
      const contentRect = contentEl.getBoundingClientRect()

      // Left edge of content matches left edge of header inner area (24px)
      expect(contentRect.left - headerRect.left).toBeCloseTo(24, 0)
      expect(triggerRect.left - headerRect.left).toBeCloseTo(24, 0)
      expect(contentRect.left).toBeCloseTo(triggerRect.left, 0)

      // Right edge of content matches right edge of header inner area (24px) & spans full width even at 1920px
      expect(headerRect.right - contentRect.right).toBeCloseTo(24, 0)
      expect(headerRect.right - profileRect.right).toBeCloseTo(24, 0)
      expect(contentRect.right).toBeCloseTo(profileRect.right, 0)

      // Distance from bottom border of Header to top of first page element is 24px
      expect(contentRect.top - headerRect.bottom).toBeCloseTo(24, 0)

      await unmount()
    }
  })

  it('memiliki padding seragam 16px (kiri/kanan) & 24px (atas) pada layar mobile 390px serta tetap sejajar dengan Header', async () => {
    await page.viewport(390, 844)

    const { container } = await render(
      <SidebarProvider defaultOpen={false}>
        <SidebarInset className='@container/content'>
          <Header fixed>
            <HeaderBreadcrumb section='Mobile' title='Test Page' />
            <HeaderActions />
          </Header>
          <Main className='space-y-6'>
            <div data-testid='mobile-content' className='h-20 w-full bg-card rounded-xl' />
          </Main>
        </SidebarInset>
      </SidebarProvider>
    )

    const headerEl = container.querySelector('header')!
    const mainEl = container.querySelector('main')!
    const contentEl = container.querySelector('[data-testid="mobile-content"]')!
    const mainStyle = getComputedStyle(mainEl)

    expect(mainStyle.paddingLeft).toBe('16px')
    expect(mainStyle.paddingRight).toBe('16px')
    expect(mainStyle.paddingTop).toBe('24px')
    expect(mainStyle.paddingBottom).toBe('48px')

    const headerRect = headerEl.getBoundingClientRect()
    const contentRect = contentEl.getBoundingClientRect()
    expect(contentRect.left - headerRect.left).toBeCloseTo(16, 0)
    expect(headerRect.right - contentRect.right).toBeCloseTo(16, 0)
    expect(contentRect.top - headerRect.bottom).toBeCloseTo(24, 0)
  })

  it('halaman PengaturanKantinPage dan TitikKasirPage tidak lagi memiliki padding ganda bersarang', async () => {
    await page.viewport(1280, 800)

    for (const Component of [PengaturanKantinPage, TitikKasirPage]) {
      const { container, unmount } = await render(
        <SidebarProvider defaultOpen={false}>
          <SidebarInset className='@container/content'>
            <Component />
          </SidebarInset>
        </SidebarProvider>
      )

      const headerEl = container.querySelector('header')!
      const mainEl = container.querySelector('main')!
      const headingEl = mainEl.querySelector('h1')!

      expect(mainEl.getAttribute('data-layout')).toBe('auto')
      const mainStyle = getComputedStyle(mainEl)
      expect(mainStyle.paddingLeft).toBe('24px')
      expect(mainStyle.paddingRight).toBe('24px')
      expect(mainStyle.paddingTop).toBe('24px')
      expect(mainStyle.paddingBottom).toBe('48px')

      const headerRect = headerEl.getBoundingClientRect()
      const headingRect = headingEl.getBoundingClientRect()

      expect(headingRect.left - headerRect.left).toBeCloseTo(24, 0)
      expect(headingRect.top - headerRect.bottom).toBeCloseTo(24, 0)

      await unmount()
    }
  })
})
