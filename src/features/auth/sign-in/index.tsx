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
  return (
    <AuthLayout>
      <Card className='w-full max-w-[390px] gap-5 border-0 bg-muted/70 dark:bg-muted/40 py-8 px-6 sm:px-7'>
        <CardHeader className='pb-1 px-0'>
          <div className='flex justify-center mb-4'>
            <div className='flex aspect-square size-12 items-center justify-center rounded-2xl overflow-hidden bg-muted dark:bg-white p-2'>
              <img
                src='/logo.png'
                alt='Kantin SKOOLIA'
                className='size-full object-contain'
              />
            </div>
          </div>
          <CardTitle className='text-xl font-bold tracking-tight text-center'>
            Masuk
          </CardTitle>
          <CardDescription className='text-xs leading-relaxed'>
            Gunakan akun staf terdaftar pada portal SKOOLIA untuk mengakses terminal kasir POS atau panel backoffice pengelola.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-1 px-0'>
          <UserAuthForm />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

export default SignIn
