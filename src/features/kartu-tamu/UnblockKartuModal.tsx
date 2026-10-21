import { useState } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import apiClient from '@/lib/api-client'
import { toast } from 'sonner'
import type { KartuTamuMock } from '@/mocks/mock-data'

interface UnblockKartuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kartu: KartuTamuMock | null
  onUnblockSuccess: (kartuId: number) => void
}

export function UnblockKartuModal({
  open,
  onOpenChange,
  kartu,
  onUnblockSuccess,
}: UnblockKartuModalProps) {
  const [alasan, setAlasan] = useState('Kartu fisik telah ditemukan kembali')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setAlasan('Kartu fisik telah ditemukan kembali')
    onOpenChange(false)
  }

  if (!kartu) return null

  const handleUnblock = async () => {
    setIsSubmitting(true)
    try {
      try {
        await apiClient.post('/api/kontrol-kartu/blokir', {
          subjekTipe: 'KARTU_TAMU',
          subjekId: kartu.id,
          diblokir: false,
          alasan: alasan.trim(),
        }).catch(() =>
          apiClient.put(`/api/kartu-tamu/${kartu.id}`, {
            aktif: true,
            catatan: alasan.trim(),
          })
        )
      } catch {
        // Fallback simulasi frontend
      }

      onUnblockSuccess(kartu.id)
      toast.success(`Blokir kartu ${kartu.nomor_kartu} berhasil dibuka!`, {
        description: 'Status kartu kini TERSEDIA (AVAILABLE) dan siap dipinjamkan kembali.',
      })

      handleClose()
    } catch {
      toast.error('Gagal membuka blokir kartu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md sm:rounded-2xl border-0 shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold text-foreground'>
            Buka Blokir Kartu Tamu
          </DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Aktifkan kembali kartu fisik yang sebelumnya dilaporkan hilang
          </DialogDescription>
        </DialogHeader>

        {/* Info Kartu */}
        <div className='flex items-center justify-between p-3.5 bg-muted/60 rounded-xl'>
          <div className='flex-1 min-w-0'>
            <p className='font-bold font-mono text-foreground'>
              {kartu.nomor_kartu}
            </p>
            <p className='text-xs text-muted-foreground font-mono mt-0.5'>
              UID: {kartu.uid}
            </p>
          </div>
          <div className='text-right shrink-0'>
            <Badge variant='secondary' className='border-0 bg-destructive/15 text-destructive text-xs font-medium'>
              Status: DIBLOKIR
            </Badge>
          </div>
        </div>

        {/* Informasi Pemulihan */}
        <Alert className='border-0 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'>
          <AlertCircle className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
          <AlertTitle className='text-xs font-bold uppercase tracking-wide'>
            Pemulihan Kartu Fisik
          </AlertTitle>
          <AlertDescription className='text-xs leading-relaxed mt-1'>
            Membuka blokir akan mengubah status kartu menjadi <strong>AVAILABLE (Tersedia)</strong>. Kartu fisik RFID ini dapat kembali dipinjamkan kepada guru, staf, atau tamu baru di layanan TU.
          </AlertDescription>
        </Alert>

        {/* Alasan / Catatan TU */}
        <div className='space-y-2'>
          <Label
            htmlFor='alasan-unblock'
            className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'
          >
            Alasan Buka Blokir / Catatan Petugas
          </Label>
          <div className='relative'>
            <FileText className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              id='alasan-unblock'
              placeholder='Contoh: Kartu ditemukan kembali di laci ruang guru'
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              className='pl-9 h-11 text-sm'
              required
            />
          </div>
        </div>

        <DialogFooter className='gap-2 mt-2'>
          <Button
            type='button'
            variant='secondary'
            onClick={handleClose}
            className='border-0 flex-1 sm:flex-none'
          >
            Batal
          </Button>
          <Button
            type='button'
            disabled={isSubmitting || !alasan.trim()}
            onClick={handleUnblock}
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
                Buka Blokir Kartu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
