import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import '@/styles/index.css'
import { LayoutProvider } from '@/context/layout-provider'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Sidebar } from './Sidebar'

let mockIsMobile = false

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => '/menu',
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/stores/useRoleStore', () => ({
  useRoleStore: () => ({
    currentRole: 'pengelola',
    schoolName: 'PAUD SKOOLIA',
    canteenName: 'Kantin SKOOLIA',
  }),
}))

describe('Sidebar border styling', () => {
  beforeEach(() => {
    mockIsMobile = false
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('menampilkan garis tipis pembatas kanan pada desktop sidebar dan bawah pada SidebarHeader sejajar header', async () => {
    const { container } = await render(
      <LayoutProvider>
        <SidebarProvider defaultOpen={true}>
          <Sidebar />
        </SidebarProvider>
      </LayoutProvider>
    )

    const sidebarContainer = container.querySelector('[data-slot="sidebar-container"]')
    const sidebarHeader = container.querySelector('[data-slot="sidebar-header"]')

    expect(sidebarContainer).not.toBeNull()
    expect(sidebarHeader).not.toBeNull()
    expect(sidebarContainer).toHaveClass('has-border')
    expect(sidebarHeader).toHaveClass('has-border', 'h-[65px]')

    const containerLight = getComputedStyle(sidebarContainer!)
    const containerLightRightWidth = containerLight.borderRightWidth
    const containerLightRightStyle = containerLight.borderRightStyle
    const containerLightRightColor = containerLight.borderRightColor

    expect(containerLightRightWidth).toBe('1px')
    expect(containerLightRightStyle).toBe('solid')
    expect(containerLightRightColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(containerLightRightColor).not.toBe('transparent')

    const headerLight = getComputedStyle(sidebarHeader!)
    expect(headerLight.borderBottomWidth).toBe('1px')
    expect(headerLight.borderBottomStyle).toBe('solid')
    expect(headerLight.borderBottomColor).toBe(containerLightRightColor)

    document.documentElement.classList.add('dark')
    const containerDark = getComputedStyle(sidebarContainer!)
    expect(containerDark.borderRightWidth).toBe('1px')
    expect(containerDark.borderRightColor).not.toBe(containerLightRightColor)
    expect(containerDark.borderRightColor).not.toBe('rgba(0, 0, 0, 0)')
  })

  it('menampilkan garis tipis pembatas kanan pada mobile drawer sidebar saat dibuka', async () => {
    mockIsMobile = true
    const { getByRole } = await render(
      <LayoutProvider>
        <SidebarProvider defaultOpen={true}>
          <SidebarTrigger />
          <Sidebar />
        </SidebarProvider>
      </LayoutProvider>
    )

    await userEvent.click(getByRole('button', { name: /toggle sidebar/i }))

    const mobileSheet = document.body.querySelector('[data-mobile="true"]')
    expect(mobileSheet).not.toBeNull()
    expect(mobileSheet).toHaveClass('has-border')

    const mobileStyle = getComputedStyle(mobileSheet!)
    expect(mobileStyle.borderRightWidth).toBe('1px')
    expect(mobileStyle.borderRightStyle).toBe('solid')
    expect(mobileStyle.borderRightColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(mobileStyle.borderRightColor).not.toBe('transparent')
  })
})
