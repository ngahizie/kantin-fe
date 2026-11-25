import { createFileRoute, redirect } from '@tanstack/react-router'
import { KasirLayout } from '@/layouts/kasir-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/kasir')({
  beforeLoad: ({ location }) => {
    const { isAuthenticated, hasRole } = useAuthStore.getState().auth
    if (!isAuthenticated()) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }
    if (!hasRole(['kasir'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: KasirLayout,
})
