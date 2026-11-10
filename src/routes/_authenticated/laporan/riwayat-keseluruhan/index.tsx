import { createFileRoute, redirect } from '@tanstack/react-router'
import { LaporanRiwayatKeseluruhanPage } from '@/features/laporan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/laporan/riwayat-keseluruhan/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['bendahara', 'tu', 'admin', 'kepsek'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: LaporanRiwayatKeseluruhanPage,
})
