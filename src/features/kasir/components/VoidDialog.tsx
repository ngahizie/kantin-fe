import React, { useState } from 'react'
import {
  RotateCcw,
  AlertTriangle,
  Receipt,
  User,
  Clock,
  Coins,
  Loader2,
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { formatRupiah, formatDateTime } from '@/lib/formatters'
import { useBeepAudio } from '@/hooks/useBeepAudio'
import {
  kasirApi,
  PILIHAN_ALASAN_VOID,
  type TransaksiSesiItem,
  type AlasanVoidType,
} from '../api/kasir-api'

export interface VoidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: TransaksiSesiItem | null
  onSuccess?: () => void
}

export const VoidDialog: React.FC<VoidDialogProps> = ({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}) => {
  const [selectedAlasan, setSelectedAlasan] = useState<AlasanVoidType>(
    PILIHAN_ALASAN_VOID[0]
  )
  const [keteranganLainnya, setKeteranganLainnya] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { playVoid, playError } = useBeepAudio()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedAlasan(PILIHAN_ALASAN_VOID[0])
      setKeteranganLainnya('')
      setIsSubmitting(false)
    }
    onOpenChange(nextOpen)
  }

  if (!transaction) return null

  const handleConfirmVoid = async () => {
    let alasanFinal: string = selectedAlasan
    if (selectedAlasan === 'Lainnya') {
      const trimmed = keteranganLainnya.trim()
      if (!trimmed || trimmed.length < 3) {
        toast.error('Alasan kustom wajib diisi minimal 3 karakter')
        return
      }
      alasanFinal = trimmed
    }

    try {
      setIsSubmitting(true)
      await kasirApi.voidTransaksi(transaction.id, alasanFinal)
      playVoid()
      toast.success(
        `Transaksi #${transaction.nomorReferensi || transaction.id} berhasil dibatalkan (void)`,
        {
          description: 'Saldo pembeli dan stok menu telah dikembalikan.',
        }
      )
      handleOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      playError()
      const msg =
        err instanceof Error ? err.message : 'Gagal memproses void transaksi'
      toast.error('Gagal Membatalkan Transaksi', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-md sm:max-w-lg border-none shadow-none rounded-2xl bg-card'>
        <DialogHeader>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600'>
              <RotateCcw className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>
                Void Transaksi Kasir
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Batalkan transaksi yang salah atau tidak sesuai pada sesi berjalan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Warning Banner */}
        <div className='flex items-start gap-2.5 rounded-xl border-none bg-amber-500/15 p-3 text-xs text-amber-900 dark:text-amber-200'>
          <AlertTriangle className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5' />
          <span>
            <strong>Perhatian:</strong> Pembatalan (void) akan mengembalikan
            saldo ke akun pembeli dan mengembalikan stok barang ke sistem secara
            otomatis. Tindakan ini tidak dapat dibatalkan kembali.
          </span>
        </div>

        {/* Detail Ringkas Transaksi */}
        <div className='space-y-2 rounded-2xl border-none bg-muted/70 dark:bg-muted/30 p-3.5 text-xs shadow-none'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Receipt className='h-3.5 w-3.5' /> No. Referensi
            </span>
            <span className='font-mono font-semibold text-foreground'>
              {transaction.nomorReferensi || `#${transaction.id}`}
            </span>
          </div>

          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <User className='h-3.5 w-3.5' /> Pembeli
            </span>
            <div className='flex items-center gap-1.5'>
              <span className='font-medium text-foreground'>
                {transaction.pembeliNama}
              </span>
              <Badge variant='secondary' className='text-[10px] py-0 px-2 rounded-full border-none bg-background/80 shadow-none font-semibold uppercase tracking-wide'>
                {transaction.pembeliTipe === 'SISWA' ? 'Siswa' : 'Kartu Tamu'}
              </Badge>
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground flex items-center gap-1.5'>
              <Clock className='h-3.5 w-3.5' /> Waktu Transaksi
            </span>
            <span className='text-muted-foreground font-mono'>
              {formatDateTime(transaction.waktu)}
            </span>
          </div>

          <div className='border-none pt-2 flex items-center justify-between'>
            <span className='font-semibold text-foreground flex items-center gap-1.5'>
              <Coins className='h-3.5 w-3.5 text-primary' /> Total Tagihan
            </span>
            <span className='font-mono font-bold text-sm text-primary'>
              {formatRupiah(transaction.total)}
            </span>
          </div>
        </div>

        {/* Pilihan Alasan Void Wajib */}
        <div className='space-y-2.5 pt-1'>
          <Label className='text-xs font-semibold'>
            Alasan Pembatalan (Wajib Dipilih)
          </Label>
          <RadioGroup
            value={selectedAlasan}
            onValueChange={(val) => setSelectedAlasan(val as AlasanVoidType)}
            className='space-y-1.5'
          >
            {PILIHAN_ALASAN_VOID.map((alasan) => (
              <label
                key={alasan}
                htmlFor={`void-reason-${alasan}`}
                className={`flex cursor-pointer items-center justify-between rounded-xl border-none p-3 text-xs transition-colors hover:bg-muted/70 ${
                  selectedAlasan === alasan
                    ? 'bg-primary/10 font-semibold text-foreground shadow-none'
                    : 'bg-muted/40 text-muted-foreground'
                }`}
              >
                <span>{alasan}</span>
                <RadioGroupItem value={alasan} id={`void-reason-${alasan}`} className='border-none bg-muted shadow-none' />
              </label>
            ))}
          </RadioGroup>

          {/* Input Alasan Kustom jika 'Lainnya' dipilih */}
          {selectedAlasan === 'Lainnya' && (
            <div className='space-y-1 pt-1'>
              <Label
                htmlFor='keterangan-lainnya'
                className='text-[11px] text-muted-foreground'
              >
                Tuliskan alasan pembatalan secara detail
              </Label>
              <Textarea
                id='keterangan-lainnya'
                placeholder='Contoh: Kartu tertukar saat tap di antrean'
                value={keteranganLainnya}
                onChange={(e) => setKeteranganLainnya(e.target.value)}
                rows={2}
                className='text-xs border-none bg-muted/60 focus-visible:bg-muted focus-visible:ring-0 rounded-xl shadow-none'
              />
            </div>
          )}
        </div>

        <DialogFooter className='gap-2 sm:gap-0 pt-2'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className='border-none bg-muted/70 dark:bg-muted/30 text-foreground hover:bg-muted rounded-xl shadow-none'
          >
            Batal
          </Button>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            onClick={handleConfirmVoid}
            disabled={isSubmitting}
            className='gap-1.5 font-semibold border-none rounded-xl shadow-none'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                <span>Memproses Void...</span>
              </>
            ) : (
              <>
                <RotateCcw className='h-3.5 w-3.5' />
                <span>Konfirmasi Void Transaksi</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default VoidDialog
