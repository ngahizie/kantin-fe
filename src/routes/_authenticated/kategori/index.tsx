import { createFileRoute, redirect } from '@tanstack/react-router'
import { KategoriPage } from '@/features/katalog'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/kategori/')({
  beforeLoad: ({ location }) => {
    const { isAuthenticated, hasRole } = useAuthStore.getState().auth
    if (!isAuthenticated()) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }
    if (!hasRole(['pengelola'])) {
      throw redirect({
        to: '/403',
      })
    }
  },
  component: KategoriPage,
})
