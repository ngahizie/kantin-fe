import { createFileRoute, redirect } from '@tanstack/react-router'
import { StokOpnamePage } from '@/features/stok'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/stok/opname/')({
  beforeLoad: () => {
    const { hasRole } = useAuthStore.getState().auth
    if (!hasRole(['pengelola'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: StokOpnamePage,
})
