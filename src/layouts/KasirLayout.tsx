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
    <div className='flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground select-none'>
      {/* Banner Peringatan Offline */}
      {!isOnline && (
        <div className='flex items-center justify-center gap-2 bg-destructive py-2 text-sm font-semibold text-destructive-foreground animate-pulse'>
          <WifiOff className='h-4 w-4' />
          <span>Offline - Transaksi kasir tidak tersedia sampai koneksi pulih</span>
        </div>
      )}

      {/* Top Header Kasir POS */}
      <header className='flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border/50 bg-card px-4 shadow-none'>
        {/* Sisi Kiri: Branding & Titik Kasir */}
        <div className='flex items-center gap-3'>
          <div className='flex aspect-square size-8 items-center justify-center rounded-xl overflow-hidden bg-muted dark:bg-white p-1'>
            <img
              src='/logo.png'
              alt='Kantin SKOOLIA'
              className='size-full object-contain'
            />
          </div>
          <div>
            <span className='block font-bold text-sm tracking-tight'>SKOOLIA Kantin POS</span>
            <p className='text-xs text-muted-foreground flex items-center gap-1'>
              <User className='h-3 w-3' /> Petugas: {user?.nama || 'Ahmad Kasir'} (Aktif)
            </p>
          </div>
        </div>


        {/* Sisi Kanan: Status & Navigasi Cepat */}
        <div className='flex items-center gap-2'>
          {/* Tombol Fullscreen */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl'
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className='h-4 w-4' /> : <Maximize2 className='h-4 w-4' />}
          </Button>

          {/* Kembali ke Dashboard (disembunyikan untuk peran kasir, tetap tampil untuk pengelola/admin) */}
          {canGoBack && (
            <Button asChild variant='secondary' size='sm' className='h-8 gap-1.5 text-xs font-semibold ml-1 rounded-xl border-none bg-muted/70 dark:bg-muted/30 hover:bg-muted text-foreground shadow-none' title='Kembali ke Dashboard'>
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
            className='h-8 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl'
            onClick={() => setSignOutOpen(true)}
            title='Keluar Akun'
          >
            <LogOut className='size-3.5' />
            <span className='hidden sm:inline'>Keluar</span>
          </Button>
        </div>
      </header>

      {/* Main Content Kasir */}
      <main className='flex-1 overflow-hidden relative'>
        <Outlet />
      </main>

      {/* Dialog Konfirmasi Keluar */}
      <SignOutDialog open={!!signOutOpen} onOpenChange={setSignOutOpen} />
    </div>
  )
}

export default KasirLayout
