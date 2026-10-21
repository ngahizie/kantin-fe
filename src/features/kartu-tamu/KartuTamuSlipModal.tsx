import {
  Printer,
  CheckCircle2,
  Building2,
  Calendar,
  UserCheck,
  CreditCard,
  Receipt,
  FileText,
  UserPlus,
  ArrowLeftRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/formatters'

export type KartuTamuSlipType = 'REGISTER' | 'TOPUP' | 'REFUND'

export interface KartuTamuSlipData {
  type: KartuTamuSlipType
  ref_no: string
  waktu: string
  petugas_nama: string
  nomor_kartu: string
  uid: string
  label_pemegang: string
  // TOPUP only
  nominal?: number
  saldo_awal?: number
  saldo_baru?: number
  nama_penyetor?: string
  // REFUND only
  saldo_direfund?: number
  nama_penerima?: string
}

interface KartuTamuSlipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slipData: KartuTamuSlipData | null
}

const SLIP_CONFIG = {
  REGISTER: {
    title: 'Kartu Tamu Berhasil Didaftarkan!',
    subtitle: 'Kartu RFID baru telah terdaftar di sistem',
    headerColor: 'bg-blue-600 dark:bg-blue-700',
    icon: UserPlus,
    label: 'SLIP REGISTRASI KARTU TAMU',
  },
  TOPUP: {
    title: 'Top-up Kartu Tamu Berhasil!',
    subtitle: 'Saldo kartu tamu telah ditambahkan ke sistem',
    headerColor: 'bg-emerald-600 dark:bg-emerald-700',
    icon: CreditCard,
    label: 'SLIP TOP-UP SALDO KARTU TAMU',
  },
  REFUND: {
    title: 'Pengembalian Kartu & Refund Berhasil!',
    subtitle: 'Saldo telah di-refund tunai, kartu siap dipakai ulang',
    headerColor: 'bg-amber-600 dark:bg-amber-700',
    icon: ArrowLeftRight,
    label: 'SLIP REFUND TUNAI KARTU TAMU',
  },
}

