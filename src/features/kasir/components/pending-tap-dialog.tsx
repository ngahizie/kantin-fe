import React from 'react'
import {
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { formatRupiah } from '@/lib/formatters'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TapTransaksiData } from '../types'

export interface PendingTapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingTaps: TapTransaksiData[]
  onConfirm: (pendingId: number) => Promise<void>
  onCancel: (pendingId: number) => Promise<void>
  isSubmitting?: boolean
  errorMessage?: string | null
}

export const PendingTapDialog: React.FC<PendingTapDialogProps> = ({
  open,
  onOpenChange,
  pendingTaps,
  onConfirm,
  onCancel,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const currentTap = pendingTaps[0] ?? null
  if (!currentTap || !currentTap.pendingId) return null

  const pendingId = currentTap.pendingId
  const pembeli = currentTap.pembeli
  const namaPembeli = pembeli?.nama || 'Pembeli'
  const kelasPembeli = pembeli?.kelas || null
  const fotoUrl = pembeli?.fotoUrl || pembeli?.foto_url || null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className='max-w-md overflow-hidden p-6'>
        <DialogHeader className='pb-2 text-center'>
          <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'>
            <Clock className='h-6 w-6' />
          </div>
          <div className='flex items-center justify-center gap-2'>
            <DialogTitle className='text-lg font-bold tracking-tight text-foreground'>
              Menunggu Konfirmasi
            </DialogTitle>
            {pendingTaps.length > 1 && (
              <Badge
                variant='secondary'
                className='rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums'
              >
                1 dari {pendingTaps.length}
              </Badge>
            )}
          </div>
          <DialogDescription className='text-xs text-muted-foreground'>
            Mode konfirmasi manual aktif. Saldo siswa dan stok menu{' '}
            <strong className='text-foreground'>belum dipotong</strong> sampai
            Anda menekan tombol Konfirmasi.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col items-center gap-4 py-2'>
          <Avatar className='h-28 w-28 rounded-xl border border-border'>
            {fotoUrl && (
              <AvatarImage
                src={fotoUrl}
                alt={namaPembeli}
                className='object-cover'
              />
            )}
            <AvatarFallback className='rounded-xl bg-muted text-muted-foreground'>
              <User className='h-14 w-14 stroke-[1.5]' />
            </AvatarFallback>
          </Avatar>

          <div className='text-center'>
            <h3 className='text-lg font-bold tracking-tight text-foreground'>
              {namaPembeli}
            </h3>
            {kelasPembeli && (
              <p className='text-xs font-medium text-muted-foreground'>
                Kelas {kelasPembeli}
              </p>
            )}
          </div>

          <div className='w-full space-y-2 rounded-xl border border-border bg-muted/40 p-3.5 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Status:</span>
              <Badge
                variant='outline'
                className='border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              >
                Saldo Belum Dipotong
              </Badge>
            </div>
            <div className='flex items-center justify-between border-t border-border pt-2 text-base font-bold'>
              <span className='text-foreground'>Total Tagihan:</span>
              <span className='tabular-nums text-primary'>
                {formatRupiah(currentTap.total)}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div
              role='alert'
              className='flex w-full items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'
            >
              <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className='flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            type='button'
            variant='outline'
            disabled={isSubmitting}
            onClick={() => void onCancel(pendingId)}
            className='gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive'
          >
            <XCircle className='h-4 w-4' />
            <span>Batalkan</span>
          </Button>
          <Button
            type='button'
            disabled={isSubmitting}
            onClick={() => void onConfirm(pendingId)}
            className='gap-1.5'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className='h-4 w-4' />
                <span>Konfirmasi</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PendingTapDialog
