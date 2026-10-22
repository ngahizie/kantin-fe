import { createFileRoute, redirect } from '@tanstack/react-router'
import { KartuStokPage } from '@/features/stok'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/stok/kartu/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['pengelola', 'bendahara', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: KartuStokPage,
})
