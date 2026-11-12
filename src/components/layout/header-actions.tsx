import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function HeaderActions() {
  return (
    <div className='ms-auto flex shrink-0 items-center gap-3'>
      <ThemeSwitch />
      <ProfileDropdown />
    </div>
  )
}

type HeaderBreadcrumbProps = {
  section: string
  title: string
}

export function HeaderBreadcrumb({ section, title }: HeaderBreadcrumbProps) {
  return (
    <div className='flex min-w-0 flex-1 items-center gap-2 overflow-hidden'>
      <span className='shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
        {section}
      </span>
      <span className='shrink-0 text-xs text-muted-foreground'>/</span>
      <span className='min-w-0 truncate text-xs font-medium text-foreground'>
        {title}
      </span>
    </div>
  )
}
