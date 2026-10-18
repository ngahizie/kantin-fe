import React, { useState, useEffect, useRef } from 'react'
import {
  CheckCircle2,
  User,
  CreditCard,
  Ban,
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
import type { TapTransaksiData } from '../api/kasir-api'

export interface StudentFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: TapTransaksiData | null
  onComplete: () => void
  onVoid: (transaksiId: number) => void
  isVoiding?: boolean
  durasiDetik?: number
}

const DEFAULT_COUNTDOWN_SECONDS = 3

export const StudentFeedbackModal: React.FC<StudentFeedbackModalProps> = ({
  open,
  onOpenChange,
  data,
  onComplete,
  onVoid,
  isVoiding = false,
  durasiDetik = DEFAULT_COUNTDOWN_SECONDS,
}) => {
  const effectiveDuration =
    durasiDetik && durasiDetik > 0 ? durasiDetik : DEFAULT_COUNTDOWN_SECONDS
  const [countdown, setCountdown] = useState(effectiveDuration)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mulai hitung mundur saat modal terbuka, tersinkronisasi dengan durasi pengaturan operasional
  useEffect(() => {
    if (!open || !data || isVoiding) return

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          onComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [open, data, isVoiding, onComplete, effectiveDuration])

  if (!data) return null

  const pembeli = data.pembeli
  const isSiswa = pembeli.tipe === 'SISWA' || pembeli.subjekTipe === 'SISWA'
  const fotoUrl = pembeli.foto_url || pembeli.fotoUrl
  const sisaSaldo = pembeli.sisa_saldo ?? pembeli.saldoSisa ?? 0
  const transaksiId = data.transaksi_id || data.transaksiId || 0

  const handleVoidClick = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (transaksiId) {
      onVoid(transaksiId)
    }
  }

  const handleDoneClick = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md overflow-hidden p-6 select-none border-0 shadow-2xl'>
        <DialogHeader className='pb-2 text-center'>
          <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
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

        {/* Konten Identitas Siswa / Kartu Tamu */}
        <div className='flex flex-col items-center gap-4 py-2'>
          {/* Foto Siswa Ukuran Besar */}
          <div className='relative'>
            <Avatar className='h-32 w-32 rounded-2xl border-0 shadow-md ring-4 ring-primary/20'>
              {fotoUrl && (
                <AvatarImage
                  src={fotoUrl}
                  alt={pembeli.nama}
                  className='object-cover'
                />
              )}
              <AvatarFallback className='rounded-2xl bg-muted text-muted-foreground'>
                {isSiswa ? (
                  <User className='h-16 w-16 stroke-[1.5]' />
                ) : (
                  <CreditCard className='h-16 w-16 stroke-[1.5]' />
                )}
              </AvatarFallback>
            </Avatar>
            <div className='absolute -bottom-2.5 left-1/2 -translate-x-1/2'>
              <Badge
                variant='secondary'
                className='border-0 bg-background/95 px-2.5 py-0.5 text-xs font-semibold shadow-xs'
              >
                {isSiswa ? pembeli.kelas || 'Siswa' : 'Kartu Tamu'}
              </Badge>
            </div>
          </div>

          {/* Nama & Rincian */}
          <div className='mt-1 space-y-1 text-center'>
            <h3 className='text-lg font-bold tracking-tight text-foreground'>
              {pembeli.nama}
            </h3>
            {isSiswa && pembeli.nis && (
              <p className='font-mono text-xs text-muted-foreground'>
                NIS: {pembeli.nis}
              </p>
            )}
            {!isSiswa && pembeli.nomor_kartu && (
              <p className='font-mono text-xs text-muted-foreground'>
                No. Kartu: {pembeli.nomor_kartu}
              </p>
            )}
          </div>

          {/* Ringkasan Saldo & Total Belanja */}
          <div className='grid w-full grid-cols-2 gap-3 rounded-xl border-0 bg-muted/50 p-3 text-center shadow-xs'>
            <div>
              <span className='text-[11px] text-muted-foreground'>
                Total Belanja
              </span>
              <p className='font-mono text-sm font-bold text-foreground'>
                {formatRupiah(data.total)}
              </p>
            </div>
            <div className='pl-2'>
              <span className='text-[11px] text-muted-foreground'>
                Sisa Saldo
              </span>
              <p className='font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400'>
                {formatRupiah(sisaSaldo)}
              </p>
            </div>
          </div>

          {/* Indikator Countdown Otomatis 3 Detik */}
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Clock className='h-3.5 w-3.5 animate-pulse text-primary' />
            <span>
              Menutup otomatis dalam{' '}
              <strong className='font-mono font-bold text-primary'>
                {countdown}
              </strong>{' '}
              detik...
            </span>
          </div>
        </div>

        {/* Footer Tombol Aksi */}
        <DialogFooter className='flex-col gap-2 border-0 pt-2 sm:flex-row'>
          {/* Tombol Batalkan / Void Darurat jika Wajah Tidak Cocok */}
          <Button
            type='button'
            variant='destructive'
            size='sm'
            disabled={isVoiding}
            onClick={handleVoidClick}
            className='h-9 w-full gap-1.5 text-xs font-semibold sm:w-auto border-0 shadow-xs'
            title='Batalkan transaksi seketika jika wajah tidak cocok dengan pemilik kartu'
          >
            <Ban className='h-4 w-4' />
            <span>
              {isVoiding ? 'Membatalkan...' : 'Batalkan (Wajah Beda)'}
            </span>
          </Button>

          {/* Tombol Selesai Cepat */}
          <Button
            type='button'
            variant='default'
            size='sm'
            onClick={handleDoneClick}
            disabled={isVoiding}
            className='h-9 w-full gap-1.5 text-xs font-semibold sm:flex-1 border-0 shadow-xs'
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
