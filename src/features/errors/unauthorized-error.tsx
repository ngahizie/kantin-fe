import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function UnauthorisedError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh bg-background text-foreground'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center'>
        <h1 className='text-[7rem] leading-tight font-bold tabular-nums'>401</h1>
        <span className='font-semibold text-lg'>Akses Tidak Sah</span>
        <p className='text-center text-sm text-muted-foreground max-w-md'>
          Silakan masuk dengan kredensial yang sesuai untuk mengakses halaman ini.
        </p>
        <div className='mt-6 flex gap-3'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            Kembali
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>Kembali ke Beranda</Button>
        </div>
      </div>
    </div>
  )
}
