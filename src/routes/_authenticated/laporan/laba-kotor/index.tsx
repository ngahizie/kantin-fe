import { createFileRoute, redirect } from '@tanstack/react-router'
import { LaporanLabaKotorPage } from '@/features/laporan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/laporan/laba-kotor/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['pengelola', 'bendahara', 'kepsek'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: LaporanLabaKotorPage,
})
