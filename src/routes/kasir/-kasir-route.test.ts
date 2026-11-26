import { describe, expect, it, vi } from 'vitest'
import { Route } from './route'
import { useAuthStore } from '@/stores/auth-store'

describe('Kasir Route Guard (#219)', () => {
  it('redirects unauthenticated users to /sign-in', async () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => false,
        verifySession: async () => false,
        hasRole: () => false,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    try {
      await Route.options.beforeLoad?.({ location: { href: '/kasir' } } as never)
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
        hasRole: () => true,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    try {
      await Route.options.beforeLoad?.({ location: { href: '/kasir' } } as never)
      expect.fail('Should have thrown redirect')
    } catch (err: unknown) {
      expect(err).toBeDefined()
      const str = JSON.stringify(err)
      expect(str).toContain('/sign-in')
    }
  })

  it('redirects to /403 when authenticated user does not have kasir role', async () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        verifySession: async () => true,
        hasRole: () => false,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    try {
      await Route.options.beforeLoad?.({ location: { href: '/kasir' } } as never)
      expect.fail('Should have thrown redirect')
    } catch (err: unknown) {
      expect(err).toBeDefined()
      const str = JSON.stringify(err)
      expect(str).toContain('/403')
    }
  })

  it('allows access when user is authenticated with kasir role and verified by server', async () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        verifySession: async () => true,
        hasRole: (roles: string[]) => roles.includes('kasir'),
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    await expect(
      Route.options.beforeLoad?.({ location: { href: '/kasir' } } as never)
    ).resolves.not.toThrow()
  })
})
