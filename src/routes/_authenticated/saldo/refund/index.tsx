import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { RefundSiswaKeluarPage } from '@/features/saldo-refund'

export const Route = createFileRoute('/_authenticated/saldo/refund/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['bendahara', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: RefundSiswaKeluarPage,
})
