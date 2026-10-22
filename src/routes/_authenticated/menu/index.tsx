import { createFileRoute, redirect } from '@tanstack/react-router'
import { MenuPage } from '@/features/katalog'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/menu/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['pengelola', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: MenuPage,
})
