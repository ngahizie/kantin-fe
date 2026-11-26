import { describe, expect, it, vi } from 'vitest'
import { Route } from './route'
import { useAuthStore } from '@/stores/auth-store'

describe('Authenticated Route Guard (#219)', () => {
  it('redirects unauthenticated users to /sign-in', async () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => false,
        verifySession: async () => false,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    try {
      await Route.options.beforeLoad?.({ location: { href: '/dashboard' } } as never)
      expect.fail('Should have thrown redirect')
    } catch (err: unknown) {
      expect(err).toBeDefined()
      const str = JSON.stringify(err)
      expect(str).toContain('/sign-in')
    }
  })

  it('redirects to /sign-in when token was revoked on server (verifySession returns false)', async () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        verifySession: async () => false,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    try {
      await Route.options.beforeLoad?.({ location: { href: '/dashboard' } } as never)
      expect.fail('Should have thrown redirect')
    } catch (err: unknown) {
      expect(err).toBeDefined()
      const str = JSON.stringify(err)
      expect(str).toContain('/sign-in')
    }
  })

  it('allows access when user is authenticated and token is verified by server', async () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        verifySession: async () => true,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    await expect(
      Route.options.beforeLoad?.({ location: { href: '/dashboard' } } as never)
    ).resolves.not.toThrow()
  })
})
