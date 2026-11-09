import React, { useState } from 'react'
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
  ArrowLeft,
  Pencil,
  Banknote,
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

export interface CloseSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesi: SesiKasirData | null
  rekap: RekapSesiData | null
  onSuccess?: () => void
}

type CloseSessionStep = 'INPUT_CASH' | 'RECONCILE'

const PRESET_PECANGAN = [10_000, 20_000, 50_000, 100_000]

export const CloseSessionModal: React.FC<CloseSessionModalProps> = ({
  open,
  onOpenChange,
  sesi,
  rekap,
  onSuccess,
}) => {
  const [step, setStep] = useState<CloseSessionStep>('INPUT_CASH')
  const [cashInput, setCashInput] = useState<string>('')
  const [catatanSelisih, setCatatanSelisih] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    if (!isOpen) {
      setStep('INPUT_CASH')
      setCashInput('')
      setCatatanSelisih('')
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
    if (!cashInput.trim()) {
      toast.error('Masukkan jumlah uang tunai fisik di laci terlebih dahulu')
      return
    }
    setStep('RECONCILE')
  }

  const handleCloseSession = async () => {
    if (!sesi?.id) {
      toast.error('Data sesi kasir tidak ditemukan')
      return
    }

    if (isSelisihAda && !catatanSelisih.trim()) {
      toast.error('Keterangan selisih wajib diisi sebelum menutup sesi')
      return
    }

    try {
      setIsSubmitting(true)
      await kasirApi.tutupSesi(sesi.id, {
        uangFisik: cashValue,
        selisih,
        catatan: catatanSelisih.trim() || undefined,
      })

      const deskripsiNotif =
        selisih === 0
          ? 'Seluruh transaksi dikunci. Kas seimbang (Pas Rp 0).'
          : `Seluruh transaksi dikunci. Selisih kas: ${selisih > 0 ? '+' : ''}${formatRupiah(selisih)}.`

      toast.success('Sesi kasir harian berhasil ditutup', {
        description: deskripsiNotif,
      })

      handleOpenChange(false)
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
      <DialogContent className='max-w-md sm:max-w-lg border-none rounded-2xl shadow-none select-none'>
        <DialogHeader>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
              <Lock className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>
                {step === 'INPUT_CASH'
                  ? 'Tutup Sesi Kasir Harian'
                  : 'Rekonsiliasi & Tutup Sesi Kasir'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                {step === 'INPUT_CASH'
                  ? 'Langkah 1 dari 2: Hitung uang tunai fisik di laci kasir.'
                  : 'Langkah 2 dari 2: Verifikasi kecocokan kas fisik dengan data sistem.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Informasi Titik Kasir & Tanggal */}
        <div className='flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 dark:bg-muted/20 px-3.5 py-2 text-xs'>
          <div className='flex items-center gap-1.5 text-muted-foreground'>
            <Store className='h-3.5 w-3.5 text-primary' />
            <span>Titik:</span>
            <strong className='text-foreground'>
              {sesi?.titikKasirNama || `Titik #${sesi?.titikKasirId || 1}`}
            </strong>
          </div>
          <div className='flex items-center gap-1.5 text-muted-foreground'>
            <Calendar className='h-3.5 w-3.5' />
            <span>Tanggal:</span>
            <strong className='font-semibold text-foreground tabular-nums'>
              {sesi?.tanggal || new Date().toISOString().split('T')[0]}
            </strong>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LANGKAH 1: INPUT KAS FISIK DI LACI KASIR                      */}
        {/* ============================================================== */}
        {step === 'INPUT_CASH' && (
          <form onSubmit={handleProceedToReconcile} className='space-y-4 pt-1'>
            {/* Kotak Petunjuk Blind Count */}
            <div className='flex items-start gap-2.5 rounded-xl border-none bg-primary/10 p-3 text-xs text-primary shadow-none'>
              <Banknote className='h-4 w-4 shrink-0 mt-0.5' />
              <span>
                <strong>Penghitungan Laci Uang:</strong> Hitung seluruh uang tunai
                fisik yang ada di kasir saat ini. Angka pendapatan bersih sistem
                akan ditampilkan pada langkah berikutnya untuk verifikasi selisih.
              </span>
            </div>

            {/* Input Nominal Uang Fisik */}
            <div className='space-y-1.5'>
              <label
                htmlFor='input-cash-drawer'
                className='block text-xs font-semibold text-foreground'
              >
                Total Uang Tunai di Laci Kasir:
              </label>
              <div className='relative'>
                <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground'>
                  Rp
                </span>
                <Input
                  id='input-cash-drawer'
                  type='text'
                  inputMode='numeric'
                  value={cashInput ? formatNumber(cashValue) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '')
                    setCashInput(raw)
                  }}
                  placeholder='0'
                  autoFocus
                  className='pl-10 text-base font-bold tabular-nums border-none bg-muted/60 shadow-none focus-visible:bg-muted focus-visible:ring-0 rounded-xl'
                />
              </div>
            </div>

            {/* Chip Preset Pecahan Cepat */}
            <div className='space-y-1.5'>
              <span className='block text-[11px] font-medium text-muted-foreground'>
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
                    className='h-7 text-xs font-semibold border-none bg-muted/70 hover:bg-muted rounded-lg shadow-none px-2.5 py-0'
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
                    className='h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg px-2 py-0'
                  >
                    <ResetIcon className='h-3 w-3 mr-1' /> Reset
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
                className='border-none bg-muted/80 text-foreground hover:bg-muted rounded-xl shadow-none'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={!cashInput.trim()}
                className='gap-1.5 font-semibold border-none rounded-xl shadow-none'
              >
                <span>Lanjut ke Rekapitulasi</span>
                <ArrowRight className='h-3.5 w-3.5' />
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
              <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
                <CardContent className='p-2.5'>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1 mb-0.5'>
                    <Receipt className='h-3 w-3 text-emerald-600' /> Transaksi Sukses
                  </span>
                  <span className='text-base font-bold tracking-tight text-foreground tabular-nums block'>
                    {formatNumber(jumlahTransaksi)}
                  </span>
                </CardContent>
              </Card>

              {/* Total Transaksi Void */}
              <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
                <CardContent className='p-2.5'>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1 mb-0.5'>
                    <RotateCcw className='h-3 w-3 text-rose-600' /> Transaksi Void
                  </span>
                  <span className='text-base font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums block'>
                    {formatNumber(jumlahVoid)}
                  </span>
                </CardContent>
              </Card>

              {/* Total Bruto */}
              <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none col-span-2 sm:col-span-1'>
                <CardContent className='p-2.5'>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1 mb-0.5'>
                    <Coins className='h-3 w-3 text-muted-foreground' /> Total Bruto
                  </span>
                  <span className='text-xs font-semibold text-foreground tabular-nums block'>
                    {formatRupiah(totalBruto)}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Perbandingan Kas Fisik vs Pendapatan Sistem */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              {/* Uang Kas Fisik Diinput */}
              <div className='rounded-xl border border-border/40 bg-card p-3 shadow-none'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[11px] font-semibold text-muted-foreground'>
                    Uang Fisik di Laci:
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setStep('INPUT_CASH')}
                    className='h-6 text-[10px] text-primary hover:bg-primary/10 px-1.5 py-0 rounded'
                  >
                    <Pencil className='h-2.5 w-2.5 mr-1' /> Ubah
                  </Button>
                </div>
                <span className='text-lg font-bold text-foreground tabular-nums block'>
                  {formatRupiah(cashValue)}
                </span>
              </div>

              {/* Pendapatan Bersih Sistem */}
              <div className='rounded-xl border border-primary/20 bg-primary/5 p-3 shadow-none'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-[11px] font-semibold text-primary'>
                    Pendapatan Bersih (Net):
                  </span>
                </div>
                <span className='text-lg font-bold text-primary tabular-nums block'>
                  {formatRupiah(totalBersih)}
                </span>
                {totalVoid > 0 && (
                  <span className='text-[10px] text-muted-foreground mt-0.5 block'>
                    (Bruto {formatRupiah(totalBruto)} - Void {formatRupiah(totalVoid)})
                  </span>
                )}
              </div>
            </div>

            {/* Banner Status Selisih Kas */}
            <div
              className={`rounded-xl p-3 border shadow-none text-xs flex items-start gap-2.5 ${
                selisih === 0
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : selisih < 0
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300'
              }`}
            >
              {selisih === 0 ? (
                <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5' />
              ) : selisih < 0 ? (
                <AlertTriangle className='h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5' />
              ) : (
                <AlertCircle className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5' />
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
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0 border-none ${
                      selisih === 0
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : selisih < 0
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
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
                  className='block text-xs font-semibold text-foreground'
                >
                  Catatan / Keterangan Selisih:
                </label>
                {isSelisihAda ? (
                  <span className='text-[10px] font-semibold text-rose-600 dark:text-rose-400'>
                    * Wajib diisi karena ada selisih
                  </span>
                ) : (
                  <span className='text-[10px] text-muted-foreground'>
                    Opsional
                  </span>
                )}
              </div>
              <Textarea
                id='input-catatan-selisih'
                rows={2}
                value={catatanSelisih}
                onChange={(e) => setCatatanSelisih(e.target.value)}
                placeholder={
                  isSelisihAda
                    ? 'Wajib diisi: jelaskan alasan selisih kas fisik (mis. kembalian tertinggal, pembulatan, dll.)...'
                    : 'Tambahkan catatan penutupan sesi jika ada (opsional)...'
                }
                className='text-xs border-none bg-muted/60 shadow-none focus-visible:bg-muted focus-visible:ring-0 rounded-xl resize-none'
              />
            </div>

            {/* Peringatan Konfirmasi Penguncian */}
            <div className='flex items-start gap-2.5 rounded-xl border-none bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 shadow-none'>
              <AlertTriangle className='h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5' />
              <span className='text-[11px] leading-relaxed'>
                <strong>Konfirmasi:</strong> Setelah sesi ditutup, transaksi kasir
                akan dikunci dan dibukukan ke laporan. Aksi ini tidak dapat dibatalkan.
              </span>
            </div>

            <DialogFooter className='gap-2 sm:gap-2 pt-1'>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                onClick={() => setStep('INPUT_CASH')}
                disabled={isSubmitting}
                className='border-none bg-muted/80 text-foreground hover:bg-muted rounded-xl shadow-none gap-1'
              >
                <ArrowLeft className='h-3.5 w-3.5' />
                <span>Kembali</span>
              </Button>
              <Button
                type='button'
                variant='destructive'
                size='sm'
                onClick={handleCloseSession}
                disabled={isSubmitting || (isSelisihAda && !catatanSelisih.trim())}
                className='gap-1.5 font-semibold border-none rounded-xl shadow-none'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    <span>Menutup Sesi Kasir...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='h-3.5 w-3.5' />
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

export default CloseSessionModal
