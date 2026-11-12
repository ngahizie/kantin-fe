import React, { useEffect, useId, useRef, useState } from 'react'
import { Check, Copy, Printer, Receipt } from 'lucide-react'
import { formatDateTime, formatRupiah, getInitials } from '@/lib/formatters'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ReceiptData } from '../types'

export interface ReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: ReceiptData | null
}

type CopyState = 'idle' | 'copied' | 'failed'

let lastCopyAnnouncement = ''

function formatAnnouncement(base: string): string {
  const next = base === lastCopyAnnouncement ? `${base}\u00A0` : base
  lastCopyAnnouncement = next
  return next
}

interface ReceiptDialogBodyProps {
  open: boolean
  receipt: ReceiptData
  onClose: () => void
}

const ReceiptDialogBody: React.FC<ReceiptDialogBodyProps> = ({
  open,
  receipt,
  onClose,
}) => {
  const kodeElementId = useId()
  const kodeRef = useRef<HTMLParagraphElement>(null)
  const copyBtnRef = useRef<HTMLButtonElement>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [copyMessage, setCopyMessage] = useState('')

  const kodeStruk = receipt.nomorStruk?.trim() || null
  const kodeStrukDisplay =
    kodeStruk || (receipt.transaksiId ? `TRX-${receipt.transaksiId}` : '-')
  const hasCopyableKode = kodeStrukDisplay !== '-'

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!hasCopyableKode) return

    const reportCopy = (ok: boolean) => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current)
        copyTimerRef.current = null
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      const nextText = formatAnnouncement(ok ? 'Tersalin' : 'Gagal menyalin')
      setCopyState('idle')
      setCopyMessage('')

      rafRef.current = requestAnimationFrame(() => {
        setCopyState(ok ? 'copied' : 'failed')
        setCopyMessage(nextText)
        copyTimerRef.current = setTimeout(() => {
          setCopyState('idle')
          setCopyMessage('')
        }, 2000)
      })
    }

    const executeCopy = async () => {
      const targetEl = kodeRef.current
      const text = (
        targetEl?.innerText ||
        targetEl?.textContent ||
        ''
      ).trim()
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
        reportCopy(true)
      } catch {
        reportCopy(false)
      }
    }

    if ('CommandEvent' in window) {
      const targetEl = kodeRef.current
      if (!targetEl) return
      const handleCommand = (event: Event) => {
        const cmdEvent = event as Event & { command?: string }
        if (cmdEvent.command === '--copy') {
          void executeCopy()
        }
      }
      targetEl.addEventListener('command', handleCommand)
      return () => targetEl.removeEventListener('command', handleCommand)
    }

    const buttonEl = copyBtnRef.current
    if (!buttonEl) return
    const handleFallbackClick = () => {
      void executeCopy()
    }
    buttonEl.addEventListener('click', handleFallbackClick)
    return () => buttonEl.removeEventListener('click', handleFallbackClick)
  }, [hasCopyableKode, kodeElementId])

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Pratinjau Kertas Struk (selalu light paper agar kontras cetak & layar terjaga) */}
      <div
        data-receipt-printable
        data-print-active={open ? 'true' : 'false'}
        style={{ colorScheme: 'light' }}
        className='rounded-xl border border-slate-200 bg-white p-4 text-slate-900 select-text print:rounded-none print:border-0 print:p-0'
      >
        {/* Header Kantin */}
        <div className='border-b border-dashed border-slate-300 pb-3 text-center'>
          <h3 className='text-sm font-bold tracking-tight text-slate-900'>
            {receipt.namaKantin}
          </h3>
          {receipt.titikKasir && (
            <p className='mt-0.5 text-[11px] font-medium text-slate-600'>
              {receipt.titikKasir}
            </p>
          )}
          <p className='mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500'>
            Struk Pembayaran
          </p>
        </div>

        {/* Blok Kode Struk & Tombol Salin */}
        <div className='border-b border-dashed border-slate-300 py-3'>
          <div className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-[11px] font-medium text-slate-600'>
                Kode Struk
              </span>
              {hasCopyableKode && (
                <div className='relative flex items-center gap-1.5 print:hidden'>
                  <span
                    role='status'
                    className={`pointer-events-none text-[11px] font-medium transition-opacity duration-150 ${
                      copyState === 'copied'
                        ? 'opacity-100 text-emerald-700'
                        : copyState === 'failed'
                          ? 'opacity-100 text-rose-700'
                          : 'opacity-0 text-slate-600'
                    }`}
                  >
                    {copyMessage}
                  </span>
                  <button
                    ref={copyBtnRef}
                    type='button'
                    {...({
                      command: '--copy',
                      commandfor: kodeElementId,
                    } as Record<string, string>)}
                    aria-label='Salin kode struk'
                    data-copied={copyState === 'copied' ? '' : undefined}
                    data-failed={copyState === 'failed' ? '' : undefined}
                    className='inline-flex min-h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900'
                  >
                    {copyState === 'copied' ? (
                      <Check
                        className='h-3.5 w-3.5 text-emerald-700'
                        aria-hidden='true'
                      />
                    ) : (
                      <Copy className='h-3.5 w-3.5' aria-hidden='true' />
                    )}
                  </button>
                </div>
              )}
            </div>
            <p
              id={kodeElementId}
              ref={kodeRef}
              className='mt-0.5 text-sm font-bold tracking-wide text-slate-900 tabular-nums break-all'
            >
              {kodeStrukDisplay}
            </p>
          </div>

          <dl className='mt-2.5 space-y-1 text-xs'>
            <div className='flex items-center justify-between gap-3'>
              <dt className='text-slate-600'>Waktu</dt>
              <dd className='font-medium text-slate-900 tabular-nums text-right'>
                {formatDateTime(receipt.waktu)}
              </dd>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <dt className='text-slate-600'>Pembeli</dt>
              <dd className='flex items-center justify-end gap-2 font-semibold text-slate-900 text-right'>
                <Avatar className='h-6 w-6 shrink-0 rounded-full border border-slate-200 bg-slate-100 text-slate-700'>
                  {receipt.pembeliFotoUrl && (
                    <AvatarImage
                      src={receipt.pembeliFotoUrl}
                      alt={receipt.pembeliNama}
                      className='object-cover'
                    />
                  )}
                  <AvatarFallback className='rounded-full bg-slate-100 text-[10px] font-bold text-slate-700'>
                    {getInitials(receipt.pembeliNama)}
                  </AvatarFallback>
                </Avatar>
                <span>{receipt.pembeliNama}</span>
              </dd>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <dt className='text-slate-600'>Status / Kelas</dt>
              <dd className='text-slate-700 text-right'>
                {receipt.pembeliKelas
                  ? `Siswa (${receipt.pembeliKelas})`
                  : 'Siswa'}
              </dd>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <dt className='text-slate-600'>NIS</dt>
              <dd className='text-slate-700 tabular-nums text-right'>
                {receipt.pembeliNis || '-'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Rincian Item Pembelian */}
        {(receipt.items.length > 0 ||
          (receipt.namaItemFallback &&
            receipt.namaItemFallback.length > 0)) && (
          <div className='border-b border-dashed border-slate-300 py-3'>
            <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600'>
              Rincian Pembelian
            </p>
            {receipt.items.length > 0 ? (
              <ul
                aria-label='Rincian item pembelian'
                className='space-y-2 text-xs'
              >
                {receipt.items.map((item, idx) => (
                  <li
                    key={`${item.menuId ?? item.namaMenu}-${idx}`}
                    className='space-y-0.5'
                  >
                    <div className='font-medium text-slate-900'>
                      {item.namaMenu}
                    </div>
                    <div className='flex items-center justify-between gap-2 text-[11px] text-slate-600 tabular-nums'>
                      <span>
                        {item.qty} x {formatRupiah(item.hargaSatuan)}
                      </span>
                      <span className='font-semibold text-slate-900'>
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul
                aria-label='Rincian item pembelian'
                className='space-y-1 text-xs text-slate-800'
              >
                {receipt.namaItemFallback?.map((nama, idx) => (
                  <li key={`${nama}-${idx}`}>{nama}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Ringkasan Total & Sisa Saldo */}
        <div className='space-y-1.5 pt-3 text-xs'>
          <div className='flex items-center justify-between gap-3'>
            <span className='font-semibold text-slate-900'>Total Belanja</span>
            <span className='text-base font-bold text-slate-900 tabular-nums'>
              {formatRupiah(receipt.total)}
            </span>
          </div>
          <div className='flex items-center justify-between gap-3'>
            <span className='text-slate-600'>Pembayaran</span>
            <span className='font-medium text-slate-800'>Kartu RFID</span>
          </div>
          <div className='flex items-center justify-between gap-3'>
            <span className='text-slate-600'>Sisa Saldo</span>
            <span className='font-bold text-emerald-700 tabular-nums'>
              {formatRupiah(receipt.saldoSisa)}
            </span>
          </div>
        </div>

        {/* Catatan Footer Struk */}
        <p className='mt-3 border-t border-dashed border-slate-300 pt-2.5 text-center text-[11px] leading-relaxed text-slate-600'>
          Simpan kode struk ini sebagai bukti pembayaran atau keperluan refund.
        </p>
      </div>

      {/* Tombol Aksi Modal (disembunyikan saat mencetak) */}
      <DialogFooter className='gap-2 pt-2 sm:gap-2.5 print:hidden'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onClose}
          className='h-9'
        >
          Tutup
        </Button>
        <Button
          type='button'
          variant='default'
          size='sm'
          autoFocus
          onClick={handlePrint}
          className='h-9 gap-1.5 font-semibold'
        >
          <Printer className='h-4 w-4' aria-hidden='true' />
          <span>Cetak Struk</span>
        </Button>
      </DialogFooter>
    </>
  )
}

export const ReceiptDialog: React.FC<ReceiptDialogProps> = ({
  open,
  onOpenChange,
  receipt,
}) => {
  const [openSession, setOpenSession] = useState(0)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setOpenSession((prev) => prev + 1)
    }
  }

  if (!receipt) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md max-h-[90vh] overflow-y-auto p-6 select-none'>
        <DialogHeader className='pb-1 text-left print:hidden'>
          <div className='flex items-center gap-2.5 pr-6'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary'>
              <Receipt className='h-5 w-5' aria-hidden='true' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold tracking-tight text-foreground'>
                Cetak Struk
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Salin kode struk atau cetak bukti pembayaran untuk pembeli.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ReceiptDialogBody
          key={`${receipt.transaksiId}-${openSession}`}
          open={open}
          receipt={receipt}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

export default ReceiptDialog
