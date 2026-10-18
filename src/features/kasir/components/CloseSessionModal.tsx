import React, { useState } from 'react'
import {
  Lock,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Coins,
  Store,
  Calendar,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatRupiah, formatNumber } from '@/lib/formatters'
import {
  kasirApi,
  type SesiKasirData,
  type RekapSesiData,
} from '../api/kasir-api'

export interface CloseSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesi: SesiKasirData | null
  rekap: RekapSesiData | null
  onSuccess?: () => void
}

export const CloseSessionModal: React.FC<CloseSessionModalProps> = ({
  open,
  onOpenChange,
  sesi,
  rekap,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCloseSession = async () => {
    if (!sesi?.id) {
      toast.error('Data sesi kasir tidak ditemukan')
      return
    }

    try {
      setIsSubmitting(true)
      await kasirApi.tutupSesi(sesi.id)
      toast.success('Sesi kasir harian berhasil ditutup', {
        description: 'Seluruh transaksi sesi ini telah dikunci.',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal menutup sesi kasir'
      toast.error('Gagal Menutup Sesi', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  const jumlahTransaksi =
    rekap?.jumlahTransaksi ?? sesi?.totalTransaksi ?? 0
  const jumlahVoid = rekap?.jumlahVoid ?? 0
  const totalBruto = rekap?.totalBruto ?? sesi?.totalBruto ?? 0
  const totalVoid = rekap?.totalVoid ?? sesi?.totalVoid ?? 0
  const totalBersih = rekap?.totalBersih ?? sesi?.totalBersih ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md sm:max-w-lg border-0 shadow-2xl'>
        <DialogHeader>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
              <Lock className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>
                Tutup Sesi Kasir Harian
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Rekapitulasi penjualan shift kasir sebelum penutupan operasional.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Informasi Titik Kasir & Tanggal */}
        <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3.5 py-2 text-xs'>
          <div className='flex items-center gap-1.5 text-muted-foreground'>
            <Store className='h-3.5 w-3.5 text-primary' />
            <span>Titik:</span>
            <strong className='text-foreground'>
              {sesi?.titikKasirNama || `Titik #${sesi?.titikKasirId || 1}`}
            </strong>
          </div>
          <div className='flex items-center gap-1.5 text-muted-foreground'>
            <Calendar className='h-3.5 w-3.5' />
            <span>Tanggal:</span>
            <strong className='font-mono text-foreground'>
              {sesi?.tanggal || new Date().toISOString().split('T')[0]}
            </strong>
          </div>
        </div>

        {/* Rekapitulasi Metrik Sesi */}
        <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 text-xs'>
          {/* Total Transaksi Sukses */}
          <Card className='border-0 bg-muted/50 shadow-xs'>
            <CardContent className='p-3'>
              <span className='text-[11px] text-muted-foreground flex items-center gap-1 mb-1'>
                <Receipt className='h-3 w-3 text-emerald-600' /> Transaksi Sukses
              </span>
              <span className='font-mono text-lg font-bold text-foreground block'>
                {formatNumber(jumlahTransaksi)}
              </span>
            </CardContent>
          </Card>

          {/* Total Transaksi Void */}
          <Card className='border-0 bg-muted/50 shadow-xs'>
            <CardContent className='p-3'>
              <span className='text-[11px] text-muted-foreground flex items-center gap-1 mb-1'>
                <RotateCcw className='h-3 w-3 text-rose-600' /> Transaksi Void
              </span>
              <span className='font-mono text-lg font-bold text-rose-600 dark:text-rose-400 block'>
                {formatNumber(jumlahVoid)}
              </span>
            </CardContent>
          </Card>

          {/* Total Bruto */}
          <Card className='border-0 bg-muted/50 shadow-xs col-span-2 sm:col-span-1'>
            <CardContent className='p-3'>
              <span className='text-[11px] text-muted-foreground flex items-center gap-1 mb-1'>
                <Coins className='h-3 w-3 text-muted-foreground' /> Total Bruto
              </span>
              <span className='font-mono text-sm font-semibold text-foreground block'>
                {formatRupiah(totalBruto)}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Total Bersih Banner (Highlight) */}
        <div className='rounded-xl border-0 bg-primary/10 p-4 text-center shadow-xs'>
          <span className='text-xs font-semibold text-muted-foreground block mb-0.5'>
            Total Pendapatan Bersih Sesi (Net)
          </span>
          <span className='font-mono text-2xl sm:text-3xl font-extrabold text-primary block'>
            {formatRupiah(totalBersih)}
          </span>
          {totalVoid > 0 && (
            <span className='text-[11px] text-muted-foreground mt-1 block'>
              (Total Bruto {formatRupiah(totalBruto)} - Void {formatRupiah(totalVoid)})
            </span>
          )}
        </div>

        {/* Peringatan Konfirmasi Penguncian */}
        <div className='flex items-start gap-2.5 rounded-lg border-0 bg-amber-500/15 p-3 text-xs text-amber-900 shadow-xs dark:text-amber-200'>
          <AlertTriangle className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5' />
          <span>
            <strong>Konfirmasi Penutupan:</strong> Setelah sesi ditutup, Anda
            tidak dapat lagi memproses tap kartu atau membatalkan void pada sesi
            ini. Seluruh transaksi sesi akan dikunci dan dibukukan ke laporan.
          </span>
        </div>

        <DialogFooter className='gap-2 sm:gap-0 pt-2'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className='border-0 bg-muted/80 text-foreground hover:bg-muted'
          >
            Batal
          </Button>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            onClick={handleCloseSession}
            disabled={isSubmitting}
            className='gap-1.5 font-semibold border-0 shadow-xs'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                <span>Menutup Sesi Kasir...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className='h-3.5 w-3.5' />
                <span>Ya, Tutup Sesi Kasir</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CloseSessionModal
