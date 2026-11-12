import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import '@/styles/index.css'
import { Header } from './header'
import { BackofficeHeader } from './backoffice-header'
import { SidebarProvider } from '@/components/ui/sidebar'

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <button type='button'>Theme</button>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <button type='button'>Profile</button>,
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
})
