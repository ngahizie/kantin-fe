import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }

    // Add scroll listener to the body
    document.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'z-50 h-[65px] bg-background has-border border-b border-border',
        fixed && 'header-fixed peer/header sticky top-0 w-[inherit]',
        offset > 10 && fixed ? 'shadow-none' : '',
        className
      )}
      {...props}
    >
      <div className='relative flex h-full items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6'>
        <SidebarTrigger variant='ghost' className='size-8 shrink-0 max-md:scale-110' />
        <Separator orientation='vertical' className='h-6 shrink-0' />
        {children}
      </div>
    </header>
  )
}
