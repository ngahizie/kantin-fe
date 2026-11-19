import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleHomePath } from '@/stores/useRoleStore'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState().auth
    if (isAuthenticated()) {
      const target = getRoleHomePath(user?.currentRole || 'admin')
      throw redirect({
        to: target,
      })
    }
  },
  component: SignIn,
  validateSearch: searchSchema,
})
