import { describe, expect, it, vi } from 'vitest'
import { Route } from '@/routes/(auth)/sign-in'
import { useAuthStore } from '@/stores/auth-store'

describe('SignIn Route Guard (SEC-06)', () => {
  it('allows unauthenticated users to access /sign-in', () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => false,
        user: null,
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    expect(() => Route.options.beforeLoad?.({} as never)).not.toThrow()
  })

  it('redirects authenticated users away from /sign-in to their role home path', () => {
    vi.spyOn(useAuthStore, 'getState').mockReturnValue({
      auth: {
        isAuthenticated: () => true,
        user: { currentRole: 'kasir' },
      },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    try {
      Route.options.beforeLoad?.({} as never)
      expect.fail('Should have thrown redirect')
    } catch (err: unknown) {
      expect(err).toBeDefined()
      const str = JSON.stringify(err)
      expect(str).toContain('/kasir')
    }
  })
})
