import React, { useState } from 'react'
import {
  X,
  Keyboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export interface ManualRfidModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (uid: string) => void
  isProcessing?: boolean
}

export const ManualRfidModal: React.FC<ManualRfidModalProps> = ({
  open,
  onOpenChange,
  onScan,
  isProcessing = false,
}) => {
  const [uidInput, setUidInput] = useState('')

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = uidInput.trim()
    if (!trimmed) return
    onScan(trimmed)
    setUidInput('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md select-none border-none shadow-none rounded-2xl bg-card'>
        <DialogHeader>
          <div className='flex items-center gap-2 text-primary'>
            <Keyboard className='h-5 w-5' />
            <DialogTitle className='text-base font-bold'>
              Input Manual UID Kartu RFID
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs'>
            Gunakan form ini jika perangkat USB RFID Reader mengalami kendala koneksi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          {/* Input Manual UID */}
          <div className='space-y-1.5'>
            <label className='block text-xs font-semibold text-foreground'>
              Nomor UID Kartu RFID:
            </label>
            <div className='flex gap-2'>
              <Input
                value={uidInput}
                onChange={(e) => setUidInput(e.target.value.toUpperCase())}
                placeholder='Masukkan nomor UID kartu...'
                disabled={isProcessing}
                autoFocus
                className='text-sm font-semibold tracking-wider uppercase border-none bg-muted/60 shadow-none focus-visible:bg-muted focus-visible:ring-0 rounded-xl'
              />
              <Button
                type='submit'
                disabled={!uidInput.trim() || isProcessing}
                className='shrink-0 font-semibold border-none rounded-xl shadow-none'
              >
                Proses Tap
              </Button>
            </div>
          </div>

          <DialogFooter className='gap-2 pt-1 sm:justify-end'>
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className='text-xs border-none bg-muted/70 dark:bg-muted/30 text-foreground hover:bg-muted rounded-xl shadow-none'
            >
              <X className='mr-1.5 h-3.5 w-3.5' />
              Tutup
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ManualRfidModal
