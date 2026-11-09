import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  return (
    <AuthLayout>
      <Card className='w-full max-w-[390px] gap-5 border-0 bg-muted/70 dark:bg-muted/40 py-8 px-6 sm:px-7'>
        <CardHeader className='pb-1 px-0'>
          <div className='flex justify-center mb-2'>
            <img
              src='/skoolia-gelap.png'
              alt='Kantin SKOOLIA'
              className='h-8 sm:h-9 w-auto object-contain dark:hidden'
            />
            <img
              src='/skoolia-terang.png'
              alt='Kantin SKOOLIA'
              className='h-8 sm:h-9 w-auto object-contain hidden dark:block'
            />
          </div>
        </CardHeader>
        <CardContent className='pt-1 px-0'>
          <UserAuthForm />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

export default SignIn
