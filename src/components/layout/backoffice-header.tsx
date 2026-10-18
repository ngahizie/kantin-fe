import { cn } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'

export interface BackofficeHeaderProps {
  className?: string
  fixed?: boolean
}

export function BackofficeHeader({ className, fixed = true }: BackofficeHeaderProps) {
  return (
    <Header fixed={fixed} className={cn('bg-background/95 backdrop-blur border-b border-sidebar-border/50', className)}>
      {/* Sisi Kiri: Teks Rata Kiri */}
      <div className='flex items-center gap-2 overflow-hidden me-auto'>
        <h1 className='text-base sm:text-lg font-bold tracking-tight text-foreground'>
          Dashboard Ringkasan
        </h1>
      </div>

      {/* Bagian Kanan: Search, Theme, Profil */}
      <div className='flex items-center gap-2 sm:gap-3 ms-auto'>
        {/* User Profile Dropdown */}
        <ProfileDropdown />
      </div>
    </Header>
  )
}

export default BackofficeHeader
