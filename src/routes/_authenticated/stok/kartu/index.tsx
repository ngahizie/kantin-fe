import { createFileRoute, redirect } from '@tanstack/react-router'
import { KartuStokPage } from '@/features/stok'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/stok/kartu/')({
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
    if (!hasRole(['pengelola', 'bendahara'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: KartuStokPage,
})
