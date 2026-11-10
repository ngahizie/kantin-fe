import { useEffect } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ThemeSwitchProps = {
  triggerClassName?: string
  contentClassName?: string
  itemClassName?: string
}

export function ThemeSwitch({
  triggerClassName,
  contentClassName,
  itemClassName,
}: ThemeSwitchProps = {}) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  /* Update theme-color meta tag when theme is updated */
  useEffect(() => {
    const themeColor = resolvedTheme === 'dark' ? '#050510' : '#FDFCF8'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [resolvedTheme])

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className={cn('scale-95 rounded-full', triggerClassName)}
        >
          <Sun className='size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
          <Moon className='absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
          <span className='sr-only'>Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className={cn('border-0', contentClassName)}>
        <DropdownMenuItem onClick={() => setTheme('light')} className={itemClassName}>
          Light{' '}
          <Check
            size={14}
            className={cn('ms-auto', theme !== 'light' && 'hidden')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className={itemClassName}>
          Dark
          <Check
            size={14}
            className={cn('ms-auto', theme !== 'dark' && 'hidden')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className={itemClassName}>
          System
          <Check
            size={14}
            className={cn('ms-auto', theme !== 'system' && 'hidden')}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
