import { useEffect, useRef, useCallback } from 'react'

export interface UseRfidScannerOptions {
  onScan: (uid: string) => void
  enabled?: boolean
  minChars?: number
  maxIntervalMs?: number
}

/**
 * Hook deteksi Keyboard Wedge USB RFID Reader
 * Mendeteksi input karakter cepat berturut-turut (burst input <= 60ms antar-tombol)
 * yang diakhiri dengan tombol Enter.
 */
export function useRfidScanner({
  onScan,
  enabled = true,
  minChars = 4,
  maxIntervalMs = 60,
}: UseRfidScannerOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const burstTimestampsRef = useRef<number[]>([])

  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const clearBuffer = useCallback(() => {
    bufferRef.current = ''
    burstTimestampsRef.current = []
    lastKeyTimeRef.current = 0
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan tombol modifier
      if (e.ctrlKey || e.altKey || e.metaKey) return

      const now = Date.now()
      const timeSinceLastKey = now - lastKeyTimeRef.current

      // Jika tombol Enter ditekan
      if (e.key === 'Enter') {
        const buffer = bufferRef.current.trim()
        const timestamps = burstTimestampsRef.current

        // Validasi apakah ini adalah burst scan dari RFID reader:
        // 1. Panjang minimal terpenuhi (biasanya UID 4 - 14 karakter)
        // 2. Terdapat jeda burst cepat antar tombol
        let isLikelyBarcodeOrRfid = false
        if (buffer.length >= minChars && timestamps.length >= minChars) {
          const totalDuration =
            timestamps[timestamps.length - 1] - timestamps[0]
          const avgInterval = totalDuration / (timestamps.length - 1 || 1)

          if (avgInterval <= maxIntervalMs || totalDuration <= 600) {
            isLikelyBarcodeOrRfid = true
          }
        }

        if (isLikelyBarcodeOrRfid) {
          e.preventDefault()
          e.stopPropagation()
          const scannedUid = buffer
          clearBuffer()
          onScanRef.current(scannedUid)
          return
        }

        clearBuffer()
        return
      }

      // Tombol Escape membatalkan buffer saat ini
      if (e.key === 'Escape') {
        clearBuffer()
        return
      }

      // Hanya tampung karakter tunggal (huruf, angka, dash/underscore)
      if (e.key.length === 1) {
        // Jika jeda terlalu lama dari ketukan sebelumnya (> 150ms), kemungkinan ketikan manusia biasa
        if (
          timeSinceLastKey > maxIntervalMs * 2.5 &&
          bufferRef.current.length > 0
        ) {
          bufferRef.current = e.key
          burstTimestampsRef.current = [now]
        } else {
          bufferRef.current += e.key
          burstTimestampsRef.current.push(now)
        }

        lastKeyTimeRef.current = now
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, minChars, maxIntervalMs, clearBuffer])

  return {
    clearBuffer,
  }
}

export default useRfidScanner
