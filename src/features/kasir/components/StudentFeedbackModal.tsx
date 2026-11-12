import React, { useState, useEffect, useRef } from 'react'
import {
  CheckCircle2,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { formatRupiah } from '@/lib/formatters'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TapTransaksiData, TapBuyerInfo } from '../types'

export interface StudentFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: TapTransaksiData | null
  onComplete: () => void
  durasiDetik?: number
}

const DEFAULT_COUNTDOWN_SECONDS = 15

export const StudentFeedbackModal: React.FC<StudentFeedbackModalProps> = ({
  open,
  onOpenChange,
  data,
  onComplete,
  durasiDetik = DEFAULT_COUNTDOWN_SECONDS,
}) => {
  const effectiveDuration =
    durasiDetik && durasiDetik > 0 ? durasiDetik : DEFAULT_COUNTDOWN_SECONDS
  const [countdown, setCountdown] = useState(effectiveDuration)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)
  const [prevOpen, setPrevOpen] = useState(open)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setCountdown(effectiveDuration)
    }
  }

  // Reset guard penyelesaian setiap modal dibuka kembali
  useEffect(() => {
    if (open) {
      completedRef.current = false
    }
  }, [open, data])

  // Mulai hitung mundur saat modal terbuka, tersinkronisasi dengan durasi pengaturan operasional
  useEffect(() => {
    if (!open || !data) return

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [open, data])

  // Panggil onComplete di luar state updater saat hitung mundur mencapai 0
  useEffect(() => {
    if (open && data && countdown === 0 && !completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  }, [open, data, countdown, onComplete])

  if (!data) return null

  const rawExtra = data as unknown as {
    fotoUrl?: string
    saldoSisa?: number
    nama?: string
  }
  const pembeli: Partial<TapBuyerInfo> =
    data.pembeli || (data as unknown as Partial<TapBuyerInfo>) || {}
  const fotoUrl =
    pembeli?.foto_url || pembeli?.fotoUrl || rawExtra.fotoUrl || null
  const sisaSaldo =
    pembeli?.sisa_saldo ?? pembeli?.saldoSisa ?? rawExtra.saldoSisa ?? 0
  const namaPembeli = pembeli?.nama || rawExtra.nama || 'Pembeli'

  const handleDoneClick = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (!completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md overflow-hidden p-6 select-none has-border !border !border-slate-200 dark:!border-slate-800 shadow-none rounded-2xl bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-white'>
        <DialogHeader className='pb-2 text-center'>
          <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='h-7 w-7' />
          </div>
          <DialogTitle className='text-xl font-bold tracking-tight text-slate-800 dark:text-white'>
            Transaksi Berhasil
          </DialogTitle>
          <DialogDescription className='text-xs text-slate-500 dark:text-slate-400'>
            Verifikasi visual wajah pembeli dengan foto identitas kartu di bawah
            ini.
          </DialogDescription>
        </DialogHeader>

        {/* Konten Identitas Siswa */}
        <div className='flex flex-col items-center gap-4 py-2'>
          {/* Foto Siswa Ukuran Besar */}
          <div className='relative'>
            <Avatar className='h-32 w-32 rounded-2xl has-border !border !border-slate-200 dark:!border-slate-800 shadow-none'>
              {fotoUrl && (
                <AvatarImage
                  src={fotoUrl}
                  alt={namaPembeli}
                  className='object-cover'
                />
              )}
              <AvatarFallback className='rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500'>
                <User className='h-16 w-16 stroke-[1.5]' />
              </AvatarFallback>
            </Avatar>
            <div className='absolute -bottom-2.5 left-1/2 -translate-x-1/2'>
              <Badge
                variant='secondary'
                className='has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-slate-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full shadow-none'
              >
                {pembeli?.kelas || 'Siswa'}
              </Badge>
            </div>
          </div>

          {/* Nama & Rincian */}
          <div className='mt-1 space-y-1 text-center'>
            <h3 className='text-lg font-bold tracking-tight text-slate-800 dark:text-white'>
              {namaPembeli}
            </h3>
            {pembeli?.nis && (
              <p className='text-xs text-slate-500 dark:text-slate-400'>
                NIS: {pembeli.nis}
              </p>
            )}
          </div>

          {/* Ringkasan Saldo & Total Belanja */}
          <div className='grid w-full grid-cols-2 gap-3 rounded-2xl has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 text-center shadow-none'>
            <div>
              <span className='text-[11px] text-slate-500 dark:text-slate-400'>
                Total Belanja
              </span>
              <p className='text-sm font-bold text-slate-800 dark:text-white tabular-nums'>
                {formatRupiah(data.total)}
              </p>
            </div>
            <div className='pl-2'>
              <span className='text-[11px] text-slate-500 dark:text-slate-400'>
                Sisa Saldo
              </span>
              <p className='text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums'>
                {formatRupiah(sisaSaldo)}
              </p>
            </div>
          </div>

          {/* Indikator Countdown Otomatis 15 Detik */}
          <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
            <Clock className='h-3.5 w-3.5 animate-pulse text-blue-600 dark:text-blue-400' />
            <span>
              Menutup otomatis dalam{' '}
              <strong className='font-bold text-blue-600 dark:text-blue-400 tabular-nums'>
                {countdown}
              </strong>{' '}
              detik...
            </span>
          </div>
        </div>

        {/* Footer Tombol Aksi */}
        <DialogFooter className='pt-2'>
          {/* Tombol Selesai Cepat */}
          <Button
            type='button'
            variant='default'
            size='sm'
            onClick={handleDoneClick}
            className='h-9 w-full gap-1.5 text-xs font-semibold !bg-blue-600 hover:!bg-blue-500 !text-white rounded-xl shadow-none'
          >
            <span>Selesai</span>
            <ArrowRight className='h-3.5 w-3.5' />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StudentFeedbackModal
