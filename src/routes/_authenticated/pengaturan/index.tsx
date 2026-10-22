import { createFileRoute, redirect } from '@tanstack/react-router'
import { PengaturanKantinPage } from '@/features/pengaturan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/pengaturan/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: PengaturanKantinPage,
})
