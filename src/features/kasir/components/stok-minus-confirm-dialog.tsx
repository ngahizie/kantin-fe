import React, { useState, useId } from 'react'
import { AlertTriangle, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CartItem } from '@/stores/use-cart-store'
import { PILIHAN_ALASAN_STOK_MINUS, type AlasanStokMinusType } from '../types'

export interface StokMinusConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  minusItems: CartItem[]
  onConfirm: (alasan: string) => void | Promise<void>
  onCancel: () => void
  isProcessing?: boolean
}

const MAX_ALASAN_LENGTH = 200

function StokMinusConfirmContent({
  minusItems,
  onConfirm,
  onCancel,
  isProcessing = false,
}: Omit<StokMinusConfirmDialogProps, 'open' | 'onOpenChange'>) {
  const [selectedPreset, setSelectedPreset] = useState<AlasanStokMinusType | ''>('')
  const [customAlasan, setCustomAlasan] = useState('')
  const customInputId = useId()

  const isCustom = selectedPreset === 'Lain-lain'
  const trimmedCustom = customAlasan.trim()
  const finalAlasan = isCustom ? trimmedCustom : selectedPreset
  const isValid =
    Boolean(selectedPreset) &&
    (!isCustom || (trimmedCustom.length > 0 && trimmedCustom.length <= MAX_ALASAN_LENGTH))

  const itemNames = minusItems.map((it) => it.menu.nama).join(', ')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || isProcessing) return
    void onConfirm(finalAlasan.slice(0, MAX_ALASAN_LENGTH))
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <DialogHeader>
        <div className='flex items-center gap-2.5'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300'>
            <AlertTriangle className='size-4' />
          </div>
          <div className='min-w-0 flex-1'>
            <DialogTitle className='text-base font-bold text-foreground'>
              Konfirmasi Penjualan Stok Gudang
            </DialogTitle>
            <DialogDescription className='mt-0.5 text-xs text-muted-foreground'>
              Stok sistem 0 untuk <span className='font-semibold text-foreground'>{itemNames}</span>. Barang masih ada di gudang?
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {/* Daftar item minus dalam keranjang */}
      <div className='space-y-2 rounded-xl border border-border bg-muted/40 p-3'>
        <p className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
          Item melebihi catatan ({minusItems.length})
        </p>
        <ul className='space-y-1.5'>
          {minusItems.map((item) => (
            <li
              key={item.menu.id}
              className='flex items-center justify-between gap-2 text-xs'
            >
              <span className='min-w-0 truncate font-semibold text-foreground'>
                {item.menu.nama}
              </span>
              <div className='flex shrink-0 items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='rounded-full border-rose-500/30 bg-rose-500/10 px-2 py-0 text-[10px] font-semibold text-rose-700 dark:text-rose-300'
                >
                  Lewat catatan
                </Badge>
                <span className='font-mono font-bold tabular-nums text-foreground'>
                  {item.qty} {item.menu.satuan || 'porsi'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pilihan alasan cepat (wajib) */}
      <div className='space-y-2'>
        <Label className='text-xs font-semibold text-foreground'>
          Pilih Alasan Cepat <span className='text-destructive'>*</span>
        </Label>
        <div className='grid grid-cols-1 gap-2'>
          {PILIHAN_ALASAN_STOK_MINUS.map((preset) => {
            const active = selectedPreset === preset
            return (
              <button
                key={preset}
                type='button'
                disabled={isProcessing}
                onClick={() => setSelectedPreset(preset)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 font-semibold text-primary'
                    : 'border-border bg-background text-foreground hover:bg-accent/50'
                }`}
              >
                <span>{preset}</span>
                {active && <PackageCheck className='size-4 shrink-0 text-primary' />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Input alasan bebas jika memilih Lain-lain */}
      {isCustom && (
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <Label htmlFor={customInputId} className='text-xs font-semibold'>
              Detail Alasan <span className='text-destructive'>*</span>
            </Label>
            <span
              className={`font-mono text-[10px] tabular-nums ${
                customAlasan.length > 180
                  ? 'font-semibold text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {customAlasan.length}/{MAX_ALASAN_LENGTH}
            </span>
          </div>
          <Textarea
            id={customInputId}
            rows={2}
            maxLength={MAX_ALASAN_LENGTH}
            value={customAlasan}
            onChange={(e) => setCustomAlasan(e.target.value)}
            placeholder='Tuliskan alasan barang dijual dari gudang (maks. 200 karakter)...'
            className='resize-none text-xs'
            disabled={isProcessing}
            required
          />
        </div>
      )}

      <DialogFooter className='gap-2 sm:gap-0'>
        <Button
          type='button'
          variant='outline'
          disabled={isProcessing}
          onClick={onCancel}
        >
          Batalkan
        </Button>
        <Button
          type='submit'
          disabled={!isValid || isProcessing}
          className='font-semibold'
        >
          Ya, Lanjutkan Pembayaran
        </Button>
      </DialogFooter>
    </form>
  )
}

export const StokMinusConfirmDialog: React.FC<StokMinusConfirmDialogProps> = ({
  open,
  onOpenChange,
  minusItems,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onCancel()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        {open && (
          <StokMinusConfirmContent
            key={minusItems.map((it) => `${it.menu.id}:${it.qty}`).join(',')}
            minusItems={minusItems}
            onConfirm={onConfirm}
            onCancel={() => {
              onCancel()
              onOpenChange(false)
            }}
            isProcessing={isProcessing}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default StokMinusConfirmDialog
