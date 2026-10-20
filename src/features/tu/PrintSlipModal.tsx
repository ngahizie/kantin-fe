import {
  Printer,
  CheckCircle2,
  Building2,
  Calendar,
  UserCheck,
  CreditCard,
  Receipt,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/formatters'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export interface TopupSlipData {
  ref_no: string
  waktu: string
  petugas_nama: string
  nama_penyetor: string
  nominal: number
  saldo_awal: number
  saldo_baru: number
  siswa: {
    siswa_id: number
    nis: string
    nama: string
    kelas: string
    foto_url?: string
  }
}

interface PrintSlipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slipData: TopupSlipData | null
}

export function PrintSlipModal({
  open,
  onOpenChange,
  slipData,
}: PrintSlipModalProps) {
  if (!slipData) return null

  const formattedDate = new Date(slipData.waktu).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md overflow-hidden border-border p-0 sm:rounded-2xl'>
        {/* CSS terisolasi untuk cetak thermal print 80mm & PDF */}
        <style>{`
          @media print {
            @page {
              margin: 0;
              size: 80mm auto;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body * {
              visibility: hidden !important;
            }
            .printable-slip, .printable-slip * {
              visibility: visible !important;
            }
            .printable-slip {
              position: fixed !important;
              left: 50% !important;
              top: 0 !important;
              transform: translateX(-50%) !important;
              width: 76mm !important;
              padding: 8mm 2mm !important;
              font-family: 'Courier New', Courier, monospace !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .printable-slip .print-dark-override {
              background: transparent !important;
              color: #000000 !important;
              border-color: #000000 !important;
            }
            .printable-slip .print-border-dashed {
              border-bottom: 1px dashed #000000 !important;
            }
            .printable-slip .print-border-double {
              border-bottom: 3px double #000000 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Modal Header */}
        <DialogHeader className='no-print bg-emerald-600 p-5 text-white dark:bg-emerald-700'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='rounded-full bg-white/20 p-2 text-white'>
                <CheckCircle2 className='h-6 w-6' />
              </div>
              <div>
                <DialogTitle className='flex items-center gap-1.5 text-lg font-bold text-white'>
                  Top-up Tunai Berhasil!
                </DialogTitle>
                <p className='mt-0.5 text-xs text-emerald-100'>
                  Saldo siswa telah ditambahkan ke sistem
                </p>
              </div>
            </div>
            <Receipt className='h-8 w-8 text-emerald-200/50' />
          </div>
        </DialogHeader>

        {/* Outer Receipt Container (Screen & Print Wrapper) */}
        <div className='no-print-bg flex justify-center bg-muted/40 p-5 dark:bg-background'>
          {/* Authentic Printable Thermal Receipt Slip */}
          <div className='printable-slip w-full space-y-4 rounded-xl border border-slate-300 bg-white p-5 font-mono text-xs text-slate-900'>
            {/* Header Nota */}
            <div className='print-border-dashed space-y-1 border-b border-dashed border-slate-300 pb-3 text-center'>
              <div className='flex items-center justify-center gap-1 text-sm font-bold tracking-tight text-slate-900 uppercase'>
                <Building2 className='no-print h-4 w-4 text-emerald-600' />
                SKOOLIA CANTEEN
              </div>
              <p className='text-[10px] font-semibold tracking-wider text-slate-600 uppercase'>
                SLIP BUKTI SETOR TUNAI TU
              </p>

              {/* Nomor Referensi Unik */}
              <div className='pt-1.5'>
                <span className='block font-sans text-[9px] text-slate-500 uppercase'>
                  Nomor Referensi Unik:
                </span>
                <span className='print-dark-override mt-0.5 inline-block rounded border border-slate-300 bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-slate-900'>
                  {slipData.ref_no}
                </span>
              </div>
            </div>

            {/* Informasi Waktu & Petugas */}
            <div className='space-y-1.5 pt-1 text-[11px]'>
              <div className='print-dark-override flex items-center justify-between text-slate-700'>
                <span className='flex items-center gap-1 text-slate-500'>
                  <Calendar className='no-print h-3 w-3' /> Waktu Transaksi:
                </span>
                <span className='font-semibold text-slate-900'>
                  {formattedDate}
                </span>
              </div>
              <div className='print-dark-override flex items-center justify-between text-slate-700'>
                <span className='flex items-center gap-1 text-slate-500'>
                  <UserCheck className='no-print h-3 w-3' /> Petugas Kasir TU:
                </span>
                <span className='max-w-[150px] truncate font-medium text-slate-900'>
                  {slipData.petugas_nama}
                </span>
              </div>
              <div className='print-dark-override flex items-center justify-between text-slate-700'>
                <span className='text-slate-500'>Nama Penyetor:</span>
                <span className='font-medium text-slate-900'>
                  {slipData.nama_penyetor}
                </span>
              </div>
            </div>

            <div className='print-border-dashed my-2 border-b border-dashed border-slate-300' />

            {/* Detail Siswa */}
            <div className='print-dark-override space-y-1 rounded border border-slate-200 bg-slate-50 p-2.5'>
              <div className='font-sans text-[9px] font-semibold text-slate-500 uppercase'>
                Identitas Pemilik Saldo:
              </div>
              <div className='flex items-center justify-between text-xs font-bold text-slate-900'>
                <span>Siswa:</span>
                <span className='text-right'>{slipData.siswa.nama}</span>
              </div>
              <div className='print-dark-override flex items-center justify-between text-[11px] text-slate-600'>
                <span>NIS / Kelas:</span>
                <span>
                  {slipData.siswa.nis} • {slipData.siswa.kelas}
                </span>
              </div>
            </div>

            <div className='print-border-dashed my-2 border-b border-dashed border-slate-300' />

            {/* Breakdown Nominal & Saldo */}
            <div className='space-y-2 pt-1'>
              <div className='print-dark-override flex items-center justify-between text-[11px] text-slate-600'>
                <span>Saldo Awal Siswa:</span>
                <span className='font-medium text-slate-800'>
                  {formatRupiah(slipData.saldo_awal)}
                </span>
              </div>
              <div className='print-dark-override flex items-center justify-between text-xs font-bold text-emerald-700'>
                <span>Nominal Setoran Tunai (+):</span>
                <span className='text-sm'>
                  {formatRupiah(slipData.nominal)}
                </span>
              </div>

              <div className='print-border-double flex items-center justify-between border-t-2 border-slate-900 pt-2 text-sm font-bold text-slate-900'>
                <span className='flex items-center gap-1'>
                  <CreditCard className='no-print h-3.5 w-3.5 text-emerald-600' />{' '}
                  SALDO BARU:
                </span>
                <span className='print-dark-override font-mono text-base text-emerald-700'>
                  {formatRupiah(slipData.saldo_baru)}
                </span>
              </div>
            </div>

            {/* Footer Slip & Barcode Simulation */}
            <div className='print-border-dashed space-y-2 border-t border-dashed border-slate-300 pt-3 text-center'>
              <div className='print-dark-override font-sans text-[10px] leading-tight text-slate-600'>
                Simpan slip ini sebagai bukti pembayaran tunai sah di layanan
                Kasir TU Sekolah.
              </div>
              <div className='pt-1 font-mono text-[9px] font-bold tracking-widest text-slate-400 uppercase'>
                *** SKOOLIA CASHLESS CANTEEN ***
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden when printing) */}
        <DialogFooter className='no-print flex-row items-center justify-between gap-2 border-t border-border bg-card p-4'>
          <div className='flex hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex'>
            <FileText className='h-3.5 w-3.5 text-muted-foreground' />
            Format Struk Thermal 80mm / PDF
          </div>
          <div className='flex w-full items-center justify-end gap-2 sm:w-auto'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='h-9 text-xs'
            >
              Selesai
            </Button>
            <Button
              type='button'
              onClick={handlePrint}
              className='h-9 gap-2 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700'
            >
              <Printer className='h-4 w-4' />
              Cetak Slip Nota
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
