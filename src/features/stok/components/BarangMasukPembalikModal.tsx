import { useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { stokApi } from '../api/stok-api'
import type { RiwayatStokItem } from '../types'
import { hitungHppSetelahPembalik } from '../utils/hpp-calculator'

interface BarangMasukPembalikModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mutasi: RiwayatStokItem | null
  onSuccess?: () => void
}

function generateNoBuktiPembalik(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `BMP-${yyyy}${mm}${dd}-${rand}`
}

interface PembalikFormContentProps {
  mutasi: RiwayatStokItem
  onClose: () => void
  onSuccess?: () => void
}

function PembalikFormContent({
  mutasi,
  onClose,
  onSuccess,
}: PembalikFormContentProps) {
  const sisaMaks = mutasi.sisaDapatDibalik ?? mutasi.qty
  const hargaBeliAsal = mutasi.hargaBeliSatuan ?? 0
  const stokSekarang = mutasi.stokSetelah
  const hppSekarang = mutasi.hppSnapshot ?? hargaBeliAsal

  const [qtyBalik, setQtyBalik] = useState<number>(sisaMaks > 0 ? sisaMaks : 1)
  const [alasan, setAlasan] = useState('')
  const [referensiId, setReferensiId] = useState(generateNoBuktiPembalik())
  const [submitting, setSubmitting] = useState(false)

  // Estimasi HPP baru setelah dibalik
  const estimasiHppBaru = hitungHppSetelahPembalik(
    stokSekarang,
    hppSekarang,
    qtyBalik,
    hargaBeliAsal
  )
  const estimasiStokBaru = Math.max(0, stokSekarang - qtyBalik)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!alasan.trim()) {
      toast.error('Alasan pembalik wajib diisi')
      return
    }

    if (alasan.trim().length < 3) {
      toast.error('Alasan pembalik minimal 3 karakter')
      return
    }

    if (!referensiId.trim()) {
      toast.error('Nomor bukti pembalik wajib diisi')
      return
    }

    if (qtyBalik < 1 || qtyBalik > sisaMaks) {
      toast.error(`Qty pembalik harus antara 1 sampai ${sisaMaks}`)
      return
    }

    try {
      setSubmitting(true)
      await stokApi.catatBarangMasukPembalik({
        mutasiId: mutasi.id,
        qty: qtyBalik,
        alasan: alasan.trim(),
        referensiId: referensiId.trim(),
      })

      toast.success(
        `Berhasil membuat mutasi pembalik untuk ${mutasi.menuNama || 'menu'} sejumlah ${formatNumber(qtyBalik)} unit!`
      )
      onClose()
      onSuccess?.()
    } catch (err: unknown) {
      const error = err as {
        message?: string
        response?: { data?: { message?: string } }
      }
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Gagal mencatat mutasi pembalik'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className='text-lg text-destructive'>
          Koreksi Barang Masuk (Pembalik)
        </DialogTitle>
        <DialogDescription className='sr-only'>
          Koreksi Barang Masuk (Pembalik)
        </DialogDescription>
      </DialogHeader>

      <div className='space-y-4 py-4 text-xs'>
        {/* Box Ringkasan Transaksi Asal */}
        <div className='space-y-2 rounded-lg border-0 bg-muted/60 dark:bg-muted/25 p-3 shadow-xs'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-semibold text-foreground'>
              {mutasi.menuNama || `Menu #${mutasi.menuId}`}
            </span>
            <Badge className='border-0 bg-muted/80 text-[10px] font-normal text-muted-foreground'>
              Bukti Asal: {mutasi.referensiId}
            </Badge>
          </div>

          <div className='grid grid-cols-2 gap-2 border-t pt-1 text-[11px] text-muted-foreground'>
            <div>
              Waktu Transaksi:{' '}
              <span className='font-medium text-foreground'>
                {formatDateTime(mutasi.waktu)}
              </span>
            </div>
            <div>
              Qty Masuk Asal:{' '}
              <span className='font-medium text-foreground'>
                {formatNumber(mutasi.qty)} unit
              </span>
            </div>
            <div>
              Harga Beli / Unit:{' '}
              <span className='font-medium text-foreground'>
                {formatRupiah(mutasi.hargaBeliSatuan)}
              </span>
            </div>
            <div>
              Sisa Dapat Dibalik:{' '}
              <span className='font-bold text-destructive'>
                {formatNumber(sisaMaks)} unit
              </span>
            </div>
          </div>
        </div>

        {/* Input Form Fields */}
        <div className='space-y-3'>
          {/* Qty Pembalik */}
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='qty-pembalik' className='text-xs'>
                Jumlah yang Dibalik (Qty){' '}
                <span className='text-destructive'>*</span>
              </Label>
              <button
                type='button'
                onClick={() => setQtyBalik(sisaMaks)}
                className='text-[11px] text-primary hover:underline'
              >
                Balikkan Seluruh Sisa ({sisaMaks})
              </button>
            </div>
            <Input
              id='qty-pembalik'
              type='number'
              min='1'
              max={sisaMaks}
              value={qtyBalik}
              onChange={(e) =>
                setQtyBalik(
                  Math.min(sisaMaks, Math.max(1, parseInt(e.target.value) || 1))
                )
              }
              required
            />
          </div>

          {/* No Bukti Pembalik */}
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='ref-pembalik' className='text-xs'>
                Nomor Bukti Pembalik <span className='text-destructive'>*</span>
              </Label>
              <button
                type='button'
                onClick={() => setReferensiId(generateNoBuktiPembalik())}
                className='text-[11px] text-primary hover:underline'
              >
                Acak No. Bukti
              </button>
            </div>
            <Input
              id='ref-pembalik'
              value={referensiId}
              onChange={(e) => setReferensiId(e.target.value)}
              placeholder='Contoh: BMP-20261006-0001'
              required
            />
          </div>

          {/* Alasan Pembalik (Wajib) */}
          <div className='space-y-1.5'>
            <Label htmlFor='alasan-pembalik' className='text-xs'>
              Alasan Koreksi / Pembalik{' '}
              <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              id='alasan-pembalik'
              rows={3}
              placeholder='Jelaskan alasan pembatalan / koreksi (misal: salah input jumlah stok faktur, barang rusak saat kirim, dll)...'
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              required
            />
            <span className='text-[10px] text-muted-foreground'>
              Alasan wajib diisi untuk rekam jejak audit sesuai standar
              operasional.
            </span>
          </div>
        </div>

        {/* Simulasi Dampak Pembalik */}
        <div className='space-y-1 rounded-lg border-0 bg-destructive/10 p-3 text-xs'>
          <p className='font-semibold text-destructive'>
            Simulasi Dampak terhadap Stok & HPP:
          </p>
          <div className='grid grid-cols-2 gap-2 pt-1 text-[11px]'>
            <div>
              Pengurangan Stok:{' '}
              <span className='font-bold text-destructive'>
                -{qtyBalik} unit
              </span>
            </div>
            <div>
              Estimasi Sisa Stok:{' '}
              <span className='font-medium'>
                {formatNumber(estimasiStokBaru)} unit
              </span>
            </div>
            <div>
              Nilai Dikeluarkan:{' '}
              <span className='font-medium'>
                {formatRupiah(qtyBalik * hargaBeliAsal)}
              </span>
            </div>
            <div>
              Estimasi HPP Baru:{' '}
              <span className='font-bold text-primary'>
                {formatRupiah(estimasiHppBaru)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className='gap-2 sm:gap-0'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onClose}
          disabled={submitting}
          className='text-xs'
        >
          Batal
        </Button>
        <Button
          type='submit'
          variant='destructive'
          size='sm'
          disabled={submitting || !alasan.trim()}
          className='gap-2 text-xs'
        >
          {submitting ? (
            <>
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
              Memproses Pembalik...
            </>
          ) : (
            <>
              <RotateCcw className='h-3.5 w-3.5' />
              Konfirmasi Koreksi Pembalik
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function BarangMasukPembalikModal({
  open,
  onOpenChange,
  mutasi,
  onSuccess,
}: BarangMasukPembalikModalProps) {
  if (!mutasi) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <PembalikFormContent
          key={mutasi.id}
          mutasi={mutasi}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
