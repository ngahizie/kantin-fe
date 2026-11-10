import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
  cancelBtnClassName?: string
  confirmBtnClassName?: string
}

export function SignOutDialog({
  open,
  onOpenChange,
  className,
  cancelBtnClassName,
  confirmBtnClassName,
}: SignOutDialogProps) {
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const handleSignOut = () => {
    auth.reset()
    // Arahkan langsung ke halaman sign-in tanpa menyimpan redirect path
    // untuk mencegah error 403 saat staf lain login dengan role berbeda
    navigate({
      to: '/sign-in',
      replace: true,
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Keluar'
      desc='Apakah Anda yakin ingin keluar? Anda harus masuk kembali untuk mengakses akun Anda.'
      confirmText='Keluar'
      cancelBtnText='Batal'
      destructive
      handleConfirm={handleSignOut}
      className={cn('sm:max-w-sm border-0', className)}
      cancelBtnClassName={cn(
        'border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus-visible:border-transparent outline-none focus:outline-none focus-visible:outline-none',
        cancelBtnClassName
      )}
      confirmBtnClassName={confirmBtnClassName}
    />
  )
}
