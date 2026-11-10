import React, { useEffect, useId, useRef, useState } from 'react'
import {
  RotateCcw,
  AlertCircle,
  User,
  Clock,
  Coins,
  ShoppingBag,
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { formatRupiah, formatDateTime } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/validation-error'
import { useBeepAudio } from '@/hooks/useBeepAudio'
import {
  kasirApi,
  PILIHAN_ALASAN_VOID,
  type TransaksiSesiItem,
  type AlasanVoidType,
} from '../api/kasir-api'

export interface RefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: TransaksiSesiItem | null
  onSuccess?: () => void
}

function validateKodeStruk(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Kode struk wajib diisi.'
  }
  if (trimmed.length > 64) {
    return 'Kode struk maksimal 64 karakter.'
  }
  return null
}

function validateKeteranganLainnya(
  alasan: AlasanVoidType,
  text: string
): string | null {
  if (alasan !== 'Lainnya') return null
  const trimmed = text.trim()
  if (!trimmed || trimmed.length < 3) {
    return 'Detail alasan minimal 3 karakter.'
  }
  if (trimmed.length > 255) {
    return 'Detail alasan maksimal 255 karakter.'
  }
  return null
}

interface RefundDialogBodyProps {
  transaction: TransaksiSesiItem
  onClose: () => void
  onSuccess?: () => void
}

