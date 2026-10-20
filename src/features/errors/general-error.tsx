import { useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
  error?: unknown
  reset?: () => void
}

export function GeneralError({
  className,
  minimal = false,
  error,
  reset,
}: GeneralErrorProps) {
  const navigate = useNavigate()
  const { history } = useRouter()

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : null

  const errorStack = error instanceof Error ? error.stack : null

  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium text-lg'>Oops! Something went wrong {`:')`}</span>
        <p className='text-center text-muted-foreground text-sm max-w-md'>
          Terjadi kesalahan saat memproses permintaan ini. Silakan coba kembali atau muat ulang halaman.
        </p>

        {errorMessage && (
          <div className='mt-3 max-w-lg w-full text-left bg-destructive/10 text-destructive p-3 rounded-lg text-xs font-mono overflow-auto max-h-48 border border-destructive/20'>
            <p className='font-bold mb-1'>Pesan Kesalahan:</p>
            <p className='break-words'>{errorMessage}</p>
            {errorStack && (
              <pre className='mt-2 text-[10px] opacity-75 whitespace-pre-wrap font-mono'>
                {errorStack}
              </pre>
            )}
          </div>
        )}

        {!minimal && (
          <div className='mt-6 flex flex-wrap justify-center gap-3'>
            {reset && (
              <Button onClick={() => reset()} className='gap-1.5'>
                Coba Lagi
              </Button>
            )}
            <Button variant='outline' onClick={() => history.go(-1)}>
              Kembali
            </Button>
            <Button variant='secondary' onClick={() => navigate({ to: '/kontrol-siswa' })}>
              Halaman Kontrol Siswa
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

