import { createFileRoute, redirect } from '@tanstack/react-router'
import { LaporanRiwayatSiswaPage } from '@/features/laporan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/laporan/riwayat-siswa/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['bendahara', 'tu', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: LaporanRiwayatSiswaPage,
})