const RefundDialogBody: React.FC<RefundDialogBodyProps> = ({
  transaction,
  onClose,
  onSuccess,
}) => {
  const formId = useId()
  const kodeInputId = useId()
  const kodeHintId = useId()
  const kodeErrorId = useId()
  const reasonGroupId = useId()
  const lainnyaInputId = useId()
  const lainnyaHintId = useId()
  const lainnyaErrorId = useId()
  const submitErrorId = useId()

  const [kodeStruk, setKodeStruk] = useState('')
  const [selectedAlasan, setSelectedAlasan] = useState<AlasanVoidType>(
    PILIHAN_ALASAN_VOID[0]
  )
  const [keteranganLainnya, setKeteranganLainnya] = useState('')

  const [kodeTouched, setKodeTouched] = useState(false)
  const [lainnyaTouched, setLainnyaTouched] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const [kodeErrorMsg, setKodeErrorMsg] = useState<string | null>(null)
  const [lainnyaErrorMsg, setLainnyaErrorMsg] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const kodeStrukRef = useRef<HTMLInputElement>(null)
  const keteranganLainnyaRef = useRef<HTMLTextAreaElement>(null)
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { playVoid, playError } = useBeepAudio()

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) {
        clearTimeout(announceTimerRef.current)
      }
    }
  }, [])

  const scheduleAnnouncement = (message: string, delayMs = 500) => {
    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current)
    }
    setLiveAnnouncement('')
    announceTimerRef.current = setTimeout(() => {
      setLiveAnnouncement(message)
    }, delayMs)
  }

  const clearAnnouncement = () => {
    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current)
      announceTimerRef.current = null
    }
    setLiveAnnouncement('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return

    setHasSubmitted(true)
    setSubmitError(null)
    clearAnnouncement()

    const kodeErr = validateKodeStruk(kodeStruk)
    const lainnyaErr = validateKeteranganLainnya(selectedAlasan, keteranganLainnya)

    setKodeErrorMsg(kodeErr)
    setLainnyaErrorMsg(lainnyaErr)

    if (kodeErr) {
      kodeStrukRef.current?.focus()
      return
    }

    if (lainnyaErr) {
      keteranganLainnyaRef.current?.focus()
      return
    }

    const alasanFinal =
      selectedAlasan === 'Lainnya' ? keteranganLainnya.trim() : selectedAlasan
    const kodeStrukFinal = kodeStruk.trim()

    try {
      setIsSubmitting(true)
      await kasirApi.refundTransaksi(
        transaction.id,
        alasanFinal,
        kodeStrukFinal
      )
      playVoid()
      toast.success(`Refund transaksi #${transaction.id} berhasil`, {
        description: `${transaction.pembeliNama} — saldo pembeli dan stok menu telah dikembalikan.`,
      })
      onClose()
      onSuccess?.()
    } catch (err: unknown) {
      playError()
      const msg = getErrorMessage(err, 'Gagal memproses refund transaksi')
      setSubmitError(msg)

      if (msg.toLowerCase().includes('kode struk')) {
        setKodeErrorMsg(msg)
        kodeStrukRef.current?.focus()
      } else {
        scheduleAnnouncement(msg, 100)
      }

      toast.error('Gagal Memproses Refund', {
        description: msg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showKodeError = Boolean(kodeErrorMsg)
  const showLainnyaError = Boolean(lainnyaErrorMsg)

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.nativeEvent.isComposing) {
          e.preventDefault()
        }
      }}
      aria-label='Formulir refund transaksi kasir'
      noValidate
      className='space-y-4 pt-1'
    >
      {/* Live region tunggal untuk mengumumkan error validasi tanpa tumpang tindih */}
      <div className='sr-only' aria-live='polite'>
        {liveAnnouncement}
      </div>

      {/* Detail Ringkas Transaksi Terpilih */}
      <div className='space-y-2 rounded-xl has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 text-xs shadow-none'>
        <div className='flex items-center justify-between gap-2'>
          <span className='flex items-center gap-1.5 text-slate-500 dark:text-slate-400'>
            <User className='h-3.5 w-3.5' /> Pembeli
          </span>
          <div className='flex items-center gap-1.5'>
            <span className='font-semibold text-slate-800 dark:text-white'>
              {transaction.pembeliNama}
            </span>
            <Badge
              variant='secondary'
              className='rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300 shadow-none'
            >
              {transaction.pembeliTipe === 'SISWA' ? 'Siswa' : 'Kartu Tamu'}
            </Badge>
          </div>
        </div>

        <div className='flex items-center justify-between gap-2'>
          <span className='flex items-center gap-1.5 text-slate-500 dark:text-slate-400'>
            <Clock className='h-3.5 w-3.5' /> Waktu Transaksi
          </span>
          <span className='text-slate-700 dark:text-slate-300 tabular-nums'>
            {formatDateTime(transaction.waktu)}
          </span>
        </div>

        {transaction.items.length > 0 && (
          <div className='flex items-start justify-between gap-3'>
            <span className='flex items-center gap-1.5 text-slate-500 dark:text-slate-400 shrink-0'>
              <ShoppingBag className='h-3.5 w-3.5' /> Item
            </span>
            <span className='text-right text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2'>
              {transaction.items
                .map((it) => `${it.qty}x ${it.namaMenu}`)
                .join(', ')}
            </span>
          </div>
        )}

        <div className='flex items-center justify-between has-border !border-t !border-slate-200 dark:!border-slate-800 pt-2'>
          <span className='flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200'>
            <Coins className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400' />{' '}
            Total Tagihan
          </span>
          <span className='text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums'>
            {formatRupiah(transaction.total)}
          </span>
        </div>
      </div>

      {/* Input Wajib Kode Struk (BE #292) */}
      <div className='space-y-1.5'>
        <label
          htmlFor={kodeInputId}
          className='block text-xs font-semibold text-slate-700 dark:text-slate-300'
        >
          Kode Struk{' '}
          <span aria-hidden='true' className='text-rose-600 dark:text-rose-400'>
            *
          </span>
        </label>
        <p
          id={kodeHintId}
          className='text-[11px] text-slate-500 dark:text-slate-400'
        >
          Ketik atau pindai kode struk bukti pembayaran (contoh:
          TRX-20261110-123).
        </p>
        <Input
          ref={kodeStrukRef}
          id={kodeInputId}
          name='kodeStruk'
          type='text'
          required
          autoFocus
          maxLength={64}
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='none'
          spellCheck={false}
          enterKeyHint={selectedAlasan === 'Lainnya' ? 'next' : 'done'}
          value={kodeStruk}
          placeholder='TRX-20261110-123'
          aria-invalid={showKodeError ? 'true' : 'false'}
          aria-describedby={
            showKodeError ? `${kodeHintId} ${kodeErrorId}` : kodeHintId
          }
          onChange={(e) => {
            const val = e.target.value
            setKodeStruk(val)
            setKodeTouched(true)
            setSubmitError(null)
            if (kodeErrorMsg && validateKodeStruk(val) === null) {
              setKodeErrorMsg(null)
              clearAnnouncement()
            }
          }}
          onBlur={() => {
            if (!kodeTouched && !hasSubmitted) return
            const err = validateKodeStruk(kodeStruk)
            setKodeErrorMsg(err)
            if (err) {
              scheduleAnnouncement(`Kode Struk: ${err}`)
            }
          }}
          className={`h-11 text-sm font-medium tracking-wide has-border !border rounded-xl shadow-none focus-visible:ring-0 ${
            showKodeError
              ? '!border-rose-500 dark:!border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-slate-800 dark:text-white'
              : '!border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-800 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400'
          }`}
        />
        <div className='min-h-5 pt-0.5'>
          <p
            id={kodeErrorId}
            aria-hidden={showKodeError ? undefined : true}
            style={showKodeError ? undefined : { visibility: 'hidden' }}
            className='m-0 flex items-start gap-1.5 text-xs leading-5 font-medium text-rose-600 dark:text-rose-400'
          >
            <AlertCircle
              role={showKodeError ? 'img' : undefined}
              aria-label={showKodeError ? 'Error' : undefined}
              aria-hidden={showKodeError ? undefined : true}
              className='h-3.5 w-3.5 shrink-0 mt-0.5'
            />
            <span>{kodeErrorMsg ?? '\u00A0'}</span>
          </p>
        </div>
      </div>

      {/* Pilihan Alasan Refund Wajib */}
      <fieldset className='space-y-2 border-0 p-0 m-0'>
        <legend className='mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300'>
          Alasan Refund{' '}
          <span aria-hidden='true' className='text-rose-600 dark:text-rose-400'>
            *
          </span>
        </legend>

        <div className='space-y-1.5'>
          {PILIHAN_ALASAN_VOID.map((alasan, idx) => {
            const radioId = `${reasonGroupId}-${idx}`
            const isChecked = selectedAlasan === alasan

            return (
              <div
                key={alasan}
                className={`flex min-h-12 items-center gap-3 rounded-xl has-border !border px-3.5 text-xs transition-colors ${
                  isChecked
                    ? '!border-blue-300 dark:!border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/30 font-semibold text-slate-800 dark:text-white'
                    : '!border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type='radio'
                  id={radioId}
                  name='alasan'
                  value={alasan}
                  checked={isChecked}
                  onChange={() => {
                    setSelectedAlasan(alasan)
                    setSubmitError(null)
                    if (alasan !== 'Lainnya') {
                      setLainnyaErrorMsg(null)
                      setLainnyaTouched(false)
                      clearAnnouncement()
                    }
                  }}
                  className='h-4 w-4 shrink-0 cursor-pointer accent-blue-600'
                />
                <label
                  htmlFor={radioId}
                  className='flex-1 cursor-pointer py-3 leading-snug select-none'
                >
                  {alasan}
                </label>
              </div>
            )
          })}
        </div>

        {selectedAlasan === 'Lainnya' && (
          <div className='space-y-1.5 pt-1'>
            <label
              htmlFor={lainnyaInputId}
              className='block text-xs font-semibold text-slate-700 dark:text-slate-300'
            >
              Detail Alasan Refund{' '}
              <span
                aria-hidden='true'
                className='text-rose-600 dark:text-rose-400'
              >
                *
              </span>
            </label>
            <p
              id={lainnyaHintId}
              className='text-[11px] text-slate-500 dark:text-slate-400'
            >
              Tuliskan alasan pembatalan (minimal 3 karakter, maksimal 255 karakter).
            </p>
            <Textarea
              ref={keteranganLainnyaRef}
              id={lainnyaInputId}
              name='keteranganLainnya'
              required
              minLength={3}
              maxLength={255}
              rows={2}
              value={keteranganLainnya}
              placeholder='Contoh: Kartu tertukar saat antrean tap'
              aria-invalid={showLainnyaError ? 'true' : 'false'}
              aria-describedby={
                showLainnyaError
                  ? `${lainnyaHintId} ${lainnyaErrorId}`
                  : lainnyaHintId
              }
              onChange={(e) => {
                const val = e.target.value
                setKeteranganLainnya(val)
                setLainnyaTouched(true)
                setSubmitError(null)
                if (
                  lainnyaErrorMsg &&
                  validateKeteranganLainnya('Lainnya', val) === null
                ) {
                  setLainnyaErrorMsg(null)
                  clearAnnouncement()
                }
              }}
              onBlur={() => {
                if (!lainnyaTouched && !hasSubmitted) return
                const err = validateKeteranganLainnya(
                  selectedAlasan,
                  keteranganLainnya
                )
                setLainnyaErrorMsg(err)
                if (err) {
                  scheduleAnnouncement(`Detail Alasan Refund: ${err}`)
                }
              }}
              className={`text-xs has-border !border rounded-xl shadow-none focus-visible:ring-0 ${
                showLainnyaError
                  ? '!border-rose-500 dark:!border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-slate-800 dark:text-white'
                  : '!border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-800 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400'
              }`}
            />
            <div className='min-h-5 pt-0.5'>
              <p
                id={lainnyaErrorId}
                aria-hidden={showLainnyaError ? undefined : true}
                style={showLainnyaError ? undefined : { visibility: 'hidden' }}
                className='m-0 flex items-start gap-1.5 text-xs leading-5 font-medium text-rose-600 dark:text-rose-400'
              >
                <AlertCircle
                  role={showLainnyaError ? 'img' : undefined}
                  aria-label={showLainnyaError ? 'Error' : undefined}
                  aria-hidden={showLainnyaError ? undefined : true}
                  className='h-3.5 w-3.5 shrink-0 mt-0.5'
                />
                <span>{lainnyaErrorMsg ?? '\u00A0'}</span>
              </p>
            </div>
          </div>
        )}
      </fieldset>

      {/* Banner Error Server saat Submit */}
      {submitError && (
        <div
          id={submitErrorId}
          className='flex items-start gap-2 rounded-xl has-border !border !border-rose-200 dark:!border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300'
        >
          <AlertCircle
            role='img'
            aria-label='Error'
            className='h-4 w-4 shrink-0 mt-0.5'
          />
          <span>{submitError}</span>
        </div>
      )}

      <DialogFooter className='gap-2 sm:gap-2.5 pt-2'>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          onClick={onClose}
          disabled={isSubmitting}
          className='h-10 has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-none'
        >
          Batal
        </Button>
        <Button
          type='submit'
          variant='destructive'
          size='sm'
          disabled={isSubmitting}
          className='h-10 gap-1.5 font-semibold !bg-rose-600 hover:!bg-rose-500 !text-white rounded-xl shadow-none'
        >
          {isSubmitting ? (
            <>
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
              <span>Memproses Refund...</span>
            </>
          ) : (
            <>
              <RotateCcw className='h-3.5 w-3.5' />
              <span>Konfirmasi Refund</span>
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export const RefundDialog: React.FC<RefundDialogProps> = ({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}) => {
  const [openSession, setOpenSession] = useState(0)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setOpenSession((prev) => prev + 1)
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-white rounded-2xl shadow-none select-none'>
        <DialogHeader>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'>
              <RotateCcw className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-slate-800 dark:text-white'>
                Refund Transaksi Kasir
              </DialogTitle>
              <DialogDescription className='text-xs text-slate-500 dark:text-slate-400'>
                Batalkan transaksi terpilih dengan memasukkan kode struk dan alasan refund.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <RefundDialogBody
          key={`${transaction.id}-${openSession}`}
          transaction={transaction}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}

export default RefundDialog
