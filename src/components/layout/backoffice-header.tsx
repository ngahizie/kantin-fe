import { Header } from '@/components/layout/header'
import { HeaderActions } from '@/components/layout/header-actions'

export interface BackofficeHeaderProps {
  className?: string
  fixed?: boolean
}

export function BackofficeHeader({ className, fixed = true }: BackofficeHeaderProps) {
  return (
    <Header fixed={fixed} className={className}>
      <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
        <h1 className='truncate text-base sm:text-lg font-bold tracking-tight text-foreground'>
          Dashboard Ringkasan
        </h1>
      </div>

      <HeaderActions />
    </Header>
  )
}

export default BackofficeHeader
