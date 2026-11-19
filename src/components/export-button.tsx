import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  icon: LucideIcon
  iconBgClass: string
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
  className,
  buttonVariant = 'outline',
  'data-testid': dataTestId = 'btn-export',
}: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoverTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleMouseEnter = () => {
    if (disabled || isLoading) return
    clearHoverTimer()
    setOpen(true)
  }

  const handleMouseLeave = () => {
    clearHoverTimer()
    timerRef.current = setTimeout(() => {
      setOpen(false)
    }, 150)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      clearHoverTimer()
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const options: ExportFormatOption[] = []

  if (onExportExcel) {
    options.push({
      key: 'excel',
      testId: 'btn-export-excel-option',
      title: 'Spreadsheet Excel',
      extension: '.xlsx',
      icon: FileSpreadsheet,
      iconBgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      badgeClassName: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      onSelect: onExportExcel,
    })
  }

  if (onExportCsv) {
    options.push({
      key: 'csv',
      testId: 'btn-export-csv-option',
      title: 'Berkas CSV',
      extension: '.csv',
      icon: FileSpreadsheet,
      iconBgClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
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
      icon: FileText,
      iconBgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      badgeClassName: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      onSelect: onExportPdf,
    })
  }

  const handleSelectFormat = (onSelect: () => void | Promise<void>) => {
    clearHoverTimer()
    setOpen(false)
    void onSelect()
  }

  const isDisabled = disabled || isLoading || options.length === 0

  return (
    <div
      ref={containerRef}
      className='relative inline-block'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        type='button'
        variant={buttonVariant}
        size='sm'
        disabled={isDisabled}
        aria-haspopup='menu'
        aria-expanded={open}
        className={cn('gap-1.5', className)}
        data-testid={dataTestId}
        onClick={() => {
          if (!isDisabled) {
            setOpen(true)
          }
        }}
      >
        <Download className='h-4 w-4' />
        <span>{label}</span>
      </Button>

      {open && (
        <div
          role='menu'
          aria-orientation='vertical'
          className='absolute right-0 top-full mt-1.5 z-50 w-56 rounded-md border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95'
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {dialogTitle && (
            <>
              <h4
                role='heading'
                aria-level={4}
                className='text-xs font-semibold text-muted-foreground px-2.5 py-1.5'
              >
                {dialogTitle}
              </h4>
              <div className='-mx-1.5 my-1 h-px bg-border/60' />
            </>
          )}

          <div className='flex flex-col gap-0.5'>
            {options.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.key}
                  type='button'
                  role='menuitem'
                  disabled={isLoading}
                  onClick={() => handleSelectFormat(option.onSelect)}
                  data-testid={option.testId}
                  className='flex w-full cursor-pointer items-center justify-between gap-3 px-2.5 py-2 rounded-md text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none'
                >
                  <div className='flex items-center gap-2.5 min-w-0'>
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                        option.iconBgClass
                      )}
                    >
                      <Icon className='h-4 w-4' />
                    </div>
                    <span className='text-sm font-medium text-foreground truncate'>
                      {option.title}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold shrink-0',
                      option.badgeClassName
                    )}
                  >
                    {option.extension}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
