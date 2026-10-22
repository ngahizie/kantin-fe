import { createFileRoute, redirect } from '@tanstack/react-router'
import { BarangMasukPage } from '@/features/stok'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/stok/masuk/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['pengelola', 'bendahara', 'admin'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: BarangMasukPage,
})
