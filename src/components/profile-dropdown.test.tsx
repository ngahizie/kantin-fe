import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { getRoleLabel, ProfileDropdown } from './profile-dropdown'

const mockAuthUser = {
  userId: '1',
  nama: 'Wibisana Bama',
  email: 'admin@skoolia.id',
  username: 'admin@skoolia.id',
  sekolahId: 10,
  sekolahNama: 'SMA Negeri 1 SKOOLIA',
  roles: ['ROLE_ADMIN'],
  currentRole: 'admin',
}

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      user: mockAuthUser,
      reset: vi.fn(),
    },
  }),
}))

vi.mock('@/stores/useRoleStore', () => ({
  useRoleStore: () => ({
    userName: '',
    userEmail: '',
    currentRole: 'admin',
    schoolName: 'PAUD SKOOLIA',
  }),
  ROLE_CONFIGS: {
    admin: {
      id: 'admin',
      label: 'Admin Sekolah',
      description: 'Akses penuh ke semua modul sistem kantin',
      badgeColor: 'bg-red-500/10 text-red-600',
    },
    kepsek: {
      id: 'kepsek',
      label: 'Kepala Sekolah',
      description: 'Pemantauan operasional dan laporan',
      badgeColor: 'bg-blue-500/10 text-blue-600',
    },
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ href: 'https://app.test/' }),
    Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a {...props}>{children}</a>
    ),
  }
})

describe('ProfileDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders authenticated user initials and info when triggered', async () => {
    const { getByRole, getByText } = await render(<ProfileDropdown />)

    const triggerButton = getByRole('button')
    await expect.element(triggerButton).toBeInTheDocument()

    // Klik untuk membuka dropdown
    await userEvent.click(triggerButton)

    // Baris pertama menampilkan username / email akun
    await expect.element(getByText('admin@skoolia.id')).toBeInTheDocument()
    // Baris kedua menampilkan label role
    await expect.element(getByText('Admin Sekolah')).toBeInTheDocument()
  })

  describe('getRoleLabel', () => {
    it('correctly maps kepsek role and usernames', () => {
      expect(getRoleLabel('kepsek', ['ROLE_KEPSEK'], 'kepsek1')).toBe('Kepala Sekolah')
      expect(getRoleLabel(undefined, undefined, 'kepsek1')).toBe('Kepala Sekolah')
    })

    it('correctly maps other staff roles', () => {
      expect(getRoleLabel('bendahara', ['ROLE_BENDAHARA'], 'bendahara10')).toBe('Bendahara Sekolah')
      expect(getRoleLabel('tu', ['ROLE_TU_SEKOLAH'], 'tu1')).toBe('Petugas TU')
      expect(getRoleLabel('kasir', ['ROLE_PETUGAS_KANTIN'], 'kasir10')).toBe('Petugas Kasir POS')
      expect(getRoleLabel('admin', ['ROLE_ADMIN'], 'admin')).toBe('Admin Sekolah')
    })
  })
})
