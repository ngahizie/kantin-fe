import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { ROLE_CONFIGS, getRoleHomePath, type UserRole } from '@/stores/useRoleStore'

const formSchema = z.object({
  email: z
    .string()
    .min(1, 'Masukkan username staf.'),
  password: z
    .string()
    .min(1, 'Masukkan kata sandi staf.')
    .min(6, 'Kata sandi minimal 6 karakter.'),
})

type FormValues = z.infer<typeof formSchema>

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

interface LoginResponseData {
  token: string
  user: {
    id: number | string
    nama: string
    email: string
    currentRole?: UserRole
    roles: string[]
    sekolah?: {
      id: number
      nama: string
    }
  }
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: FormValues) {
    setIsLoading(true)

    try {
      const response = await apiClient.post<{
        code: number
        status: string
        message: string
        data: LoginResponseData
      }>('/api/v1/auth/login', {
        email: data.email,
        username: data.email,
        password: data.password,
        sekolah_id: 10,
      })

      const resData = response.data?.data
      if (!resData || !resData.token) {
        throw new Error('Respon login tidak memuat token otentikasi')
      }

      const inputUsername = data.email.trim()
      const serverUsername = resData.user.email || inputUsername
      let rawRole = (resData.user.currentRole || 'admin') as UserRole

      if (
        resData.user.roles?.includes('ROLE_KEPSEK') ||
        serverUsername.toLowerCase().includes('kepsek') ||
        inputUsername.toLowerCase().includes('kepsek')
      ) {
        rawRole = 'kepsek'
      }

      const cleanNama = (resData.user.nama || 'Staf Kantin').replace(/\s*\([^)]*\)$/, '')
      const authenticatedUser: AuthUser = {
        userId: resData.user.id,
        nama: cleanNama,
        email: resData.user.email,
        username: serverUsername,
        sekolahId: resData.user.sekolah?.id || 10,
        sekolahNama: resData.user.sekolah?.nama || 'PAUD SKOOLIA',
        roles: resData.user.roles || ['ROLE_ADMIN'],
        currentRole: rawRole,
      }

      // Simpan token dan data sesi
      auth.setAccessToken(resData.token)
      auth.setUser(authenticatedUser)

      const roleLabel = ROLE_CONFIGS[rawRole]?.label || rawRole

      toast.success(`Selamat datang, ${serverUsername}!`, {
        description: `Peran aktif: ${roleLabel} di ${authenticatedUser.sekolahNama}`,
      })

      // Tentukan rute navigasi tujuan: tiap role langsung diarahkan ke home masing-masing
      // (kasir -> /kasir, pengelola/tu/bendahara/kepsek/admin -> /) untuk meminimalisasi error 403
      const targetPath = getRoleHomePath(rawRole)

      navigate({ to: targetPath, replace: true })
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string }
      const errorMsg =
        errorObj.response?.data?.message ||
        errorObj.message ||
        'Gagal melakukan proses login staf'
      toast.error('Autentikasi Gagal', { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='space-y-4'>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn('grid gap-3', className)}
          {...props}
        >
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Masukkan username'
                    autoComplete='username'
                    disabled={isLoading}
                    className='border-0 bg-card dark:bg-input/30 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>Kata Sandi</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder='Masukkan kata sandi'
                    autoComplete='current-password'
                    disabled={isLoading}
                    className='border-0 bg-card dark:bg-input/30 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className='mt-2 w-full font-medium' disabled={isLoading}>
            {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
            Masuk ke Sistem Kantin
          </Button>
        </form>
      </Form>
    </div>
  )
}
