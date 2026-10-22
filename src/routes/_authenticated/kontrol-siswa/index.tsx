import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { KontrolSiswaPage } from '@/features/kontrol-siswa'

export const Route = createFileRoute('/_authenticated/kontrol-siswa/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: KontrolSiswaPage,
})
