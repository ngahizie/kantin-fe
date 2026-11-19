import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { SetoranKasPage } from '@/features/tu'

export const Route = createFileRoute('/_authenticated/tu/setoran/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['tu', 'bendahara', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: SetoranKasPage,
})
