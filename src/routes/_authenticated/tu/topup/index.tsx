import { createFileRoute, redirect } from '@tanstack/react-router'
import { TopupTunaiPage } from '@/features/tu'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/tu/topup/')({
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
    if (!hasRole(['tu'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: TopupTunaiPage,
})
