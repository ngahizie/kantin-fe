import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import '@/styles/index.css'
import { KasirLayout } from './KasirLayout'

let mockCurrentRole = 'kasir'
let mockUserRole = 'kasir'
let mockUserRoles = ['PETUGAS']

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      user: {
        userId: '4',
        nama: 'Ahmad Kasir',
        email: 'kasir@skoolia.id',
        sekolahId: 1,
        sekolahNama: 'SMA 1',
        roles: mockUserRoles,
        currentRole: mockUserRole,
      },
      reset: vi.fn(),
    },
  }),
}))

vi.mock('@/stores/useRoleStore', () => ({
  useRoleStore: () => ({
    currentRole: mockCurrentRole,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid='outlet-kasir'>Kasir POS Content</div>,
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('@/components/sign-out-dialog', () => ({
  SignOutDialog: () => null,
}))

describe('KasirLayout Navigasi & Proteksi Peran', () => {
  beforeEach(() => {
    mockCurrentRole = 'kasir'
    mockUserRole = 'kasir'
    mockUserRoles = ['PETUGAS']
  })

  it('menyembunyikan tombol Kembali ke Dashboard ketika peran adalah kasir POS', async () => {
    mockCurrentRole = 'kasir'
    mockUserRole = 'kasir'
    mockUserRoles = ['PETUGAS']
    const { getByText } = await render(<KasirLayout />)

    await expect.element(getByText('SKOOLIA Kantin POS')).toBeInTheDocument()
    await expect.element(getByText('Kembali')).not.toBeInTheDocument()
  })

  it('menampilkan tombol Kembali ke Dashboard ketika peran adalah pengelola kantin', async () => {
    mockCurrentRole = 'pengelola'
    mockUserRole = 'pengelola'
    mockUserRoles = ['PENGELOLA']
    const { getByText } = await render(<KasirLayout />)

    await expect.element(getByText('SKOOLIA Kantin POS')).toBeInTheDocument()
    await expect.element(getByText('Kembali')).toBeInTheDocument()
  })

  it('menampilkan tombol Kembali ke Dashboard ketika peran adalah admin sekolah', async () => {
    mockCurrentRole = 'admin'
    mockUserRole = 'admin'
    mockUserRoles = ['ADMIN']
    const { getByText } = await render(<KasirLayout />)

    await expect.element(getByText('Kembali')).toBeInTheDocument()
  })

  it('mengisi penuh lebar viewport tanpa menyisakan celah scrollbar-gutter di sisi paling kanan', async () => {
    await page.viewport(1280, 800)
    const { container } = await render(<KasirLayout />)

    const rootEl = container.querySelector('[data-kasir-layout]')!
    const headerEl = container.querySelector('header')!

    expect(rootEl).not.toBeNull()
    expect(getComputedStyle(document.documentElement).scrollbarGutter).toBe('auto')

    const rootRect = rootEl.getBoundingClientRect()
    const headerRect = headerEl.getBoundingClientRect()
    expect(rootRect.right).toBeCloseTo(window.innerWidth, 0)
    expect(headerRect.right).toBeCloseTo(window.innerWidth, 0)
  })
})
