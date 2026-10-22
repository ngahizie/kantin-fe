import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { KoreksiBendaharaPage } from '@/features/saldo-refund'

export const Route = createFileRoute('/_authenticated/saldo/koreksi/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['bendahara', 'kepsek'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: KoreksiBendaharaPage,
})
