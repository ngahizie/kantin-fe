import { useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='w-full max-w-[390px] gap-5 border-0 bg-muted/70 dark:bg-muted/40 py-8 px-6 sm:px-7'>
        <CardHeader className='pb-1 px-0'>
          <CardTitle className='text-xl font-bold tracking-tight'>
            Masuk Staf Kantin
          </CardTitle>
          <CardDescription className='text-xs leading-relaxed'>
            Gunakan akun staf terdaftar pada portal SKOOLIA untuk mengakses terminal kasir POS atau panel backoffice pengelola.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-1 px-0'>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

export default SignIn
