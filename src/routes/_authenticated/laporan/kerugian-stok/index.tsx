import { createFileRoute, redirect } from '@tanstack/react-router'
import { LaporanKerugianStokPage } from '@/features/laporan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/laporan/kerugian-stok/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['pengelola', 'bendahara', 'kepsek', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: LaporanKerugianStokPage,
})
