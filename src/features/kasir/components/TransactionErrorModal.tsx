import React from 'react'
import {
  AlertOctagon,
  Wallet,
  ShieldAlert,
  HelpCircle,
  Clock,
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
}

export interface TransactionErrorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorInfo: TransactionErrorInfo | null
}

export const TransactionErrorModal: React.FC<TransactionErrorModalProps> = ({
  open,
  onOpenChange,
  errorInfo,
}) => {
  if (!errorInfo) return null

  const isSaldoKurang =
    Boolean(errorInfo.kekurangan) ||
    errorInfo.message.toLowerCase().includes('saldo kurang')
  const isKartuDiblokir = errorInfo.message.toLowerCase().includes('diblokir')
  const isKartuTidakDikenal = errorInfo.message
    .toLowerCase()
    .includes('tidak dikenal')
  const isLimitHarian = errorInfo.message.toLowerCase().includes('limit harian')
  const isStokKurang = errorInfo.message.toLowerCase().includes('stok')

  const getErrorIcon = () => {
    if (isSaldoKurang) return <Wallet className='h-7 w-7' />
    if (isKartuDiblokir) return <ShieldAlert className='h-7 w-7' />
    if (isKartuTidakDikenal) return <HelpCircle className='h-7 w-7' />
    if (isLimitHarian) return <Clock className='h-7 w-7' />
    if (isStokKurang) return <PackageX className='h-7 w-7' />
    return <AlertOctagon className='h-7 w-7' />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md border-none p-6 select-none shadow-2xl'>
        <DialogHeader className='pb-2 text-center'>
          <div className='mx-auto mb-2 flex h-14 w-14 animate-in items-center justify-center rounded-2xl bg-destructive/10 text-destructive duration-200 zoom-in-75'>
            {getErrorIcon()}
          </div>
          <DialogTitle className='text-xl font-bold tracking-tight text-destructive'>
            Transaksi Kasir Ditolak
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            Server mendeteksi kegagalan pada tahap validasi transaksi tap RFID.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {/* Banner Saldo Kurang Menonjol */}
          {isSaldoKurang ? (
            <div className='space-y-1.5 rounded-xl border-none bg-destructive/10 p-4 text-center shadow-xs'>
              <span className='text-xs font-semibold tracking-wide text-destructive uppercase'>
                Kekurangan Nominal Saldo:
              </span>
              <p className='font-mono text-2xl font-extrabold text-destructive sm:text-3xl'>
                {errorInfo.kekurangan
                  ? formatRupiah(errorInfo.kekurangan)
                  : errorInfo.message}
              </p>
              <p className='pt-1 text-xs text-muted-foreground'>
                Siswa perlu melakukan top up tunai di loket TU sebelum
                menyelesaikan transaksi.
              </p>
            </div>
          ) : (
            /* Pesan Error Standar yang Jelas */
            <div className='rounded-xl border-none bg-destructive/10 p-4 text-center shadow-xs'>
              <p className='text-sm font-bold text-destructive sm:text-base'>
                {errorInfo.message}
              </p>
            </div>
          )}

          {errorInfo.uid && (
            <div className='flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground'>
              <span>UID Terbaca:</span>
              <span className='rounded bg-muted px-2 py-0.5 font-bold text-foreground'>
                {errorInfo.uid}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className='pt-2 sm:justify-center'>
          <Button
            type='button'
            variant='destructive'
            onClick={() => onOpenChange(false)}
            className='w-full gap-1.5 px-6 font-semibold sm:w-auto border-none shadow-xs'
          >
            <X className='h-4 w-4' />
            <span>Tutup &amp; Sesuaikan Pesanan</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TransactionErrorModal
