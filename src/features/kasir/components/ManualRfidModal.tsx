import React, { useState, useRef, useEffect, useCallback } from 'react'
import { CreditCard, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRfidScanner } from '@/hooks/useRfidScanner'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const hasSubmittedRef = useRef(false)

  const handleExecute = useCallback(
    (uidToProcess: string) => {
      const trimmed = uidToProcess.trim()
      if (!trimmed || isProcessing || hasSubmittedRef.current) return

      hasSubmittedRef.current = true
      onScan(trimmed)
      setUidInput('')
      onOpenChange(false)
    },
    [isProcessing, onScan, onOpenChange]
  )

  // Integrasi listener RFID scanner global saat modal sedang terbuka
  useRfidScanner({
    onScan: (scannedUid) => {
      handleExecute(scannedUid)
    },
    enabled: open,
  })

  // Deteksi otomatis saat kartu di-scan (misal UID 8-16 digit desimal/hex atau kartu tamu)
  useEffect(() => {
    const trimmed = uidInput.trim()
    if (!trimmed) return

    // Pola kartu RFID: 8-16 digit desimal (Mifare), 8-16 hex chars, atau nomor kartu tamu KT-xx
    const isCompletedUid =
      /^\d{8,16}$/.test(trimmed) ||
      /^[0-9a-fA-F]{8,16}$/.test(trimmed) ||
      /^KT-\d+$/i.test(trimmed)

    if (!isCompletedUid) return

    // Eksekusi otomatis seketika (60ms) tanpa perlu klik tombol
    const timer = setTimeout(() => {
      handleExecute(trimmed)
    }, 60)

    return () => clearTimeout(timer)
  }, [uidInput, handleExecute])

  // Auto focus & select input saat modal terbuka
  useEffect(() => {
    if (open) {
      hasSubmittedRef.current = false
      const t = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
      return () => clearTimeout(t)
    } else {
      setUidInput('')
    }
  }, [open])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    handleExecute(uidInput)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md select-none border-none shadow-none rounded-2xl bg-card'>
        <DialogHeader>
          <div className='flex items-center gap-2 text-primary'>
            <CreditCard className='h-5 w-5' />
            <DialogTitle className='text-base font-bold'>
              Bayar / Tap Kartu RFID
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs'>
            Dekatkan kartu RFID ke alat scanner atau masukkan nomor UID untuk langsung memproses pembayaran.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          {/* Input UID */}
          <div className='space-y-1.5'>
            <label className='block text-xs font-semibold text-foreground'>
              Nomor UID Kartu RFID:
            </label>
            <div className='flex gap-2'>
              <Input
                ref={inputRef}
                value={uidInput}
                onChange={(e) => setUidInput(e.target.value.toUpperCase())}
                onFocus={(e) => e.target.select()}
                placeholder='Tap kartu RFID atau masukkan UID...'
                disabled={isProcessing}
                autoFocus
                className='text-sm font-semibold tracking-wider uppercase border-none bg-muted/60 shadow-none focus-visible:bg-muted focus-visible:ring-0 rounded-xl'
              />
              <Button
                type='submit'
                disabled={!uidInput.trim() || isProcessing}
                className='shrink-0 font-semibold border-none rounded-xl shadow-none'
              >
                {isProcessing ? (
                  <RefreshCw className='h-4 w-4 animate-spin' />
                ) : (
                  'Proses Tap'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ManualRfidModal
