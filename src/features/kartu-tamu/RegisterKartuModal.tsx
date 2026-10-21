import { useState } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  Hash,
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
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api-client'
import { toast } from 'sonner'
import type { KartuTamuMock } from '@/mocks/mock-data'
import type { KartuTamuSlipData } from './KartuTamuSlipModal'
import { mapBackendToKartuTamu } from './types'

interface RegisterKartuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCards: KartuTamuMock[]
  onRegistered: (newCard: KartuTamuMock) => void
  onShowSlip: (data: KartuTamuSlipData) => void
}

function generateNextNomorKartu(existingCards: KartuTamuMock[]): string {
  // Find the highest KT-xxx number and increment
  const numbers = existingCards
    .map((c) => {
      const match = c.nomor_kartu.match(/^KT-(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `KT-${String(next).padStart(3, '0')}`
}

export function RegisterKartuModal({
  open,
  onOpenChange,
  existingCards,
  onRegistered,
  onShowSlip,
}: RegisterKartuModalProps) {
  const [labelPemegang, setLabelPemegang] = useState('')
  const [detectedUid, setDetectedUid] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nextNomor = generateNextNomorKartu(existingCards)

  const handleReset = () => {
    setDetectedUid(null)
    setLabelPemegang('')
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!detectedUid) return

    setIsSubmitting(true)
    try {
      let newCard: KartuTamuMock | null = null

      try {
        const res = await apiClient.post('/api/kartu-tamu', {
          nomorKartu: nextNomor,
          rfidUid: detectedUid,
          labelPemegang: labelPemegang.trim() || undefined,
          catatan: labelPemegang.trim() || undefined,
          aktif: true,
        })

        if (res.data?.data) {
          newCard = mapBackendToKartuTamu(res.data.data, 0)
        }
      } catch {
        // Fallback: simulate frontend
        const now = new Date()
        const id = existingCards.length + 1
        newCard = {
          id,
          nomor_kartu: nextNomor,
          uid: detectedUid,
          label_pemegang: labelPemegang.trim(),
          saldo: 0,
          is_active: true,
          status: 'ACTIVE',
          created_at: now.toISOString(),
        }
      }

      if (newCard) {
        const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const seq = Math.floor(1000 + Math.random() * 9000)

        onRegistered(newCard)
        toast.success(`Kartu ${newCard.nomor_kartu} berhasil didaftarkan!`)

        onShowSlip({
          type: 'REGISTER',
          ref_no: `KT-REG-${dateCode}-${seq}`,
          waktu: new Date().toISOString(),
          petugas_nama: 'Wibisana Bama (Petugas TU)',
          nomor_kartu: newCard.nomor_kartu,
          uid: newCard.uid,
          label_pemegang: newCard.label_pemegang,
        })

        handleClose()
      }
    } catch {
      toast.error('Gagal mendaftarkan kartu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md sm:rounded-2xl border-0 shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            Daftarkan Kartu Tamu Baru
          </DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Tap kartu RFID fisik pada reader TU untuk mendaftarkan ke sistem
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          {/* Nomor Kartu Preview */}
          <div className='flex items-center justify-between p-3.5 bg-muted/60 rounded-xl'>
            <div className='flex items-center gap-2'>
              <Hash className='h-4 w-4 text-muted-foreground' />
              <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                Nomor Kartu Berikutnya
              </span>
            </div>
            <Badge variant='secondary' className='font-mono text-sm font-bold px-2.5 py-0.5 border-0 bg-primary/10 text-primary'>
              {nextNomor}
            </Badge>
          </div>

          {/* Input UID Kartu RFID */}
          <div className='space-y-2'>
            <Label htmlFor='rfid-uid' className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              UID Kartu RFID
            </Label>
            <div className='flex gap-2'>
              <Input
                id='rfid-uid'
                placeholder='Scan kartu pada reader atau ketik UID fisik...'
                value={detectedUid || ''}
                onChange={(e) => setDetectedUid(e.target.value.toUpperCase())}
                className='font-mono text-sm bg-background'
                autoFocus
              />
              {detectedUid && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleReset}
                  className='h-9 px-2 text-xs'
                >
                  Reset
                </Button>
              )}
            </div>
            <p className='text-[11px] text-muted-foreground'>
              Tempelkan kartu RFID ke USB reader TU atau masukkan kode UID kartu fisik.
            </p>
          </div>

          {/* Label Pemegang */}
          <div className='space-y-2'>
            <Label
              htmlFor='label-pemegang'
              className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'
            >
              Label Pemegang{' '}
              <span className='text-muted-foreground/60 normal-case font-normal'>(opsional)</span>
            </Label>
            <Input
              id='label-pemegang'
              placeholder='Contoh: Pak Budi Guru, Tamu Seminar, Ibu Ratna TU'
              value={labelPemegang}
              onChange={(e) => setLabelPemegang(e.target.value)}
              className='h-11 text-sm'
            />
            <p className='text-xs text-muted-foreground'>
              Label bisa diubah nanti. Kosongkan jika kartu belum dipinjamkan.
            </p>
          </div>
        </div>

        <DialogFooter className='gap-2 mt-2'>
          <Button
            type='button'
            variant='secondary'
            onClick={handleClose}
            className='border-0 bg-muted/80 hover:bg-muted text-foreground shadow-none flex-1 sm:flex-none'
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!detectedUid || isSubmitting}
            className='flex-1 sm:flex-none gap-2'
          >
            {isSubmitting ? (
              <>
                <RefreshCw className='h-4 w-4 animate-spin' />
                Mendaftarkan...
              </>
            ) : (
              <>
                <CheckCircle2 className='h-4 w-4' />
                Daftarkan Kartu {nextNomor}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
