import { createFileRoute, redirect } from '@tanstack/react-router'
import { MenuDetailPage } from '@/features/katalog'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/menu/$menuId')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['pengelola'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: MenuDetailPage,
})
