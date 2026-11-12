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
    <div className='flex h-screen w-screen flex-col overflow-hidden bg-[#FDFCF8] dark:bg-[#050510] text-slate-800 dark:text-white select-none'>
      {/* Banner Peringatan Offline */}
      {!isOnline && (
        <div className='flex items-center justify-center gap-2 bg-rose-600 py-2 text-sm font-semibold text-white animate-pulse'>
          <WifiOff className='h-4 w-4' />
          <span>Offline - Transaksi kasir tidak tersedia sampai koneksi pulih</span>
        </div>
      )}

      {/* Top Header Kasir POS */}
      <header className='flex h-14 shrink-0 items-center justify-between has-border !border-b !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] px-4 shadow-none'>
        {/* Sisi Kiri: Branding & Titik Kasir */}
        <div className='flex items-center gap-3'>
          <div className='flex aspect-square size-8 items-center justify-center rounded-xl overflow-hidden bg-slate-100 dark:bg-white has-border !border !border-slate-200 dark:!border-slate-800 p-1'>
            <img
              src='/logo.png'
              alt='Kantin SKOOLIA'
              className='size-full object-contain'
            />
          </div>
          <div>
            <span className='block font-bold text-sm tracking-tight text-slate-800 dark:text-white'>SKOOLIA Kantin POS</span>
            <p className='text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1'>
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
            className='h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl'
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className='h-4 w-4' /> : <Maximize2 className='h-4 w-4' />}
          </Button>

          {/* Pengalih Tema (Dark/Light/System) */}
          <ThemeSwitch
            triggerClassName='h-8 w-8 scale-100 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
            contentClassName='p-1 has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-white rounded-xl shadow-none'
            itemClassName='rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800/80 focus:text-slate-800 dark:focus:text-white'
          />

          {/* Kembali ke Dashboard (disembunyikan untuk peran kasir, tetap tampil untuk pengelola/admin) */}
          {canGoBack && (
            <Button asChild variant='secondary' size='sm' className='h-8 gap-1.5 text-xs font-semibold ml-1 rounded-xl has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-none' title='Kembali ke Dashboard'>
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
            className='h-8 gap-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl'
            onClick={() => setSignOutOpen(true)}
            title='Keluar Akun'
          >
            <LogOut className='size-3.5' />
            <span className='hidden sm:inline'>Keluar</span>
          </Button>
        </div>
      </header>

      {/* Main Content Kasir */}
      <main className='flex-1 overflow-hidden relative bg-[#FDFCF8] dark:bg-[#050510]'>
        <Outlet />
      </main>

      {/* Dialog Konfirmasi Keluar */}
      <SignOutDialog
        open={!!signOutOpen}
        onOpenChange={setSignOutOpen}
        className='bg-white dark:bg-[#0a0a0a] text-slate-800 dark:text-white has-border !border !border-slate-200 dark:!border-slate-800 rounded-2xl shadow-none'
        cancelBtnClassName='has-border !border !border-slate-200 dark:!border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl'
        confirmBtnClassName='!bg-rose-600 hover:!bg-rose-500 !text-white rounded-xl shadow-none'
      />
    </div>
  )
}

export default KasirLayout
