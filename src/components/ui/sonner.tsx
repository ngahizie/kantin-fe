import { useRouterState } from '@tanstack/react-router'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react'
import { useTheme } from '@/context/theme-provider'

export function Toaster({ ...props }: ToasterProps) {
  const { theme = 'light', resolvedTheme } = useTheme()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isKasirPage = pathname.startsWith('/kasir')
  const toasterStyle: React.CSSProperties & Record<`--${string}`, string> =
    isKasirPage
      ? {
          fontFamily: 'var(--font-sans)',
          '--normal-bg': resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff',
          '--normal-text': resolvedTheme === 'dark' ? '#ffffff' : '#1e293b',
          '--normal-border': resolvedTheme === 'dark' ? '#1e293b' : '#e2e8f0',
          '--border-radius': '14px',
        }
      : {
          fontFamily: 'var(--font-sans)',
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'transparent',
          '--success-border': 'transparent',
          '--error-border': 'transparent',
          '--warning-border': 'transparent',
          '--info-border': 'transparent',
          '--border-radius': '12px',
        }

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className={
        isKasirPage
          ? 'toaster group [&_div[data-content]]:w-full [&_[data-sonner-toast]]:has-border [&_[data-sonner-toast]]:!border [&_[data-sonner-toast]]:!border-slate-200 dark:[&_[data-sonner-toast]]:!border-slate-800 [&_[data-sonner-toast]]:!bg-white dark:[&_[data-sonner-toast]]:!bg-[#0a0a0a] [&_[data-sonner-toast]]:![box-shadow:none] [&_[data-sonner-toast]]:!bg-none [&_[data-sonner-toast]:focus-visible]:![box-shadow:none] [&_[data-sonner-toast]_[data-button]]:![box-shadow:none] [&_[data-sonner-toast]_[data-close-button]]:![box-shadow:none] [&_[data-sonner-toast]]:rounded-xl [&_[data-sonner-toast]]:p-4 [&_[data-sonner-toast]]:items-start [&_[data-sonner-toast]]:gap-3 [&_[data-icon]]:self-start [&_[data-icon]]:mt-0.5 [&_[data-icon]]:h-5 [&_[data-icon]]:w-5 [&_[data-title]]:font-semibold [&_[data-title]]:text-slate-800 dark:[&_[data-title]]:text-white [&_[data-title]]:text-sm [&_[data-title]]:leading-snug [&_[data-description]]:text-xs [&_[data-description]]:text-slate-500 dark:[&_[data-description]]:text-slate-400 [&_[data-description]]:leading-relaxed [&_[data-description]]:mt-0.5'
          : 'toaster group [&_div[data-content]]:w-full [&_[data-sonner-toast]]:border-0 [&_[data-sonner-toast]]:shadow-xl [&_[data-sonner-toast]]:rounded-xl [&_[data-sonner-toast]]:p-4 [&_[data-sonner-toast]]:items-start [&_[data-sonner-toast]]:gap-3 [&_[data-icon]]:self-start [&_[data-icon]]:mt-0.5 [&_[data-icon]]:h-5 [&_[data-icon]]:w-5 [&_[data-title]]:font-semibold [&_[data-title]]:text-foreground [&_[data-title]]:text-sm [&_[data-title]]:leading-snug [&_[data-description]]:text-xs [&_[data-description]]:text-muted-foreground [&_[data-description]]:leading-relaxed [&_[data-description]]:mt-0.5'
      }
      icons={{
        success: <CheckCircle2 className='size-5 text-emerald-500 shrink-0' />,
        error: <AlertCircle className='size-5 text-destructive shrink-0' />,
        warning: <AlertTriangle className='size-5 text-amber-500 shrink-0' />,
        info: <Info className='size-5 text-blue-500 shrink-0' />,
        loading: <Loader2 className='size-5 animate-spin text-primary shrink-0' />,
      }}
      style={toasterStyle}
      toastOptions={{
        className: isKasirPage
          ? 'has-border !border !border-slate-200 dark:!border-slate-800 ![box-shadow:none] rounded-xl p-4'
          : 'border-0 shadow-xl rounded-xl p-4',
        classNames: {
          toast: isKasirPage
            ? 'group toast has-border !border !border-slate-200 dark:!border-slate-800 !bg-white dark:!bg-[#0a0a0a] !text-slate-800 dark:!text-white ![box-shadow:none] !bg-none rounded-xl p-4 gap-3 items-start'
            : 'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-0 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:gap-3 group-[.toaster]:items-start',
          title: isKasirPage
            ? 'group-[.toast]:font-semibold group-[.toast]:text-slate-800 dark:group-[.toast]:text-white group-[.toast]:text-sm group-[.toast]:leading-snug'
            : 'group-[.toast]:font-semibold group-[.toast]:text-foreground group-[.toast]:text-sm group-[.toast]:leading-snug',
          description: isKasirPage
            ? 'group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 group-[.toast]:text-xs group-[.toast]:leading-relaxed group-[.toast]:mt-0.5'
            : 'group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:leading-relaxed group-[.toast]:mt-0.5',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:shadow-none',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:shadow-none',
          icon: 'group-[.toast]:self-start group-[.toast]:mt-0.5',
          content: 'group-[.toast]:w-full group-[.toast]:gap-0.5',
        },
      }}
      {...props}
    />
  )
}
