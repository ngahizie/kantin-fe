import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
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
      className='sm:max-w-sm border-0'
      cancelBtnClassName='border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus-visible:border-transparent outline-none focus:outline-none focus-visible:outline-none'
    />
  )
}
