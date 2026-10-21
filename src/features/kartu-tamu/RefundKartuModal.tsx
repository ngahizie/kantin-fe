import { useState } from 'react'
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  User,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import apiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/formatters'
import type { KartuTamuMock } from '@/mocks/mock-data'
import type { KartuTamuSlipData } from './KartuTamuSlipModal'

interface RefundKartuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kartu: KartuTamuMock | null
  onRefundSuccess: (kartuId: number) => void
  onShowSlip: (data: KartuTamuSlipData) => void
}

export function RefundKartuModal({
  open,
  onOpenChange,
  kartu,
  onRefundSuccess,
  onShowSlip,
}: RefundKartuModalProps) {
  const [namaPenerima, setNamaPenerima] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setNamaPenerima('')
    onOpenChange(false)
  }

  if (!kartu) return null

  const isValidSubmit = namaPenerima.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidSubmit) return

    setIsSubmitting(true)
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const seq = Math.floor(1000 + Math.random() * 9000)
    const refNo = `KT-REFUND-${dateCode}-${seq}`

    try {
      try {
        await apiClient.post('/api/kartu-tamu/refund', {
          kartuId: kartu.id,
          referensiId: refNo,
          catatan: `Refund tunai pengembalian kartu tamu oleh ${namaPenerima.trim()}`,
        })
      } catch {
        // Fallback simulasi
      }

      onRefundSuccess(kartu.id)
      toast.success(`Kartu ${kartu.nomor_kartu} berhasil dikembalikan!`, {
        description: `Refund ${formatRupiah(kartu.saldo)} kepada ${namaPenerima.trim()}`,
      })

      onShowSlip({
        type: 'REFUND',
        ref_no: refNo,
        waktu: new Date().toISOString(),
        petugas_nama: 'Wibisana Bama (Petugas TU)',
        nomor_kartu: kartu.nomor_kartu,
        uid: kartu.uid,
        label_pemegang: kartu.label_pemegang,
        saldo_direfund: kartu.saldo,
        nama_penerima: namaPenerima.trim(),
      })

      handleClose()
    } catch {
      toast.error('Gagal memproses pengembalian kartu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md sm:rounded-2xl border-0 shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            Pengembalian Kartu & Refund Tunai
          </DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Sisa saldo akan di-refund tunai kepada pemegang kartu
          </DialogDescription>
        </DialogHeader>

        {/* Info Kartu */}
        <div className='flex items-center justify-between p-3.5 bg-muted/60 rounded-xl'>
          <div className='flex-1 min-w-0'>
            <p className='font-bold font-mono text-foreground'>
              {kartu.nomor_kartu}
            </p>
            <p className='text-xs text-muted-foreground truncate mt-0.5'>
              {kartu.label_pemegang || '(Tanpa label pemegang)'}
            </p>
          </div>
          <div className='text-right shrink-0'>
            <p className='text-xs text-muted-foreground'>Saldo yang di-refund</p>
            <p className='font-bold text-xl text-amber-600 dark:text-amber-400 font-mono'>
              {formatRupiah(kartu.saldo)}
            </p>
          </div>
        </div>

        {/* Warning */}
        <Alert className='border-0 bg-amber-500/10 text-amber-900 dark:text-amber-200'>
          <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
          <AlertDescription className='text-xs leading-relaxed'>
            <strong>Perhatian:</strong> Setelah dikonfirmasi —
            <ul className='mt-1.5 space-y-0.5 list-disc list-inside'>
              <li>
                Saldo <strong>{formatRupiah(kartu.saldo)}</strong> di-refund tunai
              </li>
              <li>Saldo kartu direset menjadi Rp 0</li>
              <li>Label pemegang dikosongkan (kartu siap pakai ulang)</li>
              <li>Status kartu berubah menjadi <strong>AVAILABLE</strong></li>
            </ul>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Nama Penerima */}
          <div className='space-y-2'>
            <Label
              htmlFor='nama-penerima'
              className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'
            >
              Nama Penerima Refund
            </Label>
            <div className='relative'>
              <User className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                id='nama-penerima'
                placeholder='Contoh: Pak Hartono (Guru Fisika)'
                value={namaPenerima}
                onChange={(e) => setNamaPenerima(e.target.value)}
                className='pl-9 h-11 text-sm'
                required
              />
            </div>
          </div>

          <DialogFooter className='gap-2 pt-1'>
            <Button
              type='button'
              variant='secondary'
              onClick={handleClose}
              className='border-0 bg-muted/80 hover:bg-muted text-foreground shadow-none flex-1 sm:flex-none'
            >
              Batal
            </Button>
            <Button
              type='submit'
              disabled={!isValidSubmit || isSubmitting}
              className='flex-1 sm:flex-none gap-2'
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className='h-4 w-4 animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className='h-4 w-4' />
                  Konfirmasi Refund & Kembalikan Kartu
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
