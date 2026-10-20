import { useRef } from 'react'
import {
  Printer,
  Lock,
  ArrowRight,
  Building,
  CreditCard,
  User,
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
import { Badge } from '@/components/ui/badge'
import { formatRupiah } from '@/lib/formatters'
import type { RefundSlipData } from './types'

interface SlipRefundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slipData: RefundSlipData | null
}

export function SlipRefundModal({
  open,
  onOpenChange,
  slipData,
}: SlipRefundModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!slipData) return null

  const handlePrint = () => {
    window.print()
  }

  const isTransfer = slipData.type === 'TRANSFER_SAUDARA'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md sm:max-w-lg overflow-y-auto max-h-[90vh] border-0 shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold text-foreground'>
            {isTransfer ? 'Bukti Pemindahan Saldo Saudara' : 'Bukti Refund Saldo Siswa'}
          </DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Dokumen resmi bukti transaksi TU & mutasi buku kas kantin
          </DialogDescription>
        </DialogHeader>

        {/* Struk Fisik Thermal Format */}
        <div
          ref={printAreaRef}
          className='rounded-xl border-0 bg-muted/50 dark:bg-muted/20 p-5 space-y-4 font-sans text-xs'
        >
          {/* Header Slip */}
          <div className='text-center pb-3 border-0 space-y-1'>
            <div className='flex items-center justify-center gap-1.5 font-bold text-sm tracking-wide text-foreground'>
              <Building className='h-4 w-4 text-primary' />
              KANTIN CASHLESS SKOOLIA
            </div>
            <p className='text-muted-foreground text-[11px]'>
              SMA NEGERI 1 SKOOLIA — TATA USAHA & BENDAHARA
            </p>
            <p className='text-[10px] text-muted-foreground font-mono'>
              REF NO: {slipData.ref_no}
            </p>
          </div>

          {/* Badge Transaksi */}
          <div className='flex justify-between items-center bg-card p-2.5 rounded-lg border-0 shadow-none'>
            <span className='font-medium text-muted-foreground'>Jenis Transaksi:</span>
            <Badge
              variant='outline'
              className={
                isTransfer
                  ? 'border-0 bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium'
                  : 'border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium'
              }
            >
              {isTransfer ? 'Transfer Antar Saudara' : `Refund Ortu (${slipData.metode})`}
            </Badge>
          </div>

          {/* Info Siswa Asal */}
          <div className='space-y-1.5 pt-1'>
            <p className='text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1'>
              <User className='h-3.5 w-3.5 text-muted-foreground' />
              Data Siswa Nonaktif (Asal)
            </p>
            <div className='grid grid-cols-2 gap-x-2 gap-y-1 bg-card p-2.5 rounded-lg border-0 shadow-none'>
              <span className='text-muted-foreground'>Nama Siswa:</span>
              <span className='font-semibold text-right truncate'>{slipData.siswa_asal.nama}</span>
              <span className='text-muted-foreground'>NIS / Kelas:</span>
              <span className='text-right font-mono'>
                {slipData.siswa_asal.nis} ({slipData.siswa_asal.kelas_terakhir})
              </span>
              <span className='text-muted-foreground'>Kartu RFID:</span>
              <span className='text-right font-mono text-muted-foreground'>
                {slipData.siswa_asal.rfid_uid || '-'}
              </span>
              <span className='text-muted-foreground'>Status Kartu:</span>
              <span className='text-right'>
                <Badge variant='outline' className='border-0 bg-destructive/15 text-destructive text-[10px] py-0 px-1.5 gap-1 font-medium'>
                  <Lock className='h-2.5 w-2.5' /> DIBLOKIR PERMANEN
                </Badge>
              </span>
            </div>
          </div>

          {/* Detail Transfer Saudara ATAU Refund Ortu */}
          {isTransfer && slipData.siswa_tujuan ? (
            <div className='space-y-1.5 pt-1'>
              <p className='text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1'>
                <ArrowRight className='h-3.5 w-3.5 text-primary' />
                Siswa Penerima (Saudara Kandung Aktif)
              </p>
              <div className='grid grid-cols-2 gap-x-2 gap-y-1 bg-card p-2.5 rounded-lg border-0 shadow-none'>
                <span className='text-muted-foreground'>Nama Saudara:</span>
                <span className='font-semibold text-right text-primary truncate'>
                  {slipData.siswa_tujuan.nama}
                </span>
                <span className='text-muted-foreground'>NIS / Kelas:</span>
                <span className='text-right font-mono'>
                  {slipData.siswa_tujuan.nis} ({slipData.siswa_tujuan.kelas})
                </span>
                <span className='text-muted-foreground'>Saldo Awal:</span>
                <span className='text-right font-mono'>
                  {formatRupiah(slipData.siswa_tujuan.saldo_awal)}
                </span>
                <span className='text-muted-foreground font-semibold text-foreground'>
                  Saldo Akhir (+Transfer):
                </span>
                <span className='text-right font-mono font-bold text-emerald-600 dark:text-emerald-400'>
                  {formatRupiah(slipData.siswa_tujuan.saldo_akhir)}
                </span>
              </div>
            </div>
          ) : (
            <div className='space-y-1.5 pt-1'>
              <p className='text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1'>
                <CreditCard className='h-3.5 w-3.5 text-muted-foreground' />
                Detail Penerima Dana (Orang Tua / Wali)
              </p>
              <div className='grid grid-cols-2 gap-x-2 gap-y-1 bg-card p-2.5 rounded-lg border-0 shadow-none'>
                <span className='text-muted-foreground'>Nama Penerima:</span>
                <span className='font-semibold text-right'>{slipData.nama_penerima || '-'}</span>
                <span className='text-muted-foreground'>Kontak / HP:</span>
                <span className='text-right font-mono'>{slipData.kontak_penerima || '-'}</span>
                {slipData.metode === 'TRANSFER_BANK' && (
                  <>
                    <span className='text-muted-foreground'>Bank Tujuan:</span>
                    <span className='text-right font-semibold'>{slipData.bank}</span>
                    <span className='text-muted-foreground'>No. Rekening:</span>
                    <span className='text-right font-mono'>{slipData.nomor_rekening}</span>
                    <span className='text-muted-foreground'>Atas Nama:</span>
                    <span className='text-right truncate'>{slipData.nama_rekening}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Nominal Ringkasan */}
          <div className='rounded-lg bg-emerald-500/15 p-3 border-0 flex items-center justify-between'>
            <span className='text-xs font-semibold text-emerald-900 dark:text-emerald-200'>
              {isTransfer ? 'TOTAL SALDO DIPINDAHKAN' : 'TOTAL SALDO DI-REFUND'}
            </span>
            <span className='text-base font-bold font-mono text-emerald-700 dark:text-emerald-400'>
              {formatRupiah(slipData.nominal)}
            </span>
          </div>

          {/* Footer Struk */}
          <div className='pt-2 border-0 text-center space-y-1 text-[10px] text-muted-foreground'>
            <p>Waktu Transaksi: {new Date(slipData.waktu).toLocaleString('id-ID')}</p>
            <p>Petugas TU / Kasir: {slipData.petugas_nama}</p>
            <p className='italic font-medium text-foreground'>
              "Status saldo siswa asal telah menjadi Rp 0 dan kartu fisik telah diblokir permanen."
            </p>
          </div>
        </div>

        <DialogFooter className='flex-col sm:flex-row gap-2 pt-2'>
          <Button variant='secondary' onClick={handlePrint} className='gap-2 w-full sm:w-auto border-0 bg-muted/80 shadow-none'>
            <Printer className='h-4 w-4' />
            Cetak Struk / Bukti
          </Button>
          <Button onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
