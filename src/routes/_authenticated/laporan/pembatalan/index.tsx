import { createFileRoute, redirect } from '@tanstack/react-router'
import { LaporanPembatalanPage } from '@/features/laporan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/laporan/pembatalan/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['admin', 'bendahara', 'tu'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: LaporanPembatalanPage,
})
