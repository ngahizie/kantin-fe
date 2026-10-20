import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { KartuTamuPage } from '@/features/kartu-tamu'

export const Route = createFileRoute('/_authenticated/kartu-tamu/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['tu', 'bendahara', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: KartuTamuPage,
})
