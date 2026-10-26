import { useState } from 'react'
import {
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import apiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/formatters'
import type { KartuTamuMock } from '@/mocks/mock-data'
import type { KartuTamuSlipData } from './KartuTamuSlipModal'
import { saveTopupTransaction } from '@/features/tu/saldo-storage'

const PRESET_NOMINALS = [20000, 50000, 100000, 200000]
const MAX_SALDO_KARTU_TAMU = 500000

interface TopupKartuTamuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kartu: KartuTamuMock | null
  onTopupSuccess: (kartuId: number, saldoBaru: number) => void
  onShowSlip: (data: KartuTamuSlipData) => void
}

export function TopupKartuTamuModal({
  open,
  onOpenChange,
  kartu,
  onTopupSuccess,
  onShowSlip,
}: TopupKartuTamuModalProps) {
  const [nominal, setNominal] = useState('')
  const [namaPenyetor, setNamaPenyetor] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setNominal('')
    setNamaPenyetor('')
    onOpenChange(false)
  }

  if (!kartu) return null

  const nominalNum = Number(nominal) || 0
  const saldoSaatIni = kartu.saldo
  const saldoBaru = saldoSaatIni + nominalNum
  const isExceedingLimit = saldoBaru > MAX_SALDO_KARTU_TAMU

  const isValidSubmit =
    nominalNum > 0 && !isExceedingLimit && namaPenyetor.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidSubmit) return

    setIsSubmitting(true)
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const seq = Math.floor(1000 + Math.random() * 9000)
    const refNo = `KT-TOPUP-${dateCode}-${seq}`

    try {
      let saldoFinal = saldoBaru

      try {
        const res = await apiClient.post('/api/saldo/topup', {
          subjekTipe: 'KARTU_TAMU',
          subjekId: kartu.id,
          nominal: nominalNum,
          penyetor: namaPenyetor.trim(),
          referensiId: refNo,
        })
        const resData = res.data?.data
        saldoFinal = resData?.saldoSetelah ?? resData?.saldo_baru ?? saldoBaru
      } catch {
        // Fallback simulasi
      }

      onTopupSuccess(kartu.id, saldoFinal)

      // Simpan mutasi top-up kartu tamu ke storage lokal agar muncul di rincian setoran kas TU
      saveTopupTransaction({
        id: refNo,
        waktu: new Date().toISOString(),
        subjek_tipe: 'KARTU_TAMU',
        subjek_nama: kartu.label_pemegang || `Kartu Tamu (${kartu.nomor_kartu})`,
        subjek_info: `Kartu: ${kartu.nomor_kartu}`,
        nominal: nominalNum,
        penyetor: namaPenyetor.trim(),
        referensi_id: refNo,
        tanggal: new Date().toISOString().slice(0, 10),
        petugas_id: 2,
      })

      toast.success(`Top-up ${formatRupiah(nominalNum)} berhasil!`, {
        description: `Saldo baru ${kartu.nomor_kartu}: ${formatRupiah(saldoFinal)}`,
      })

      onShowSlip({
        type: 'TOPUP',
        ref_no: refNo,
        waktu: new Date().toISOString(),
        petugas_nama: 'Wibisana Bama (Petugas TU)',
        nomor_kartu: kartu.nomor_kartu,
        uid: kartu.uid,
        label_pemegang: kartu.label_pemegang,
        nominal: nominalNum,
        saldo_awal: saldoSaatIni,
        saldo_baru: saldoFinal,
        nama_penyetor: namaPenyetor.trim(),
      })

      handleClose()
    } catch {
      toast.error('Gagal melakukan top-up.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-md sm:rounded-2xl border-0 shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            Top-up Saldo Kartu Tamu
          </DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Pengisian saldo tunai untuk kartu tamu pemegang
          </DialogDescription>
        </DialogHeader>

        {/* Kartu Info */}
        <div className='flex items-center justify-between p-3.5 bg-muted/60 rounded-xl'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='font-bold font-mono text-foreground'>
                {kartu.nomor_kartu}
              </span>
              <Badge variant='secondary' className='border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-medium'>
                AKTIF
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground truncate mt-0.5'>
              {kartu.label_pemegang || '(Tanpa label pemegang)'}
            </p>
          </div>
          <div className='text-right shrink-0'>
            <p className='text-xs text-muted-foreground'>Saldo Saat Ini</p>
            <p className='font-bold text-base text-emerald-600 dark:text-emerald-400 font-mono'>
              {formatRupiah(saldoSaatIni)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* Preset Nominal */}
          <div className='space-y-2'>
            <Label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Pilihan Nominal Preset
            </Label>
            <div className='grid grid-cols-4 gap-2'>
              {PRESET_NOMINALS.map((preset) => (
                <Button
                  key={preset}
                  type='button'
                  variant={nominalNum === preset ? 'default' : 'secondary'}
                  size='sm'
                  className='h-10 text-xs font-semibold border-0'
                  onClick={() => setNominal(preset.toString())}
                >
                  {(preset / 1000).toFixed(0)}rb
                </Button>
              ))}
            </div>
          </div>

          {/* Input Bebas */}
          <div className='space-y-2'>
            <Label
              htmlFor='kt-nominal'
              className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'
            >
              Nominal (Rp)
            </Label>
            <div className='relative'>
              <span className='absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm'>
                Rp
              </span>
              <Input
                id='kt-nominal'
                type='number'
                min={1000}
                placeholder='Masukkan nominal...'
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                className='pl-11 h-11 text-base font-mono font-bold'
              />
            </div>
          </div>

          {/* Nama Penyetor */}
          <div className='space-y-2'>
            <Label
              htmlFor='kt-penyetor'
              className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'
            >
              Nama Penyetor
            </Label>
            <Input
              id='kt-penyetor'
              placeholder='Contoh: Pak Hartono, Ibu Kepala Sekolah'
              value={namaPenyetor}
              onChange={(e) => setNamaPenyetor(e.target.value)}
              className='h-11 text-sm'
              required
            />
          </div>

          {/* Kalkulasi & Validasi */}
          {nominalNum > 0 && (
            <div className='space-y-3'>
              <div className='p-3.5 bg-muted/60 rounded-xl space-y-2 text-sm'>
                <p className='text-xs font-bold text-muted-foreground uppercase tracking-wide'>
                  Kalkulasi
                </p>
                <div className='flex justify-between text-muted-foreground'>
                  <span>Saldo saat ini:</span>
                  <span className='font-mono font-medium text-foreground'>
                    {formatRupiah(saldoSaatIni)}
                  </span>
                </div>
                <div className='flex justify-between text-emerald-600 dark:text-emerald-400 font-medium'>
                  <span>Nominal (+):</span>
                  <span className='font-mono font-bold'>
                    {formatRupiah(nominalNum)}
                  </span>
                </div>
                <div className='border-t border-border pt-2 flex justify-between font-bold'>
                  <span>Estimasi saldo baru:</span>
                  <span
                    className={`font-mono ${
                      isExceedingLimit
                        ? 'text-destructive'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatRupiah(saldoBaru)}
                  </span>
                </div>
              </div>

              {isExceedingLimit && (
                <div className='p-3.5 border-0 bg-destructive/10 text-destructive rounded-xl text-xs leading-relaxed'>
                  <strong className='text-xs font-bold uppercase tracking-wide block mb-1'>
                    Melebihi Batas Maksimum!
                  </strong>
                  <p className='text-xs leading-relaxed text-destructive/90'>
                    Batas saldo Kartu Tamu:{' '}
                    <strong>{formatRupiah(MAX_SALDO_KARTU_TAMU)}</strong>.
                    Kurangi nominal top-up.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className='gap-2 pt-1'>
            <Button
              type='button'
              variant='secondary'
              onClick={handleClose}
              className='border-0 bg-muted/80 hover:bg-muted text-foreground shadow-none flex-1 sm:flex-none'
            >
              Batal
            </Button>
            <Button
              type='submit'
              disabled={!isValidSubmit || isSubmitting}
              className='flex-1 sm:flex-none gap-2'
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className='h-4 w-4 animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className='h-4 w-4' />
                  Proses Top-up
                  <ArrowRight className='h-3.5 w-3.5 ml-auto' />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
