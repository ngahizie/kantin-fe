import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface ExportButtonProps {
  onExportExcel?: () => void | Promise<void>
  onExportCsv?: () => void | Promise<void>
  onExportPdf?: () => void | Promise<void>
  disabled?: boolean
  isLoading?: boolean
  label?: string
  dialogTitle?: string
  dialogDescription?: string
  className?: string
  buttonVariant?: 'default' | 'secondary' | 'outline' | 'ghost'
  'data-testid'?: string
}

interface ExportFormatOption {
  key: 'excel' | 'csv' | 'pdf'
  testId: string
  title: string
  extension: string
  description: string
  icon: LucideIcon
  cardClassName: string
  iconClassName: string
  badgeClassName: string
  onSelect: () => void | Promise<void>
}

export function ExportButton({
  onExportExcel,
  onExportCsv,
  onExportPdf,
  disabled = false,
  isLoading = false,
  label = 'Ekspor',
  dialogTitle = 'Pilih Format Ekspor',
  dialogDescription = 'Pilih format berkas yang ingin Anda unduh:',
  className,
  buttonVariant = 'outline',
  'data-testid': dataTestId = 'btn-export',
}: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  const options: ExportFormatOption[] = []

  if (onExportExcel) {
    options.push({
      key: 'excel',
      testId: 'btn-export-excel-option',
      title: 'Spreadsheet Excel',
      extension: '.xlsx',
      description: 'Format tabel untuk analisis angka & olah data lengkap',
      icon: FileSpreadsheet,
      cardClassName: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
      iconClassName:
        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      badgeClassName:
        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      onSelect: onExportExcel,
    })
  }

  if (onExportCsv) {
    options.push({
      key: 'csv',
      testId: 'btn-export-csv-option',
      title: 'Berkas CSV',
      extension: '.csv',
      description: 'Format tabel teks universal yang ringan & mudah dibuka',
      icon: FileSpreadsheet,
      cardClassName: 'hover:border-teal-500/50 hover:bg-teal-500/5',
      iconClassName: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
      badgeClassName: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
      onSelect: onExportCsv,
    })
  }

  if (onExportPdf) {
    options.push({
      key: 'pdf',
      testId: 'btn-export-pdf-option',
      title: 'Dokumen PDF',
      extension: '.pdf',
      description: 'Format dokumen resmi rapi siap cetak & arsip digital',
      icon: FileText,
      cardClassName: 'hover:border-rose-500/50 hover:bg-rose-500/5',
      iconClassName: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      badgeClassName: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      onSelect: onExportPdf,
    })
  }

  const handleSelectFormat = (onSelect: () => void | Promise<void>) => {
    setOpen(false)
    void onSelect()
  }

  const isDisabled = disabled || isLoading || options.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type='button'
          variant={buttonVariant}
          size='sm'
          disabled={isDisabled}
          className={cn('gap-1.5', className)}
          data-testid={dataTestId}
        >
          <Download className='h-4 w-4' />
          <span>{label}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-3 py-2'>
          {options.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.key}
                type='button'
                disabled={isLoading}
                onClick={() => handleSelectFormat(option.onSelect)}
                data-testid={option.testId}
                className={cn(
                  'group flex w-full items-start gap-3.5 rounded-xl border border-border bg-card p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50',
                  option.cardClassName
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
                    option.iconClassName
                  )}
                >
                  <Icon className='h-5 w-5' />
                </div>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-sm font-medium text-foreground'>
                      {option.title}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-mono text-[11px] font-medium',
                        option.badgeClassName
                      )}
                    >
                      {option.extension}
                    </span>
                  </div>
                  <p className='text-xs leading-relaxed text-muted-foreground'>
                    {option.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type='button' variant='outline'>
              Batal
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
