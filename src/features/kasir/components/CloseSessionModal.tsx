import React, { useEffect, useId, useState } from 'react'
import {
  Lock,
  AlertTriangle,
  AlertCircle,
  Receipt,
  RotateCcw,
  Coins,
  Store,
  Calendar,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RotateCcw as ResetIcon,
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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRupiah, formatNumber } from '@/lib/formatters'
import {
  kasirApi,
  type SesiKasirData,
  type RekapSesiData,
} from '../api/kasir-api'
import {
  KANTIN_CLOSE_SESSION_LOCKS_KEY,
  clearCloseSessionLock,
  getCloseSessionLock,
  saveCloseSessionLock,
  updateCloseSessionLockCatatan,
} from '../close-session-lock'

export interface CloseSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesi: SesiKasirData | null
  rekap: RekapSesiData | null
  onSuccess?: () => void
}

type CloseSessionStep = 'INPUT_CASH' | 'RECONCILE'

const PRESET_PECANGAN = [10_000, 20_000, 50_000, 100_000]

const CloseSessionModalBody: React.FC<CloseSessionModalProps> = ({
  open,
  onOpenChange,
  sesi,
  rekap,
  onSuccess,
}) => {
  const cashLockHintId = useId()
  const catatanHintId = useId()

  const initialLock = getCloseSessionLock(sesi)
  const [step, setStep] = useState<CloseSessionStep>(() =>
    initialLock ? 'RECONCILE' : 'INPUT_CASH'
  )
  const [cashInput, setCashInput] = useState<string>(() =>
    initialLock ? String(initialLock.cashValue) : ''
  )
  const [catatanSelisih, setCatatanSelisih] = useState<string>(
    () => initialLock?.catatanSelisih ?? ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      const storedLock = getCloseSessionLock(sesi)
      if (storedLock) {
        setStep('RECONCILE')
        setCashInput(String(storedLock.cashValue))
        setCatatanSelisih(storedLock.catatanSelisih ?? '')
      } else if (step === 'INPUT_CASH') {
        setCashInput('')
        setCatatanSelisih('')
      }
    }
  }

  const sesiId = sesi?.id
  const sesiStatus = sesi?.status
  const sesiTanggal = sesi?.tanggal
  const sesiTitikKasirId = sesi?.titikKasirId

  useEffect(() => {
    if (sesiStatus === 'DITUTUP' && sesiId) {
      clearCloseSessionLock(sesiId)
    }
  }, [sesiId, sesiStatus])

  useEffect(() => {
    if (!sesiId || sesiStatus === 'DITUTUP') return
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key !== KANTIN_CLOSE_SESSION_LOCKS_KEY) return
      const externalLock = getCloseSessionLock({
        id: sesiId,
        status: sesiStatus ?? 'TERBUKA',
        tanggal: sesiTanggal ?? '',
        titikKasirId: sesiTitikKasirId ?? 1,
      })
      if (externalLock) {
        setStep('RECONCILE')
        setCashInput(String(externalLock.cashValue))
        setCatatanSelisih(externalLock.catatanSelisih ?? '')
      }
    }
    window.addEventListener('storage', handleStorageSync)
    return () => window.removeEventListener('storage', handleStorageSync)
  }, [sesiId, sesiStatus, sesiTanggal, sesiTitikKasirId])

  // Nilai numerik kas fisik yang diinput
  const cashValue = Number(cashInput.replace(/\D/g, '')) || 0

  const jumlahTransaksi =
    rekap?.jumlahTransaksi ?? sesi?.totalTransaksi ?? 0
  const jumlahVoid = rekap?.jumlahVoid ?? 0
  const totalBruto = rekap?.totalBruto ?? sesi?.totalBruto ?? 0
  const totalVoid = rekap?.totalVoid ?? sesi?.totalVoid ?? 0
  const totalBersih = rekap?.totalBersih ?? sesi?.totalBersih ?? 0

  // Selisih = Uang Fisik Diinput - Pendapatan Bersih Sistem
  const selisih = cashValue - totalBersih
  const isSelisihAda = selisih !== 0

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isSubmitting) {
      return
    }
    onOpenChange(isOpen)
  }

  const handleAddPreset = (nominal: number) => {
    const nextVal = cashValue + nominal
    setCashInput(String(nextVal))
  }

  const handleResetCash = () => {
    setCashInput('')
  }

  const handleProceedToReconcile = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (step === 'RECONCILE') return
    if (!cashInput.trim()) {
      toast.error('Masukkan jumlah uang tunai fisik di laci terlebih dahulu')
      return
    }
    const existingLock = getCloseSessionLock(sesi)
    if (existingLock) {
      setCashInput(String(existingLock.cashValue))
      setCatatanSelisih(existingLock.catatanSelisih ?? '')
      setStep('RECONCILE')
      toast.info(
        `Nominal kas fisik sesi ini sudah dikunci pada ${formatRupiah(existingLock.cashValue)}`
      )
      return
    }
    const locked = saveCloseSessionLock(sesi, cashValue, catatanSelisih)
    if (locked) {
      setCashInput(String(locked.cashValue))
    }
    setStep('RECONCILE')
  }

  const handleCloseSession = async () => {
    if (!sesi?.id) {
      toast.error('Data sesi kasir tidak ditemukan')
      return
    }

    const existingLock = getCloseSessionLock(sesi)
    const authoritativeCash = existingLock ? existingLock.cashValue : cashValue
    const authoritativeSelisih = authoritativeCash - totalBersih

    if (authoritativeSelisih !== 0 && !catatanSelisih.trim()) {
      toast.error('Keterangan selisih wajib diisi sebelum menutup sesi')
      return
    }

    try {
      setIsSubmitting(true)
      await kasirApi.tutupSesi(sesi.id, {
        uangFisik: authoritativeCash,
        selisih: authoritativeSelisih,
        catatan: catatanSelisih.trim() || undefined,
      })

      const deskripsiNotif =
        authoritativeSelisih === 0
          ? 'Seluruh transaksi dikunci. Kas seimbang (Pas Rp 0).'
          : `Seluruh transaksi dikunci. Selisih kas: ${authoritativeSelisih > 0 ? '+' : ''}${formatRupiah(authoritativeSelisih)}.`

      toast.success('Sesi kasir harian berhasil ditutup', {
        description: deskripsiNotif,
      })

      clearCloseSessionLock(sesi.id)
      setStep('INPUT_CASH')
      setCashInput('')
      setCatatanSelisih('')
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (isSubmitting) {
            e.preventDefault()
          }
        }}
        onPointerDownOutside={(e) => {
          if (isSubmitting || step === 'RECONCILE') {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          if (isSubmitting || step === 'RECONCILE') {
            e.preventDefault()
          }
        }}
        className='max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-white rounded-2xl shadow-none select-none'
      >
        <DialogHeader>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'>
              <Lock className='h-5 w-5' aria-hidden='true' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-slate-800 dark:text-white'>
                {step === 'INPUT_CASH'
                  ? 'Tutup Sesi Kasir Harian'
                  : 'Rekonsiliasi & Tutup Sesi Kasir'}
              </DialogTitle>
              <DialogDescription className='text-xs text-slate-500 dark:text-slate-400'>
                {step === 'INPUT_CASH'
                  ? 'Langkah 1 dari 2: Hitung uang tunai fisik di laci kasir.'
                  : 'Langkah 2 dari 2: Verifikasi kecocokan kas fisik dengan data sistem.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Informasi Titik Kasir & Tanggal */}
        <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2 text-xs'>
          <div className='flex items-center gap-1.5 text-slate-500 dark:text-slate-400'>
            <Store
              className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400'
              aria-hidden='true'
            />
            <span>Titik:</span>
            <strong className='text-slate-800 dark:text-white'>
              {sesi?.titikKasirNama || `Titik #${sesi?.titikKasirId || 1}`}
            </strong>
          </div>
          <div className='flex items-center gap-1.5 text-slate-500 dark:text-slate-400'>
            <Calendar className='h-3.5 w-3.5' aria-hidden='true' />
            <span>Tanggal:</span>
            <strong className='font-semibold text-slate-800 dark:text-white tabular-nums'>
              {sesi?.tanggal || new Date().toISOString().split('T')[0]}
            </strong>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LANGKAH 1: INPUT KAS FISIK DI LACI KASIR                      */}
        {/* ============================================================== */}
        {step === 'INPUT_CASH' && (
          <form
            onSubmit={handleProceedToReconcile}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.nativeEvent.isComposing) {
                e.preventDefault()
              }
            }}
            className='space-y-4 pt-1'
          >
            {/* Input Nominal Uang Fisik */}
            <div className='space-y-1.5'>
              <label
                htmlFor='input-cash-drawer'
                className='block text-xs font-semibold text-slate-700 dark:text-slate-300'
              >
                Total Uang Tunai di Laci Kasir:
              </label>
              <p
                id={cashLockHintId}
                className='text-[11px] text-slate-500 dark:text-slate-400'
              >
                Nominal uang fisik dikunci dan tidak dapat diubah setelah lanjut
                ke rekapitulasi.
              </p>
              <div className='relative'>
                <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400'>
                  Rp
                </span>
                <Input
                  id='input-cash-drawer'
                  type='text'
                  inputMode='numeric'
                  autoComplete='off'
                  value={cashInput ? formatNumber(cashValue) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '')
                    setCashInput(raw)
                  }}
                  placeholder='0'
                  autoFocus
                  aria-describedby={cashLockHintId}
                  className='pl-10 text-base font-bold tabular-nums has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-800 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 shadow-none focus-visible:ring-0 rounded-xl'
                />
              </div>
            </div>

            {/* Chip Preset Pecahan Cepat */}
            <div className='space-y-1.5'>
              <span className='block text-[11px] font-medium text-slate-500 dark:text-slate-400'>
                Tambah Cepat Pecahan:
              </span>
              <div className='flex flex-wrap items-center gap-1.5'>
                {PRESET_PECANGAN.map((nominal) => (
                  <Button
                    key={nominal}
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => handleAddPreset(nominal)}
                    className='h-7 text-xs font-semibold has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-none px-2.5 py-0'
                  >
                    +{formatNumber(nominal)}
                  </Button>
                ))}
                {cashValue > 0 && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleResetCash}
                    className='h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl px-2 py-0'
                  >
                    <ResetIcon className='h-3 w-3 mr-1' aria-hidden='true' />{' '}
                    Reset
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-2 pt-2'>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                onClick={() => handleOpenChange(false)}
                className='has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-none'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={!cashInput.trim()}
                className='gap-1.5 font-semibold !bg-blue-600 hover:!bg-blue-500 !text-white rounded-xl shadow-none'
              >
                <span>Lanjut ke Rekapitulasi</span>
                <ArrowRight className='h-3.5 w-3.5' aria-hidden='true' />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ============================================================== */}
        {/* LANGKAH 2: REKONSILIASI KAS & KONFIRMASI PENGUNCIAN           */}
        {/* ============================================================== */}
        {step === 'RECONCILE' && (
          <div className='space-y-3.5 pt-1'>
            {/* Rekapitulasi Metrik Sesi */}
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 text-xs'>
              {/* Total Transaksi Sukses */}
              <Card className='has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl shadow-none'>
                <CardContent className='p-2.5'>
                  <span className='text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-0.5'>
                    <Receipt
                      className='h-3 w-3 text-emerald-600 dark:text-emerald-400'
                      aria-hidden='true'
                    />{' '}
                    Transaksi Sukses
                  </span>
                  <span className='text-base font-bold tracking-tight text-slate-800 dark:text-white tabular-nums block'>
                    {formatNumber(jumlahTransaksi)}
                  </span>
                </CardContent>
              </Card>

              {/* Total Transaksi Refund */}
              <Card className='has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl shadow-none'>
                <CardContent className='p-2.5'>
                  <span className='text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-0.5'>
                    <RotateCcw
                      className='h-3 w-3 text-rose-600 dark:text-rose-400'
                      aria-hidden='true'
                    />{' '}
                    Transaksi Refund
                  </span>
                  <span className='text-base font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums block'>
                    {formatNumber(jumlahVoid)}
                  </span>
                </CardContent>
              </Card>

              {/* Total Penjualan Kotor */}
              <Card className='has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl shadow-none col-span-2 sm:col-span-1'>
                <CardContent className='p-2.5'>
                  <span className='text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-0.5'>
                    <Coins
                      className='h-3 w-3 text-slate-500 dark:text-slate-400'
                      aria-hidden='true'
                    />{' '}
                    Penjualan Kotor
                  </span>
                  <span className='text-xs font-semibold text-slate-800 dark:text-white tabular-nums block'>
                    {formatRupiah(totalBruto)}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Perbandingan Kas Fisik vs Pendapatan Sistem */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              {/* Uang Kas Fisik Diinput (Terkunci Permanen) */}
              <div className='rounded-xl has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 shadow-none'>
                <div className='flex items-center justify-between gap-2 mb-1'>
                  <span className='text-[11px] font-semibold text-slate-500 dark:text-slate-400'>
                    Uang Fisik di Laci:
                  </span>
                  <span className='inline-flex items-center gap-1 rounded-full bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300'>
                    <Lock className='h-2.5 w-2.5' aria-hidden='true' />
                    Terkunci
                  </span>
                </div>
                <span className='text-lg font-bold text-slate-800 dark:text-white tabular-nums block'>
                  {formatRupiah(cashValue)}
                </span>
              </div>

              {/* Pendapatan Bersih Sistem */}
              <div className='rounded-xl has-border !border !border-blue-200 dark:!border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 p-3 shadow-none'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[11px] font-semibold text-blue-600 dark:text-blue-400'>
                    Pendapatan Bersih:
                  </span>
                </div>
                <span className='text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums block'>
                  {formatRupiah(totalBersih)}
                </span>
                {totalVoid > 0 && (
                  <span className='text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block'>
                    (Kotor {formatRupiah(totalBruto)} - Refund {formatRupiah(totalVoid)})
                  </span>
                )}
              </div>
            </div>

            {/* Banner Status Selisih Kas */}
            <div
              className={`rounded-xl p-3 has-border !border shadow-none text-xs flex items-start gap-2.5 ${
                selisih === 0
                  ? '!border-emerald-200 dark:!border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  : selisih < 0
                  ? '!border-rose-200 dark:!border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                  : '!border-amber-200 dark:!border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
              }`}
            >
              {selisih === 0 ? (
                <CheckCircle2
                  className='h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5'
                  aria-hidden='true'
                />
              ) : selisih < 0 ? (
                <AlertTriangle
                  className='h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5'
                  aria-hidden='true'
                />
              ) : (
                <AlertCircle
                  className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5'
                  aria-hidden='true'
                />
              )}
              <div className='flex-1'>
                <div className='flex items-center justify-between'>
                  <strong className='font-bold text-sm'>
                    {selisih === 0
                      ? 'Kas Seimbang (Rp 0)'
                      : selisih < 0
                      ? `Kekurangan Kas: -${formatRupiah(Math.abs(selisih))}`
                      : `Kelebihan Kas: +${formatRupiah(selisih)}`}
                  </strong>
                  <Badge
                    variant={selisih === 0 ? 'outline' : 'destructive'}
                    className={`rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0 shadow-none ${
                      selisih === 0
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                        : selisih < 0
                        ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {selisih === 0 ? 'Pas' : selisih < 0 ? 'Kurang' : 'Lebih'}
                  </Badge>
                </div>
                <p className='text-[11px] mt-0.5 opacity-90'>
                  {selisih === 0
                    ? 'Uang fisik di laci kasir cocok 100% dengan pencatatan transaksi sistem.'
                    : selisih < 0
                    ? 'Jumlah uang fisik lebih sedikit dibandingkan total penjualan sistem. Berikan keterangan alasan di bawah.'
                    : 'Jumlah uang fisik lebih banyak dibandingkan total penjualan sistem. Berikan keterangan alasan di bawah.'}
                </p>
              </div>
            </div>

            {/* Input Catatan Selisih */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <label
                  htmlFor='input-catatan-selisih'
                  className='block text-xs font-semibold text-slate-700 dark:text-slate-300'
                >
                  Catatan / Keterangan Selisih:
                </label>
                {isSelisihAda ? (
                  <span
                    id={catatanHintId}
                    className='text-[10px] font-semibold text-rose-600 dark:text-rose-400'
                  >
                    * Wajib diisi karena ada selisih
                  </span>
                ) : (
                  <span
                    id={catatanHintId}
                    className='text-[10px] text-slate-500 dark:text-slate-400'
                  >
                    Opsional
                  </span>
                )}
              </div>
              <Textarea
                id='input-catatan-selisih'
                rows={2}
                autoFocus
                required={isSelisihAda}
                aria-describedby={catatanHintId}
                value={catatanSelisih}
                onChange={(e) => {
                  const nextVal = e.target.value
                  setCatatanSelisih(nextVal)
                  updateCloseSessionLockCatatan(sesi?.id, nextVal)
                }}
                placeholder={
                  isSelisihAda
                    ? 'Wajib diisi: jelaskan alasan selisih kas fisik (mis. kembalian tertinggal, pembulatan, dll.)...'
                    : 'Tambahkan catatan penutupan sesi jika ada (opsional)...'
                }
                className='text-xs has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-800 dark:text-white placeholder:text-slate-500/80 dark:placeholder:text-slate-400 shadow-none focus-visible:ring-0 rounded-xl resize-none'
              />
            </div>

            <DialogFooter className='gap-2 sm:gap-2 pt-1'>
              <Button
                type='button'
                variant='destructive'
                size='sm'
                onClick={handleCloseSession}
                disabled={isSubmitting || (isSelisihAda && !catatanSelisih.trim())}
                className='gap-1.5 font-semibold !bg-rose-600 hover:!bg-rose-500 !text-white rounded-xl shadow-none'
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className='h-3.5 w-3.5 animate-spin'
                      aria-hidden='true'
                    />
                    <span>Menutup Sesi Kasir...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      className='h-3.5 w-3.5'
                      aria-hidden='true'
                    />
                    <span>Konfirmasi & Tutup Kasir</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const CloseSessionModal: React.FC<CloseSessionModalProps> = (props) => {
  return (
    <CloseSessionModalBody key={props.sesi?.id ?? 'no-sesi'} {...props} />
  )
}

export default CloseSessionModal