export function KartuTamuSlipModal({
  open,
  onOpenChange,
  slipData,
}: KartuTamuSlipModalProps) {
  if (!slipData) return null

  const config = SLIP_CONFIG[slipData.type]
  const IconComp = config.icon

  const formattedDate = new Date(slipData.waktu).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const handlePrint = () => window.print()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md p-0 overflow-hidden sm:rounded-2xl border-0 shadow-2xl'>
        <style>{`
          @media print {
            @page { margin: 0; size: 80mm auto; }
            html, body { background: #ffffff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; }
            body * { visibility: hidden !important; }
            .printable-slip, .printable-slip * { visibility: visible !important; }
            .printable-slip {
              position: fixed !important; left: 50% !important; top: 0 !important;
              transform: translateX(-50%) !important; width: 76mm !important;
              padding: 8mm 2mm !important; font-family: 'Courier New', Courier, monospace !important;
              background: #fff !important; color: #000 !important; box-shadow: none !important; border: none !important;
            }
            .printable-slip .print-dark-override { background: transparent !important; color: #000 !important; border-color: #000 !important; }
            .printable-slip .print-border-dashed { border-bottom: 1px dashed #000 !important; }
            .printable-slip .print-border-double { border-bottom: 3px double #000 !important; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* Modal Header */}
        <DialogHeader className={`p-5 ${config.headerColor} text-white no-print`}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-white/20 text-white rounded-full'>
                <CheckCircle2 className='h-6 w-6' />
              </div>
              <div>
                <DialogTitle className='text-lg font-bold text-white'>
                  {config.title}
                </DialogTitle>
                <p className='text-xs text-white/80 mt-0.5'>{config.subtitle}</p>
              </div>
            </div>
            <Receipt className='h-8 w-8 text-white/40' />
          </div>
        </DialogHeader>

        {/* Receipt Wrapper */}
        <div className='p-5 bg-muted/40 flex justify-center no-print-bg'>
          <div className='printable-slip w-full bg-white text-slate-900 border border-slate-300 rounded-xl p-5 space-y-4 font-mono text-xs'>

            {/* Header Nota */}
            <div className='text-center space-y-1 pb-3 print-border-dashed border-b border-dashed border-slate-300'>
              <div className='flex items-center justify-center gap-1 font-bold text-sm tracking-tight text-slate-900 uppercase'>
                <Building2 className='h-4 w-4 text-blue-600 no-print' />
                SKOOLIA CANTEEN
              </div>
              <p className='text-[10px] text-slate-600 uppercase font-semibold tracking-wider'>
                {config.label}
              </p>
              <div className='pt-1.5'>
                <span className='text-[9px] text-slate-500 uppercase block font-sans'>Nomor Referensi:</span>
                <span className='inline-block font-bold text-xs bg-slate-100 text-slate-900 px-2.5 py-1 rounded border border-slate-300 font-mono tracking-wide print-dark-override mt-0.5'>
                  {slipData.ref_no}
                </span>
              </div>
            </div>

            {/* Waktu & Petugas */}
            <div className='space-y-1.5 pt-1 text-[11px]'>
              <div className='flex justify-between items-center text-slate-700 print-dark-override'>
                <span className='flex items-center gap-1 text-slate-500'>
                  <Calendar className='h-3 w-3 no-print' /> Waktu:
                </span>
                <span className='font-semibold text-slate-900'>{formattedDate}</span>
              </div>
              <div className='flex justify-between items-center text-slate-700 print-dark-override'>
                <span className='flex items-center gap-1 text-slate-500'>
                  <UserCheck className='h-3 w-3 no-print' /> Petugas TU:
                </span>
                <span className='font-medium text-slate-900 truncate max-w-[160px]'>
                  {slipData.petugas_nama}
                </span>
              </div>
            </div>

            <div className='border-b border-dashed border-slate-300 my-2 print-border-dashed' />

            {/* Info Kartu */}
            <div className='p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1 print-dark-override'>
              <div className='text-[9px] text-slate-500 uppercase font-sans font-semibold flex items-center gap-1'>
                <IconComp className='h-3 w-3 no-print' /> Info Kartu Tamu:
              </div>
              <div className='flex justify-between items-center font-bold text-slate-900 text-xs'>
                <span>Nomor Kartu:</span>
                <span className='font-mono'>{slipData.nomor_kartu}</span>
              </div>
              <div className='flex justify-between items-center text-slate-600 text-[11px] print-dark-override'>
                <span>UID RFID:</span>
                <span className='font-mono'>{slipData.uid}</span>
              </div>
              {slipData.label_pemegang && (
                <div className='flex justify-between items-center text-slate-600 text-[11px] print-dark-override'>
                  <span>Pemegang:</span>
                  <span className='text-right max-w-[160px]'>{slipData.label_pemegang}</span>
                </div>
              )}
            </div>

            <div className='border-b border-dashed border-slate-300 my-2 print-border-dashed' />

            {/* Type-specific content */}
            {slipData.type === 'REGISTER' && (
              <div className='text-center py-2'>
                <p className='text-xs font-bold text-slate-700 uppercase tracking-wide'>Kartu Siap Digunakan</p>
                <p className='text-[10px] text-slate-500 mt-1'>Tempelkan stiker nomor kartu dan serahkan kepada pemegang.</p>
              </div>
            )}

            {slipData.type === 'TOPUP' && (
              <div className='space-y-2 pt-1'>
                {slipData.nama_penyetor && (
                  <div className='flex justify-between items-center text-slate-600 text-[11px] print-dark-override'>
                    <span>Nama Penyetor:</span>
                    <span className='font-medium'>{slipData.nama_penyetor}</span>
                  </div>
                )}
                <div className='flex justify-between items-center text-slate-600 text-[11px] print-dark-override'>
                  <span>Saldo Awal:</span>
                  <span className='font-medium'>{formatRupiah(slipData.saldo_awal ?? 0)}</span>
                </div>
                <div className='flex justify-between items-center font-bold text-emerald-700 text-xs print-dark-override'>
                  <span>Setoran (+):</span>
                  <span className='text-sm'>{formatRupiah(slipData.nominal ?? 0)}</span>
                </div>
                <div className='border-t-2 border-slate-900 pt-2 flex justify-between items-center font-bold text-sm text-slate-900 print-border-double'>
                  <span>SALDO BARU:</span>
                  <span className='text-base font-mono text-emerald-700 print-dark-override'>
                    {formatRupiah(slipData.saldo_baru ?? 0)}
                  </span>
                </div>
              </div>
            )}

            {slipData.type === 'REFUND' && (
              <div className='space-y-2 pt-1'>
                {slipData.nama_penerima && (
                  <div className='flex justify-between items-center text-slate-600 text-[11px] print-dark-override'>
                    <span>Nama Penerima:</span>
                    <span className='font-medium'>{slipData.nama_penerima}</span>
                  </div>
                )}
                <div className='border-t-2 border-slate-900 pt-2 flex justify-between items-center font-bold text-sm text-slate-900 print-border-double'>
                  <span>REFUND TUNAI:</span>
                  <span className='text-base font-mono text-amber-700 print-dark-override'>
                    {formatRupiah(slipData.saldo_direfund ?? 0)}
                  </span>
                </div>
                <p className='text-[10px] text-slate-500 text-center pt-1'>
                  Saldo kartu direset ke Rp 0. Kartu siap dipakai ulang.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className='pt-3 text-center space-y-1 border-t border-dashed border-slate-300 print-border-dashed'>
              <div className='text-[10px] text-slate-600 font-sans leading-tight print-dark-override'>
                Simpan slip ini sebagai bukti transaksi sah Kasir TU Sekolah.
              </div>
              <div className='font-mono text-[9px] text-slate-400 font-bold tracking-widest pt-1 uppercase'>
                *** SKOOLIA CASHLESS CANTEEN ***
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className='p-4 bg-background border-t border-border flex-row justify-between items-center gap-2 no-print'>
          <div className='text-[11px] text-muted-foreground flex items-center gap-1 hidden sm:flex'>
            <FileText className='h-3.5 w-3.5 text-muted-foreground' />
            Format Struk Thermal 80mm / PDF
          </div>
          <div className='flex items-center gap-2 w-full sm:w-auto justify-end'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => onOpenChange(false)}
              className='text-xs h-9 border-0'
            >
              Selesai
            </Button>
            <Button
              type='button'
              onClick={handlePrint}
              className='text-xs h-9 gap-2'
            >
              <Printer className='h-4 w-4' />
              Cetak Slip
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
