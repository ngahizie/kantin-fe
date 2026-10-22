import { createFileRoute, redirect } from '@tanstack/react-router'
import { TitikKasirPage } from '@/features/pengaturan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute(
  '/_authenticated/pengaturan/titik-kasir/'
)({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: TitikKasirPage,
})
