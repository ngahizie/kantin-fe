import { createFileRoute, redirect } from '@tanstack/react-router'
import { LaporanRekonsiliasiPage } from '@/features/laporan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/laporan/cek-selisih/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['bendahara', 'tu', 'admin', 'kepsek'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: LaporanRekonsiliasiPage,
})
