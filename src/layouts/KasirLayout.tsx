import { useState, useEffect } from 'react'
import { Outlet, Link } from '@tanstack/react-router'
import {
  WifiOff,
  Maximize2,
  Minimize2,
  ArrowLeft,
  User,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useRoleStore } from '@/stores/useRoleStore'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { ThemeSwitch } from '@/components/theme-switch'
import useDialogState from '@/hooks/use-dialog-state'

export function KasirLayout() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useDialogState()
  const { user } = useAuthStore().auth
  const { currentRole } = useRoleStore()

  // Peran kasir POS murni tidak memiliki hak ke dashboard umum
  // Tombol kembali HANYA muncul untuk Pengelola dan Admin
  const activeRole = currentRole || user?.currentRole
  const isKasir =
    activeRole === 'kasir' ||
    user?.currentRole === 'kasir' ||
    Boolean(user?.roles?.some((r) => r.toLowerCase().includes('petugas') || r.toLowerCase().includes('kasir')))

  const canGoBack = !isKasir && (activeRole === 'pengelola' || activeRole === 'admin')

  // Deteksi status koneksi internet
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
      setIsFullscreen(false)
    }
  }

  return (
    <div
      data-kasir-layout
      className='flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground select-none'
    >
      {/* Banner Peringatan Offline */}
      {!isOnline && (
        <div className='flex items-center justify-center gap-2 bg-destructive py-2 text-sm font-semibold text-white animate-pulse'>
          <WifiOff className='h-4 w-4' />
          <span>Offline - Transaksi kasir tidak tersedia sampai koneksi pulih</span>
        </div>
      )}

      {/* Top Header Kasir POS */}
      <header className='flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4'>
        {/* Sisi Kiri: Branding & Titik Kasir */}
        <div className='flex items-center gap-3'>
          <div className='flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/50 p-1 dark:bg-white'>
            <img
              src='/logo.png'
              alt='Kantin SKOOLIA'
              className='size-full object-contain'
            />
          </div>
          <div>
            <span className='block text-sm font-bold tracking-tight text-foreground'>SKOOLIA Kantin POS</span>
            <p className='flex items-center gap-1 text-xs text-muted-foreground'>
              <User className='h-3 w-3' /> Petugas: {user?.nama || 'Petugas Kasir'} (Aktif)
            </p>
          </div>
        </div>


        {/* Sisi Kanan: Status & Navigasi Cepat */}
        <div className='flex items-center gap-2'>
          {/* Tombol Fullscreen */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground'
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className='h-4 w-4' /> : <Maximize2 className='h-4 w-4' />}
          </Button>

          {/* Pengalih Tema (Dark/Light/System) */}
          <ThemeSwitch
            triggerClassName='h-8 w-8 scale-100 rounded-lg text-muted-foreground hover:text-foreground'
            contentClassName='p-1 rounded-xl border border-border bg-popover text-popover-foreground shadow-md'
            itemClassName='rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer'
          />

          {/* Kembali ke Dashboard (disembunyikan untuk peran kasir, tetap tampil untuk pengelola/admin) */}
          {canGoBack && (
            <Button asChild variant='outline' size='sm' className='ml-1 h-8 gap-1.5 rounded-lg text-xs font-semibold' title='Kembali ke Dashboard'>
              <Link to='/'>
                <ArrowLeft className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>Kembali</span>
              </Link>
            </Button>
          )}

          {/* Logout Staf */}
          <Button
            variant='ghost'
            size='sm'
            className='h-8 gap-1 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive'
            onClick={() => setSignOutOpen(true)}
            title='Keluar Akun'
          >
            <LogOut className='size-3.5' />
            <span className='hidden sm:inline'>Keluar</span>
          </Button>
        </div>
      </header>

      {/* Main Content Kasir */}
      <main className='relative flex-1 overflow-hidden bg-background'>
        <Outlet />
      </main>

      {/* Dialog Konfirmasi Keluar */}
      <SignOutDialog
        open={!!signOutOpen}
        onOpenChange={setSignOutOpen}
        className='rounded-xl border border-border bg-card text-card-foreground shadow-lg'
        cancelBtnClassName='rounded-lg'
        confirmBtnClassName='rounded-lg bg-destructive text-white hover:bg-destructive/90'
      />
    </div>
  )
}

export default KasirLayout
