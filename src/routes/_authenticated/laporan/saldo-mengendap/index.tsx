import { createFileRoute, redirect } from '@tanstack/react-router'
import { LaporanSaldoMengendapPage } from '@/features/laporan'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute(
  '/_authenticated/laporan/saldo-mengendap/'
)({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['bendahara', 'kepsek', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: LaporanSaldoMengendapPage,
})
