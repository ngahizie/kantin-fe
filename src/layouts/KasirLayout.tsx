import { useState, useEffect } from 'react'
import { Outlet, Link } from '@tanstack/react-router'
import {
  WifiOff,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Clock,
  User,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'
import { SignOutDialog } from '@/components/sign-out-dialog'
import useDialogState from '@/hooks/use-dialog-state'

export function KasirLayout() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [time, setTime] = useState(new Date())
  const [signOutOpen, setSignOutOpen] = useDialogState()
  const { user } = useAuthStore().auth

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

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
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
      {/* Banner Peringatan Offline (PRD §6.5) */}
      {!isOnline && (
        <div className='flex items-center justify-center gap-2 bg-destructive py-2 text-sm font-semibold text-destructive-foreground animate-pulse'>
          <WifiOff className='h-4 w-4' />
          <span>Offline - Transaksi kasir tidak tersedia sampai koneksi pulih</span>
        </div>
      )}

      {/* Top Header Kasir POS */}
      <header className='flex h-14 shrink-0 items-center justify-between border-b px-4 bg-card/60 backdrop-blur'>
        {/* Sisi Kiri: Branding & Titik Kasir */}
        <div className='flex items-center gap-3'>
          <div className='flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-muted dark:bg-white p-1'>
            <img
              src='/logo.png'
              alt='Kantin SKOOLIA'
              className='size-full object-contain'
            />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <span className='font-bold text-sm tracking-tight'>SKOOLIA Kantin POS</span>
              <Badge variant='outline' className='text-xs font-normal border-primary/30 text-primary'>
                Kasir 1
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground flex items-center gap-1'>
              <User className='h-3 w-3' /> Petugas: {user?.nama || 'Ahmad Kasir'} (Aktif)
            </p>
          </div>
        </div>

        {/* Sisi Tengah: Jam Real-time */}
        <div className='hidden md:flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground'>
          <Clock className='h-3.5 w-3.5 text-primary' />
          <span className='font-medium text-foreground'>
            {time.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span>•</span>
          <span className='font-mono font-semibold text-foreground'>
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Sisi Kanan: Status & Navigasi Cepat */}
        <div className='flex items-center gap-2'>
          {/* Status Koneksi */}
          {isOnline ? (
            <Badge variant='secondary' className='hidden sm:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'>
              <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
              Online
            </Badge>
          ) : (
            <Badge variant='destructive' className='flex items-center gap-1'>
              <WifiOff className='h-3 w-3' />
              Offline
            </Badge>
          )}

          {/* Tombol Fullscreen */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-muted-foreground hover:text-foreground'
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className='h-4 w-4' /> : <Maximize2 className='h-4 w-4' />}
          </Button>

          {/* Kembali ke Backoffice */}
          <Button asChild variant='outline' size='sm' className='h-8 gap-1.5 text-xs font-medium ml-1'>
            <Link to='/'>
              <ArrowLeft className='h-3.5 w-3.5' />
              <span className='hidden sm:inline'>Back Office</span>
            </Link>
          </Button>

          {/* Logout Staf */}
          <Button
            variant='ghost'
            size='sm'
            className='h-8 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10'
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
