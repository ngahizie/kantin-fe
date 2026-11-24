import { useState, useEffect } from 'react'

/**
 * Hook deteksi koneksi jaringan internet / online status (PRD §6.5 & Issue #5)
 * Mendengarkan window event 'online' dan 'offline' serta membaca navigator.onLine
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine
    }
    return true
  })

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

  return isOnline
}

export default useOnlineStatus
