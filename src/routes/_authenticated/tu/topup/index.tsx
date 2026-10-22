import { createFileRoute, redirect } from '@tanstack/react-router'
import { TopupTunaiPage } from '@/features/tu'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/tu/topup/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['tu', 'bendahara', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: TopupTunaiPage,
})
