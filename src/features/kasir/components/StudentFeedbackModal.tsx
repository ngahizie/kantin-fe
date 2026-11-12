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
      <DialogContent className='max-w-md overflow-hidden p-6 select-none'>
        <DialogHeader className='pb-2 text-center'>
          <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='h-7 w-7' />
          </div>
          <DialogTitle className='text-xl font-bold tracking-tight text-foreground'>
            Transaksi Berhasil
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            Verifikasi visual wajah pembeli dengan foto identitas kartu di bawah
            ini.
          </DialogDescription>
        </DialogHeader>

        {/* Konten Identitas Siswa */}
        <div className='flex flex-col items-center gap-4 py-2'>
          {/* Foto Siswa Ukuran Besar */}
          <div className='relative'>
            <Avatar className='h-32 w-32 rounded-xl border border-border'>
              {fotoUrl && (
                <AvatarImage
                  src={fotoUrl}
                  alt={namaPembeli}
                  className='object-cover'
                />
              )}
              <AvatarFallback className='rounded-xl bg-muted text-muted-foreground'>
                <User className='h-16 w-16 stroke-[1.5]' />
              </AvatarFallback>
            </Avatar>
            <div className='absolute -bottom-2.5 left-1/2 -translate-x-1/2'>
              <Badge
                variant='outline'
                className='rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-foreground shadow-xs'
              >
                {pembeli?.kelas || 'Siswa'}
              </Badge>
            </div>
          </div>

          {/* Nama & Rincian */}
          <div className='mt-1 space-y-1 text-center'>
            <h3 className='text-lg font-bold tracking-tight text-foreground'>
              {namaPembeli}
            </h3>
            {pembeli?.nis && (
              <p className='text-xs tabular-nums text-muted-foreground'>
                NIS: {pembeli.nis}
              </p>
            )}
          </div>

          {/* Ringkasan Saldo & Total Belanja */}
          <div className='grid w-full grid-cols-2 gap-3 rounded-xl border border-border bg-muted/40 p-3 text-center'>
            <div>
              <span className='text-[11px] text-muted-foreground'>
                Total Belanja
              </span>
              <p className='text-sm font-bold tabular-nums text-foreground'>
                {formatRupiah(data.total)}
              </p>
            </div>
            <div className='border-l border-border pl-2'>
              <span className='text-[11px] text-muted-foreground'>
                Sisa Saldo
              </span>
              <p className='text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400'>
                {formatRupiah(sisaSaldo)}
              </p>
            </div>
          </div>

          {/* Indikator Countdown Otomatis 15 Detik */}
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Clock className='h-3.5 w-3.5 animate-pulse text-primary' />
            <span>
              Menutup otomatis dalam{' '}
              <strong className='font-bold tabular-nums text-primary'>
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
            className='h-9 w-full gap-1.5 text-xs font-semibold'
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
