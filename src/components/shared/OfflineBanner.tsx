import React from 'react'
import { WifiOff, AlertTriangle } from 'lucide-react'

export interface OfflineBannerProps {
  className?: string
  message?: string
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  className = '',
  message = 'Offline - transaksi tidak tersedia',
}) => {
  return (
    <div
      role='alert'
      aria-live='assertive'
      className={`flex items-center justify-between gap-3 border-none bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white select-none sm:text-sm ${className}`}
    >
      <div className='flex items-center gap-2.5'>
        <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20'>
          <WifiOff className='h-3.5 w-3.5' />
        </div>
        <span>{message}</span>
      </div>

      <div className='hidden items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium sm:flex'>
        <AlertTriangle className='h-3 w-3 shrink-0' />
        <span>Koneksi internet terputus, pembaca kartu dinonaktifkan</span>
      </div>
    </div>
  )
}

export default OfflineBanner
