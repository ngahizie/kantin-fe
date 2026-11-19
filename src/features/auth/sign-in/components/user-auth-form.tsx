import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn, ShieldAlert } from 'lucide-react'
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
    .min(8, 'Kata sandi minimal 8 karakter.'),
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

const VALID_ROLES: UserRole[] = ['kasir', 'pengelola', 'tu', 'bendahara', 'kepsek', 'admin']

export function resolveUserRole(roles?: string[], currentRole?: string): UserRole {
  if (currentRole && VALID_ROLES.includes(currentRole as UserRole)) {
    return currentRole as UserRole
  }
  if (roles && roles.length > 0) {
    if (roles.includes('ROLE_ADMIN')) return 'admin'
    if (roles.includes('ROLE_PENGELOLA_KANTIN')) return 'pengelola'
    if (roles.includes('ROLE_PETUGAS_KANTIN')) return 'kasir'
    if (roles.includes('ROLE_TU_SEKOLAH')) return 'tu'
    if (roles.includes('ROLE_BENDAHARA')) return 'bendahara'
    if (roles.includes('ROLE_KEPSEK')) return 'kepsek'
  }
  throw new Error('Akun Anda tidak memiliki peran operasional yang valid.')
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: FormValues) {
    if (lockoutSeconds > 0) return

    setIsLoading(true)

    try {
      // Bersihkan sisa token/sesi usang sebelum mengirim permintaan login baru
      auth.reset()

      const defaultSekolahId = Number(import.meta.env.VITE_DEFAULT_SEKOLAH_ID) || 10
      const loginPayload: Record<string, unknown> = {
        email: data.email,
        username: data.email,
        password: data.password,
      }
      if (defaultSekolahId) {
        loginPayload.sekolah_id = defaultSekolahId
      }

      const response = await apiClient.post<{
        code: number
        status: string
        message: string
        data: LoginResponseData
      }>('/api/v1/auth/login', loginPayload)

      const resData = response.data?.data
      if (!resData || !resData.token) {
        throw new Error('Respon login tidak memuat token otentikasi')
      }

      // Reset hitungan percobaan gagal saat login berhasil
      setFailedAttempts(0)

      const inputUsername = data.email.trim()
      const serverUsername = resData.user.email || inputUsername
      const rawRole = resolveUserRole(resData.user.roles, resData.user.currentRole)

      const cleanNama = (resData.user.nama || 'Staf Kantin').replace(/\s*\([^)]*\)$/, '')
      const userSekolahId = resData.user.sekolah?.id || defaultSekolahId
      const authenticatedUser: AuthUser = {
        userId: resData.user.id,
        nama: cleanNama,
        email: resData.user.email,
        username: serverUsername,
        sekolahId: userSekolahId,
        sekolahNama: resData.user.sekolah?.nama || 'PAUD SKOOLIA',
        roles: resData.user.roles || [],
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
      const errorObj = err as {
        response?: { status?: number; data?: { message?: string } }
        message?: string
      }
      const errorMsg =
        errorObj.response?.data?.message ||
        errorObj.message ||
        'Gagal melakukan proses login staf'

      const nextFailed = failedAttempts + 1
      setFailedAttempts(nextFailed)

      const isRateLimited = errorObj.response?.status === 429
      if (isRateLimited || nextFailed >= 5) {
        setLockoutSeconds(30)
        toast.error('Percobaan Login Melebihi Batas', {
          description:
            'Terlalu banyak percobaan gagal. Akses formulir dibatasi selama 30 detik.',
        })
      } else {
        toast.error('Autentikasi Gagal', { description: errorMsg })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isLocked = lockoutSeconds > 0

  return (
    <div className='space-y-4'>
      {isLocked && (
        <div
          role='alert'
          className='flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive'
        >
          <ShieldAlert className='size-4 shrink-0' />
          <span>
            Terlalu banyak percobaan gagal. Mohon tunggu{' '}
            <strong>{lockoutSeconds} detik</strong> sebelum mencoba kembali.
          </span>
        </div>
      )}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn('grid gap-4', className)}
          {...props}
        >
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Masukkan username'
                    autoComplete='username'
                    disabled={isLoading || isLocked}
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
                <FormLabel>Kata Sandi</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder='Masukkan kata sandi'
                    autoComplete='current-password'
                    disabled={isLoading || isLocked}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type='submit'
            className='mt-2 w-full h-10 font-semibold'
            disabled={isLoading || isLocked}
          >
            {isLoading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : isLocked ? (
              <span>Tunggu {lockoutSeconds} detik...</span>
            ) : (
              <>
                <LogIn className='size-4' />
                <span>Masuk</span>
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
export default UserAuthForm
