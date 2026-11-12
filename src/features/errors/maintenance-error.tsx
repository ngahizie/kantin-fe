import { Button } from '@/components/ui/button'

export function MaintenanceError() {
  return (
    <div className='h-svh bg-background text-foreground'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center'>
        <h1 className='text-[7rem] leading-tight font-bold tabular-nums'>503</h1>
        <span className='font-semibold text-lg'>Sistem Sedang Dalam Pemeliharaan</span>
        <p className='text-center text-sm text-muted-foreground max-w-md'>
          Situs sedang tidak tersedia untuk sementara waktu. Kami akan segera kembali online.
        </p>
        <div className='mt-6 flex gap-3'>
          <Button variant='outline' onClick={() => window.location.reload()}>
            Muat Ulang Halaman
          </Button>
        </div>
      </div>
    </div>
  )
}
