import { useState, useId } from 'react'
import {
  Coins,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Calculator,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import apiClient from '@/lib/api-client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/formatters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SetoranKasItem } from './types'

interface KonfirmasiSetoranModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setoran: SetoranKasItem | null
  onSuccess?: (updated: SetoranKasItem) => void
}

const PECAHAN_UANG = [
  { label: 'Rp 100.000', value: 100000 },
  { label: 'Rp 50.000', value: 50000 },
  { label: 'Rp 20.000', value: 20000 },
  { label: 'Rp 10.000', value: 10000 },
  { label: 'Rp 5.000', value: 5000 },
  { label: 'Rp 2.000', value: 2000 },
  { label: 'Rp 1.000', value: 1000 },
  { label: 'Koin / Logam', value: 1 },
]

interface FormContentProps {
  setoran: SetoranKasItem
  onSuccess?: (updated: SetoranKasItem) => void
  onCancel: () => void
}

function KonfirmasiSetoranFormContent({
  setoran,
  onSuccess,
  onCancel,
}: FormContentProps) {
  const { auth } = useAuthStore()
  const bendaharaNama = auth.user?.nama || 'Siti Rahma (Bendahara)'

  const initialUangFisik =
    setoran.uang_fisik !== null && setoran.uang_fisik !== undefined
      ? setoran.uang_fisik.toString()
      : setoran.total_sistem.toString()

  const [uangFisikStr, setUangFisikStr] = useState<string>(initialUangFisik)
  const [catatan, setCatatan] = useState<string>(setoran.catatan || '')
  const [showCalculator, setShowCalculator] = useState(false)
  const [pecahanCounts, setPecahanCounts] = useState<Record<number, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const uangFisikInputId = useId()
  const catatanInputId = useId()

  const totalSistem = setoran.total_sistem || 0
  const uangFisik = Number(uangFisikStr) || 0
  const selisih = uangFisik - totalSistem
  const hasSelisih = selisih !== 0

  const handlePecahanChange = (pecahan: number, countStr: string) => {
    const count = Math.max(0, parseInt(countStr, 10) || 0)
    const newCounts = { ...pecahanCounts, [pecahan]: count }
    setPecahanCounts(newCounts)

    let totalFromCalc = 0
    for (const [pec, qty] of Object.entries(newCounts)) {
      totalFromCalc += Number(pec) * (qty || 0)
    }
    setUangFisikStr(totalFromCalc.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasSelisih && (!catatan || catatan.trim().length < 3)) {
      toast.error('Catatan / Berita Acara selisih kas fisik wajib diisi!')
      return
    }

    setIsSubmitting(true)
    try {
      const dateCode = (setoran.tanggal || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
      const refId = `BA-SETORAN-${dateCode}-${setoran.petugas_id || setoran.id}`

      const payload = {
        tanggal: setoran.tanggal,
        petugasId: setoran.petugas_id || 1,
        jumlahDisetor: uangFisik,
        referensiId: refId,
        catatan: catatan.trim() || undefined,
      }

      const res = await apiClient.post('/api/saldo/setoran-tu', payload)

      const beData = (res.data?.data || {}) as {
        referensiId?: string
        jumlahDisetor?: number
        selisih?: number
        status?: string
        catatan?: string
        waktu?: string
      }
      const beStatus = beData.status?.toUpperCase()
      const updatedData: SetoranKasItem = {
        ...setoran,
        id: beData.referensiId || setoran.id,
        uang_fisik:
          beData.jumlahDisetor !== undefined ? beData.jumlahDisetor : uangFisik,
        selisih:
          beData.selisih !== undefined ? -beData.selisih : selisih,
        status: beStatus === 'DIKONFIRMASI' ? 'DIKONFIRMASI' : 'TERKONFIRMASI',
        catatan:
          beData.catatan ||
          catatan.trim() ||
          (selisih === 0
            ? 'Uang fisik pas sesuai total sistem'
            : `Selisih kas ${selisih < 0 ? 'kurang' : 'lebih'} ${formatRupiah(Math.abs(selisih))}`),
        bendahara_nama: bendaharaNama,
        konfirmasi_pada: beData.waktu || new Date().toISOString(),
      }

      toast.success(
        selisih === 0
          ? 'Setoran kas fisik berhasil dikonfirmasi (Kas Pas)!'
          : `Setoran kas berhasil dikonfirmasi dengan catatan selisih ${formatRupiah(selisih)}`
      )

      onSuccess?.(updatedData)
      onCancel()
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } }
      toast.error(
        errorObj.response?.data?.message ||
          'Gagal mengonfirmasi setoran kas ke server.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4 py-2'>
      {/* Ringkasan Setoran dari Sistem */}
      <div className='space-y-3 rounded-xl border border-border bg-muted/30 p-3.5 text-sm'>
        <div className='flex items-center justify-between border-b border-border pb-2'>
          <div className='flex items-center gap-1.5 text-muted-foreground'>
            <Receipt className='h-4 w-4' />
            <span className='font-medium'>No. Setoran:</span>
          </div>
          <span className='font-mono font-semibold tabular-nums'>{setoran.id}</span>
        </div>

        <div className='grid grid-cols-2 gap-2 text-xs'>
          <div>
            <span className='block text-muted-foreground'>Petugas TU:</span>
            <span className='font-medium text-foreground'>
              {setoran.petugas_nama}
            </span>
          </div>
          <div>
            <span className='block text-muted-foreground'>Tanggal Rekap:</span>
            <span className='font-medium text-foreground tabular-nums'>
              {setoran.tanggal}
            </span>
          </div>
          <div>
            <span className='block text-muted-foreground'>
              Jml Transaksi Top-up:
            </span>
            <span className='font-medium text-foreground tabular-nums'>
              {setoran.total_transaksi} Transaksi (Siswa:{' '}
              {formatRupiah(setoran.total_topup_siswa)})
            </span>
          </div>
        </div>

        <div className='flex items-center justify-between rounded-lg border border-border bg-card p-2.5'>
          <div>
            <span className='text-xs font-medium text-muted-foreground'>
              Total Catatan Penerimaan (Sistem)
            </span>
            <p className='text-xs text-muted-foreground'>
              Cocokkan dengan uang tunai yang diterima
            </p>
          </div>
          <span className='font-mono text-lg font-bold text-primary tabular-nums'>
            {formatRupiah(totalSistem)}
          </span>
        </div>
      </div>

      {/* Input Uang Fisik */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label htmlFor={uangFisikInputId} className='text-sm font-semibold'>
            Jumlah Uang Tunai Diterima{' '}
            <span className='text-destructive'>*</span>
          </Label>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => setShowCalculator(!showCalculator)}
            className='h-7 gap-1 px-2 text-xs text-primary'
          >
            <Calculator className='h-3.5 w-3.5' />
            {showCalculator
              ? 'Tutup Hitung Lembar'
              : 'Hitung Lembar Uang'}
          </Button>
        </div>

        <div className='relative'>
          <span className='absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium text-muted-foreground'>
            Rp
          </span>
          <Input
            id={uangFisikInputId}
            type='number'
            min='0'
            step='500'
            value={uangFisikStr}
            onChange={(e) => setUangFisikStr(e.target.value)}
            placeholder='Masukkan total uang fisik disetor'
            className='pl-10 font-mono text-sm font-semibold tabular-nums'
            required
          />
        </div>
      </div>

      {/* Kalkulator Pecahan Uang Interaktif */}
      {showCalculator && (
        <div className='animate-in space-y-2 rounded-xl border border-dashed border-border bg-muted/20 p-3 fade-in-50'>
          <div className='flex items-center justify-between border-b border-border pb-1 text-xs font-semibold text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Coins className='h-3.5 w-3.5 text-amber-500' />
              Hitung Lembar & Koin Fisik:
            </span>
            <Button
              type='button'
              variant='link'
              size='sm'
              onClick={() => {
                setPecahanCounts({})
                setUangFisikStr('0')
              }}
              className='h-5 p-0 text-xs text-destructive'
            >
              Reset Pecahan
            </Button>
          </div>

          <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {PECAHAN_UANG.map((pec) => (
              <div key={pec.value} className='space-y-1'>
                <Label className='font-mono text-[11px] text-muted-foreground tabular-nums'>
                  {pec.label}
                </Label>
                <Input
                  type='number'
                  min='0'
                  value={pecahanCounts[pec.value] ?? ''}
                  onChange={(e) =>
                    handlePecahanChange(pec.value, e.target.value)
                  }
                  placeholder='0 lbr'
                  className='h-8 font-mono text-xs tabular-nums'
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indikator Selisih Kas Fisik */}
      <div className='space-y-2 rounded-xl border border-border p-3.5'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold text-muted-foreground'>
            Kesesuaian Uang Kas:
          </span>
          {selisih === 0 ? (
            <Badge
              variant='outline'
              className='gap-1 rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
            >
              <CheckCircle2 className='h-3.5 w-3.5' />
              Jumlah Uang Pas (Cocok)
            </Badge>
          ) : selisih < 0 ? (
            <Badge
              variant='outline'
              className='gap-1 rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 tabular-nums dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
            >
              <AlertTriangle className='h-3.5 w-3.5' />
              Uang Kurang (-{formatRupiah(Math.abs(selisih))})
            </Badge>
          ) : (
            <Badge
              variant='outline'
              className='gap-1 rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 tabular-nums dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
            >
              <Info className='h-3.5 w-3.5' />
              Uang Lebih (+{formatRupiah(selisih)})
            </Badge>
          )}
        </div>

        <div className='flex items-center justify-between border-t border-border pt-1.5 text-xs'>
          <span className='text-muted-foreground tabular-nums'>
            Catatan Sistem: {formatRupiah(totalSistem)}
          </span>
          <span className='font-mono text-muted-foreground tabular-nums'>
            Selisih: {selisih > 0 ? '+' : ''}{formatRupiah(selisih)}
          </span>
        </div>
      </div>

      {/* Peringatan & Catatan jika Ada Selisih */}
      {hasSelisih ? (
        <Alert className='border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'>
          <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
          <AlertTitle className='text-xs font-semibold'>
            Perhatian: Terdapat Selisih Uang
          </AlertTitle>
          <AlertDescription className='mt-1 text-xs'>
            Selisih uang kas <strong>wajib dicatat</strong>{' '}
            dan tidak boleh dihapus atau ditutupi. Mohon tuliskan alasan atau
            keterangan penyebab selisih di bawah ini.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className='border-emerald-200 bg-emerald-50 py-2.5 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'>
          <ShieldCheck className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
          <AlertDescription className='text-xs'>
            Jumlah uang tunai telah sesuai 100% dengan catatan penerimaan
            TU.
          </AlertDescription>
        </Alert>
      )}

      {/* Field Catatan / Berita Acara */}
      <div className='space-y-1.5'>
        <Label htmlFor={catatanInputId} className='text-xs font-semibold'>
          Catatan Penyerahan Kas{' '}
          {hasSelisih ? (
            <span className='text-destructive'>
              * (Wajib diisi karena ada selisih)
            </span>
          ) : (
            <span className='font-normal text-muted-foreground'>
              (Opsional)
            </span>
          )}
        </Label>
        <Textarea
          id={catatanInputId}
          rows={2}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder={
            hasSelisih
              ? 'Contoh: Kurang Rp2.000 karena selisih kembalian koin saat jam istirahat'
              : 'Catatan tambahan penerimaan setoran kas (opsional)'
          }
          className='resize-none text-xs'
          required={hasSelisih}
        />
      </div>

      <DialogFooter className='gap-2 pt-2 sm:space-x-0'>
        <Button
          type='button'
          variant='outline'
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          type='submit'
          disabled={isSubmitting || (hasSelisih && !catatan.trim())}
          className='gap-1.5'
        >
          <CheckCircle2 className='h-4 w-4' />
          {isSubmitting ? 'Menyimpan...' : 'Simpan & Terima Setoran'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function KonfirmasiSetoranModal({
  open,
  onOpenChange,
  setoran,
  onSuccess,
}: KonfirmasiSetoranModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[580px]'>
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold'>
            Konfirmasi Setoran Kas TU
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Verifikasi uang fisik yang disetorkan petugas TU kepada
            Bendahara Sekolah
          </DialogDescription>
        </DialogHeader>

        {setoran && (
          <KonfirmasiSetoranFormContent
            key={setoran.id}
            setoran={setoran}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
