import React from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  Wallet,
  ShieldAlert,
  HelpCircle,
  Clock,
  RotateCcw,
  X,
  PackageX,
} from 'lucide-react'
import { formatRupiah } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface TransactionErrorInfo {
  message: string
  kekurangan?: number
  uid?: string
  status?: number
  isTransient?: boolean
}

interface TransactionErrorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorInfo: TransactionErrorInfo | null
  onRetry?: () => void
}

export const TransactionErrorModal: React.FC<TransactionErrorModalProps> = ({
  open,
  onOpenChange,
  errorInfo,
  onRetry,
}) => {
  if (!errorInfo) return null

  const isTransient = Boolean(errorInfo.isTransient || errorInfo.status === 503)
  const isSaldoKurang =
    !isTransient &&
    (Boolean(errorInfo.kekurangan) ||
      errorInfo.message.toLowerCase().includes('saldo kurang'))
  const isKartuDiblokir =
    !isTransient && errorInfo.message.toLowerCase().includes('diblokir')
  const isKartuTidakDikenal =
    !isTransient && errorInfo.message.toLowerCase().includes('tidak dikenal')
  const isLimitHarian =
    !isTransient && errorInfo.message.toLowerCase().includes('limit harian')
  const isStokKurang =
    !isTransient && errorInfo.message.toLowerCase().includes('stok')

  const getErrorIcon = () => {
    if (isTransient) return <AlertTriangle className='h-7 w-7' />
    if (isSaldoKurang) return <Wallet className='h-7 w-7' />
    if (isKartuDiblokir) return <ShieldAlert className='h-7 w-7' />
    if (isKartuTidakDikenal) return <HelpCircle className='h-7 w-7' />
    if (isLimitHarian) return <Clock className='h-7 w-7' />
    if (isStokKurang) return <PackageX className='h-7 w-7' />
    return <AlertOctagon className='h-7 w-7' />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md p-6 select-none'>
        <DialogHeader className='pb-2 text-center'>
          <div
            className={
              isTransient
                ? 'mx-auto mb-2 flex h-14 w-14 animate-in items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 duration-200 zoom-in-75 dark:text-amber-400'
                : 'mx-auto mb-2 flex h-14 w-14 animate-in items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive duration-200 zoom-in-75'
            }
          >
            {getErrorIcon()}
          </div>
          <DialogTitle
            className={
              isTransient
                ? 'text-xl font-bold tracking-tight text-amber-700 dark:text-amber-400'
                : 'text-xl font-bold tracking-tight text-destructive'
            }
          >
            {isTransient ? 'Server Sedang Sibuk' : 'Transaksi Kasir Ditolak'}
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            {isTransient
              ? 'Antrean transaksi sedang padat. Pesanan tetap tersimpan dan aman untuk dicoba ulang.'
              : 'Server mendeteksi kegagalan pada tahap validasi transaksi tap RFID.'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {/* Banner Saldo Kurang Menonjol */}
          {isSaldoKurang ? (
            <div className='space-y-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center'>
              <span className='text-xs font-semibold tracking-wide text-destructive uppercase'>
                Kekurangan Nominal Saldo:
              </span>
              <p className='text-2xl font-bold tracking-tight tabular-nums text-destructive sm:text-3xl'>
                {errorInfo.kekurangan
                  ? formatRupiah(errorInfo.kekurangan)
                  : errorInfo.message}
              </p>
              <p className='pt-1 text-xs text-muted-foreground'>
                Siswa perlu melakukan top up tunai di Layanan TU sebelum
                menyelesaikan transaksi.
              </p>
            </div>
          ) : (
            /* Pesan Error Standar yang Jelas */
            <div
              className={
                isTransient
                  ? 'rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center'
                  : 'rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center'
              }
            >
              <p
                className={
                  isTransient
                    ? 'text-sm font-bold text-amber-800 sm:text-base dark:text-amber-300'
                    : 'text-sm font-bold text-destructive sm:text-base'
                }
              >
                {errorInfo.message}
              </p>
            </div>
          )}

          {errorInfo.uid && (
            <div className='flex items-center justify-center gap-2 text-xs text-muted-foreground'>
              <span>UID Terbaca:</span>
              <span className='rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono font-bold tracking-wider tabular-nums text-foreground'>
                {errorInfo.uid}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className='gap-2 pt-2 sm:justify-center'>
          {isTransient && onRetry && (
            <Button
              type='button'
              onClick={onRetry}
              className='w-full gap-1.5 px-6 font-semibold sm:w-auto'
            >
              <RotateCcw className='h-4 w-4' />
              <span>Coba Lagi</span>
            </Button>
          )}
          <Button
            type='button'
            variant={isTransient ? 'outline' : 'destructive'}
            onClick={() => onOpenChange(false)}
            className='w-full gap-1.5 px-6 font-semibold sm:w-auto'
          >
            <X className='h-4 w-4' />
            <span>
              {isTransient ? 'Tutup' : 'Tutup & Sesuaikan Pesanan'}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
