import { ExportButton, type ExportButtonProps } from '@/components/export-button'

export interface LaporanExportButtonProps
  extends Omit<ExportButtonProps, 'onExportCsv'> {
  onExportExcel: () => void | Promise<void>
  onExportPdf: () => void | Promise<void>
}

export function LaporanExportButton({
  dialogDescription = 'Pilih format berkas laporan yang ingin Anda unduh:',
  buttonVariant = 'default',
  'data-testid': dataTestId = 'btn-laporan-export',
  ...props
}: LaporanExportButtonProps) {
  return (
    <ExportButton
      dialogDescription={dialogDescription}
      buttonVariant={buttonVariant}
      data-testid={dataTestId}
      {...props}
    />
  )
}
