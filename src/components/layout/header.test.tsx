import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
import '@/styles/index.css'
import { Header } from './header'
import { BackofficeHeader } from './backoffice-header'
import { HeaderActions, HeaderBreadcrumb } from './header-actions'
import { SidebarProvider } from '@/components/ui/sidebar'

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

describe('Header & SidebarTrigger', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('renders Header with SidebarTrigger and children', async () => {
    const { getByRole, getByTestId } = await render(
      <SidebarProvider defaultOpen={true}>
        <Header>
          <div data-testid='header-content'>Dashboard Title</div>
        </Header>
      </SidebarProvider>
    )

    await expect.element(getByTestId('header-content')).toBeInTheDocument()
    const trigger = getByRole('button', { name: /toggle sidebar/i })
    await expect.element(trigger).toBeInTheDocument()

    await userEvent.click(trigger)
    await expect.element(trigger).toBeInTheDocument()
  })

  it('menampilkan garis tipis bawah pada Header di mode terang dan gelap', async () => {
    const { container } = await render(
      <SidebarProvider defaultOpen={true}>
        <Header fixed>
          <h1>Katalog Menu Kantin</h1>
        </Header>
      </SidebarProvider>
    )

    const headerEl = container.querySelector('header')
    expect(headerEl).not.toBeNull()
    expect(headerEl).toHaveClass('has-border', 'h-[65px]')

    const lightStyle = getComputedStyle(headerEl!)
    const lightBottomWidth = lightStyle.borderBottomWidth
    const lightBottomStyle = lightStyle.borderBottomStyle
    const lightBottomColor = lightStyle.borderBottomColor

    expect(lightBottomWidth).toBe('1px')
    expect(lightBottomStyle).toBe('solid')
    expect(lightBottomColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(lightBottomColor).not.toBe('transparent')

    document.documentElement.classList.add('dark')
    const darkStyle = getComputedStyle(headerEl!)
    expect(darkStyle.borderBottomWidth).toBe('1px')
    expect(darkStyle.borderBottomColor).not.toBe(lightBottomColor)
    expect(darkStyle.borderBottomColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  it('mempertahankan garis tipis bawah pada BackofficeHeader', async () => {
    const { container } = await render(
      <SidebarProvider defaultOpen={true}>
        <BackofficeHeader />
      </SidebarProvider>
    )

    const headerEl = container.querySelector('header')
    expect(headerEl).not.toBeNull()
    expect(headerEl).not.toHaveClass('border-none')

    const style = getComputedStyle(headerEl!)
    expect(style.borderBottomWidth).toBe('1px')
    expect(style.borderBottomStyle).toBe('solid')
    expect(style.borderBottomColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(style.borderBottomColor).not.toBe('transparent')
  })

  it('menjaga posisi dan jarak ThemeSwitch serta ProfileDropdown tetap identik di semua variasi header halaman', async () => {
    await page.viewport(1280, 800)

    const measureActions = (container: HTMLElement) => {
      const buttons = Array.from(container.querySelectorAll('header button'))
      const themeBtn = buttons.find((b) => b.textContent === 'Theme')
      const profileBtn = buttons.find((b) => b.textContent === 'Profile')
      expect(themeBtn).toBeDefined()
      expect(profileBtn).toBeDefined()
      const themeRect = themeBtn!.getBoundingClientRect()
      const profileRect = profileBtn!.getBoundingClientRect()
      return {
        theme: {
          left: themeRect.left,
          top: themeRect.top,
          width: themeRect.width,
          height: themeRect.height,
        },
        profile: {
          left: profileRect.left,
          top: profileRect.top,
          width: profileRect.width,
          height: profileRect.height,
        },
        gap: profileRect.left - themeRect.right,
      }
    }

    const screen = await render(
      <SidebarProvider defaultOpen={false}>
        <div className='w-full'>
          <BackofficeHeader />
        </div>
      </SidebarProvider>
    )
    const refPos = measureActions(screen.container)
    expect(refPos.gap).toBeCloseTo(12, 0)

    // Variasi 2: Header halaman dengan judul h1 sangat panjang
    await screen.rerender(
      <SidebarProvider defaultOpen={false}>
        <div className='w-full'>
          <Header fixed>
            <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
              <h1 className='truncate text-base sm:text-lg font-bold tracking-tight text-foreground'>
                Katalog Menu Kantin Sekolah Dengan Judul Halaman Sangat Panjang Sekali
              </h1>
            </div>
            <HeaderActions />
          </Header>
        </div>
      </SidebarProvider>
    )
    const h1Pos = measureActions(screen.container)
    expect(h1Pos.theme.left).toBeCloseTo(refPos.theme.left, 0)
    expect(h1Pos.theme.top).toBeCloseTo(refPos.theme.top, 0)
    expect(h1Pos.profile.left).toBeCloseTo(refPos.profile.left, 0)
    expect(h1Pos.gap).toBeCloseTo(refPos.gap, 0)

    // Variasi 3: Header halaman dengan breadcrumb
    await screen.rerender(
      <SidebarProvider defaultOpen={false}>
        <div className='w-full'>
          <Header fixed>
            <HeaderBreadcrumb
              section='Laporan Keuangan'
              title='Penjualan & Laba Kotor Harian Bulanan'
            />
            <HeaderActions />
          </Header>
        </div>
      </SidebarProvider>
    )
    const breadcrumbPos = measureActions(screen.container)
    expect(breadcrumbPos.theme.left).toBeCloseTo(refPos.theme.left, 0)
    expect(breadcrumbPos.theme.top).toBeCloseTo(refPos.theme.top, 0)
    expect(breadcrumbPos.profile.left).toBeCloseTo(refPos.profile.left, 0)
    expect(breadcrumbPos.gap).toBeCloseTo(refPos.gap, 0)
  })
})
