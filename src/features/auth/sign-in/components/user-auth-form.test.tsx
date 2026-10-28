import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'
import { getRoleHomePath } from '@/stores/useRoleStore'

const FORM_MESSAGES = {
  emailEmpty: 'Masukkan username staf.',
  passwordEmpty: 'Masukkan kata sandi staf.',
} as const

const navigate = vi.fn()
const setUserMock = vi.fn()
const setAccessTokenMock = vi.fn()
const resetMock = vi.fn()

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      reset: resetMock,
      setUser: setUserMock,
      setAccessToken: setAccessTokenMock,
    },
  }),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(() =>
      Promise.resolve({
        data: {
          code: 200,
          status: 'SUCCESS',
          message: 'Login berhasil',
          data: {
            token: 'mock-test-token',
            user: {
              id: 1,
              nama: 'Petugas Test',
              email: 'admin@skoolia.id',
              currentRole: 'admin',
              roles: ['ROLE_ADMIN'],
              sekolah: { id: 10, nama: 'SMA Negeri 1 SKOOLIA' },
            },
          },
        },
      })
    ),
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let emailInput: Locator
    let passwordInput: Locator
    let signInButton: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      screen = await render(<UserAuthForm />)
      emailInput = screen.getByRole('textbox', { name: /(Username|Email atau Username Staf|Username \/ Email)/i })
      passwordInput = screen.getByLabelText(/Kata Sandi/i)
      signInButton = screen.getByRole('button', { name: /Masuk ke Sistem Kantin/i })
    })

    it('renders fields and submit button', async () => {
      await expect.element(emailInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty fields', async () => {
      await userEvent.fill(emailInput, '')
      await userEvent.fill(passwordInput, '')
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.emailEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      await userEvent.fill(emailInput, 'admin@skoolia.id')
      await userEvent.fill(passwordInput, 'password123')

      await userEvent.click(signInButton)

      await vi.waitFor(() => expect(setUserMock).toHaveBeenCalledOnce())
      expect(resetMock).toHaveBeenCalledOnce()
      expect(setUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@skoolia.id',
          nama: 'Petugas Test',
          currentRole: 'admin',
        })
      )
      expect(setAccessTokenMock).toHaveBeenCalledOnce()
      expect(setAccessTokenMock).toHaveBeenCalledWith('mock-test-token')

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })

  it('navigates directly to role home path even if redirectTo was provided to prevent 403', async () => {
    vi.clearAllMocks()

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/menu' />
    )

    await userEvent.fill(getByRole('textbox', { name: /(Username|Email atau Username Staf|Username \/ Email)/i }), 'admin@skoolia.id')
    await userEvent.fill(getByLabelText(/Kata Sandi/i), 'password123')

    await userEvent.click(getByRole('button', { name: /Masuk ke Sistem Kantin/i }))

    await vi.waitFor(() => expect(setUserMock).toHaveBeenCalledOnce())
    expect(resetMock).toHaveBeenCalledOnce()
    expect(setAccessTokenMock).toHaveBeenCalledOnce()

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/',
        replace: true,
      })
    )
  })

  describe('getRoleHomePath helper', () => {
    it('returns /kasir for role kasir and / for other roles', () => {
      expect(getRoleHomePath('kasir')).toBe('/kasir')
      expect(getRoleHomePath('pengelola')).toBe('/')
      expect(getRoleHomePath('tu')).toBe('/')
      expect(getRoleHomePath('bendahara')).toBe('/')
      expect(getRoleHomePath('kepsek')).toBe('/')
      expect(getRoleHomePath('admin')).toBe('/')
    })
  })
})
