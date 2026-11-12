import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh bg-background text-foreground'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center'>
        <h1 className='text-[7rem] leading-tight font-bold tabular-nums'>404</h1>
        <span className='font-semibold text-lg'>Halaman Tidak Ditemukan</span>
        <p className='text-center text-sm text-muted-foreground max-w-md'>
          Halaman yang Anda cari tidak tersedia atau mungkin telah dipindahkan.
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
