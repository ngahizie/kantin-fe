import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/use-cart-store'
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
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      // Kosongkan keranjang belanja agar tidak terbawa ke akun kasir lain (issue #143)
      useCartStore.getState().clearCart()
      if (typeof auth.signOut === 'function') {
        await auth.signOut()
      } else {
        auth.reset()
      }
    } finally {
      setIsLoading(false)
      onOpenChange(false)
      // Arahkan langsung ke halaman sign-in tanpa menyimpan redirect path
      // untuk mencegah error 403 saat staf lain login dengan role berbeda
      navigate({
        to: '/sign-in',
        replace: true,
      })
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Keluar'
      desc='Apakah Anda yakin ingin keluar? Anda harus masuk kembali untuk mengakses akun Anda.'
      confirmText={isLoading ? 'Mengeluarkan...' : 'Keluar'}
      cancelBtnText='Batal'
      destructive
      isLoading={isLoading}
      handleConfirm={handleSignOut}
      className={cn('sm:max-w-sm', className)}
      cancelBtnClassName={cancelBtnClassName}
      confirmBtnClassName={confirmBtnClassName}
    />
  )
}
