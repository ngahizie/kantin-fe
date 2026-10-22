import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { KasirLayout } from './KasirLayout'

let mockCurrentRole = 'kasir'
let mockUserRole = 'kasir'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      user: {
        userId: '4',
        nama: 'Ahmad Kasir',
        email: 'kasir@skoolia.id',
        sekolahId: 1,
        sekolahNama: 'SMA 1',
        roles: ['PETUGAS'],
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
  })

  it('menyembunyikan tombol Kembali ke Dashboard ketika peran adalah kasir POS', async () => {
    mockCurrentRole = 'kasir'
    mockUserRole = 'kasir'
    const { getByText } = await render(<KasirLayout />)

    await expect.element(getByText('SKOOLIA Kantin POS')).toBeInTheDocument()
    await expect.element(getByText('Kembali')).not.toBeInTheDocument()
  })

  it('menampilkan tombol Kembali ke Dashboard ketika peran adalah pengelola kantin', async () => {
    mockCurrentRole = 'pengelola'
    mockUserRole = 'pengelola'
    const { getByText } = await render(<KasirLayout />)

    await expect.element(getByText('SKOOLIA Kantin POS')).toBeInTheDocument()
    await expect.element(getByText('Kembali')).toBeInTheDocument()
  })

  it('menampilkan tombol Kembali ke Dashboard ketika peran adalah admin sekolah', async () => {
    mockCurrentRole = 'admin'
    mockUserRole = 'admin'
    const { getByText } = await render(<KasirLayout />)

    await expect.element(getByText('Kembali')).toBeInTheDocument()
  })
})
