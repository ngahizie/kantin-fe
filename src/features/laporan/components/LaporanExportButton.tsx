import * as React from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface LaporanExportButtonProps {
  onExportExcel: () => void | Promise<void>
  onExportPdf: () => void | Promise<void>
  disabled?: boolean
  isLoading?: boolean
  label?: string
  dialogTitle?: string
  dialogDescription?: string
  className?: string
  buttonVariant?: 'default' | 'secondary' | 'outline' | 'ghost'
  'data-testid'?: string
}

export function LaporanExportButton({
  onExportExcel,
  onExportPdf,
  disabled = false,
  isLoading = false,
  label = 'Ekspor',
  dialogTitle = 'Pilih Format Ekspor',
  dialogDescription = 'Pilih format berkas laporan yang ingin Anda unduh:',
  className,
  buttonVariant = 'default',
  'data-testid': testId = 'btn-laporan-export',
}: LaporanExportButtonProps) {
  const [open, setOpen] = React.useState(false)

  const handleExport = (exportFn: () => void | Promise<void>) => {
    setOpen(false)
    void exportFn()
  }

  return (
    <>
      <Button
        type='button'
        variant={buttonVariant}
        size='sm'
        disabled={disabled || isLoading}
        onClick={() => setOpen(true)}
        className={cn('gap-2', className)}
        data-testid={testId}
      >
        <Download className='h-4 w-4' />
        <span>{label}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-md border-0 bg-background p-6 shadow-2xl'>
          <DialogHeader className='gap-1.5 pb-2'>
            <div className='flex items-center gap-2'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Download className='h-5 w-5' />
              </div>
              <DialogTitle className='text-lg font-bold tracking-tight'>
                {dialogTitle}
              </DialogTitle>
            </div>
            <DialogDescription className='text-sm text-muted-foreground'>
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-3 py-2'>
            {/* Opsi 1: Spreadsheet Excel */}
            <button
              type='button'
              onClick={() => handleExport(onExportExcel)}
              data-testid='btn-export-excel-option'
              className='flex w-full items-center justify-between rounded-xl border border-border/80 bg-card p-3.5 text-left transition-all hover:border-emerald-500/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group cursor-pointer'
            >
              <div className='flex items-center gap-3.5'>
                <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white dark:text-emerald-400'>
                  <FileSpreadsheet className='h-5 w-5' />
                </div>
                <div className='space-y-0.5'>
                  <div className='flex items-center gap-2'>
                    <span className='font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300'>
                      Spreadsheet Excel
                    </span>
                    <span className='rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'>
                      .xlsx
                    </span>
                  </div>
                  <p className='text-xs text-muted-foreground line-clamp-1'>
                    Format tabel untuk analisis angka & olah data lengkap
                  </p>
                </div>
              </div>
              <Download className='h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 ml-2' />
            </button>

            {/* Opsi 2: Dokumen PDF */}
            <button
              type='button'
              onClick={() => handleExport(onExportPdf)}
              data-testid='btn-export-pdf-option'
              className='flex w-full items-center justify-between rounded-xl border border-border/80 bg-card p-3.5 text-left transition-all hover:border-rose-500/60 hover:bg-rose-50/60 dark:hover:bg-rose-950/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 group cursor-pointer'
            >
              <div className='flex items-center gap-3.5'>
                <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 transition-colors group-hover:bg-rose-500 group-hover:text-white dark:text-rose-400'>
                  <FileText className='h-5 w-5' />
                </div>
                <div className='space-y-0.5'>
                  <div className='flex items-center gap-2'>
                    <span className='font-semibold text-foreground group-hover:text-rose-700 dark:group-hover:text-rose-300'>
                      Dokumen PDF
                    </span>
                    <span className='rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'>
                      .pdf
                    </span>
                  </div>
                  <p className='text-xs text-muted-foreground line-clamp-1'>
                    Format dokumen resmi rapi siap cetak & arsip digital
                  </p>
                </div>
              </div>
              <Download className='h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-rose-600 dark:group-hover:text-rose-400 shrink-0 ml-2' />
            </button>
          </div>

          <DialogFooter className='pt-2 sm:justify-end'>
            <DialogClose asChild>
              <Button type='button' variant='outline' size='sm' className='h-9'>
                Batal
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
