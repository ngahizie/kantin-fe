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
  const { theme = 'light' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group [&_div[data-content]]:w-full [&_[data-sonner-toast]]:border-0 [&_[data-sonner-toast]]:shadow-xl [&_[data-sonner-toast]]:rounded-xl [&_[data-sonner-toast]]:p-4 [&_[data-sonner-toast]]:items-start [&_[data-sonner-toast]]:gap-3 [&_[data-icon]]:self-start [&_[data-icon]]:mt-0.5 [&_[data-icon]]:h-5 [&_[data-icon]]:w-5 [&_[data-title]]:font-semibold [&_[data-title]]:text-foreground [&_[data-title]]:text-sm [&_[data-title]]:leading-snug [&_[data-description]]:text-xs [&_[data-description]]:text-muted-foreground [&_[data-description]]:leading-relaxed [&_[data-description]]:mt-0.5'
      icons={{
        success: <CheckCircle2 className='size-5 text-emerald-500 shrink-0' />,
        error: <AlertCircle className='size-5 text-destructive shrink-0' />,
        warning: <AlertTriangle className='size-5 text-amber-500 shrink-0' />,
        info: <Info className='size-5 text-blue-500 shrink-0' />,
        loading: <Loader2 className='size-5 animate-spin text-primary shrink-0' />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'transparent',
          '--success-border': 'transparent',
          '--error-border': 'transparent',
          '--warning-border': 'transparent',
          '--info-border': 'transparent',
          '--border-radius': '12px',
        } as React.CSSProperties
      }
      toastOptions={{
        className: 'border-0 shadow-xl rounded-xl p-4',
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-0 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:gap-3 group-[.toaster]:items-start',
          title:
            'group-[.toast]:font-semibold group-[.toast]:text-foreground group-[.toast]:text-sm group-[.toast]:leading-snug',
          description:
            'group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:leading-relaxed group-[.toast]:mt-0.5',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5',
          icon: 'group-[.toast]:self-start group-[.toast]:mt-0.5',
          content: 'group-[.toast]:w-full group-[.toast]:gap-0.5',
        },
      }}
      {...props}
    />
  )
}
