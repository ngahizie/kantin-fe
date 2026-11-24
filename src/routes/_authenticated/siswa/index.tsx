import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { SiswaAdminPage } from '@/features/siswa-admin'

export const Route = createFileRoute('/_authenticated/siswa/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: SiswaAdminPage,
})
