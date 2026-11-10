import { useEffect, useRef, useCallback } from 'react'

export interface UseRfidScannerOptions {
  onScan: (uid: string) => void
  enabled?: boolean
  minChars?: number
  maxIntervalMs?: number
}

const UID_CHAR_REGEX = /^[a-zA-Z0-9_-]$/

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * Hook deteksi Keyboard Wedge USB RFID Reader
 * Mendeteksi input karakter cepat berturut-turut khas perangkat keras (burst input)
 * tanpa menangkap ketikan manual manusia, termasuk saat kursor berada di input cari.
 */
export function useRfidScanner({
  onScan,
  enabled = true,
  minChars = 4,
  maxIntervalMs = 35,
}: UseRfidScannerOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const lastTargetRef = useRef<EventTarget | null>(null)
  const burstTimestampsRef = useRef<number[]>([])
  const burstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const clearBuffer = useCallback(() => {
    if (burstTimeoutRef.current) {
      clearTimeout(burstTimeoutRef.current)
      burstTimeoutRef.current = null
    }
    bufferRef.current = ''
    burstTimestampsRef.current = []
    lastKeyTimeRef.current = 0
    lastTargetRef.current = null
  }, [])

  const isValidScanBurst = useCallback(
    (buffer: string, timestamps: number[], inEditable: boolean): boolean => {
      const requiredLength = inEditable ? Math.max(minChars, 5) : minChars
      if (buffer.length < requiredLength || timestamps.length < requiredLength) {
        return false
      }

      // Saat fokus berada di kolom input/teks, wajib mengandung angka (UID hex/desimal/KT-xxx)
      // agar kata pencarian menu (seperti "ayam", "nasi", "kopi") tidak pernah memicu scan.
      if (inEditable && !/\d/.test(buffer)) {
        return false
      }

      const maxGapMs = Math.max(maxIntervalMs * 2, 70)
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] - timestamps[i - 1] > maxGapMs) {
          return false
        }
      }

      const totalDuration = timestamps[timestamps.length - 1] - timestamps[0]
      const avgInterval = totalDuration / (timestamps.length - 1 || 1)
      return avgInterval <= maxIntervalMs
    },
    [minChars, maxIntervalMs]
  )

  useEffect(() => {
    if (!enabled) {
      clearBuffer()
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan tombol modifier, key repeat (tahan tombol), dan komposisi IME
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.repeat || e.isComposing || e.key === 'Process') {
        clearBuffer()
        return
      }

      // Bersihkan buffer bila target elemen berpindah (misal shortcut '/' memfokuskan kolom cari)
      if (lastTargetRef.current && lastTargetRef.current !== e.target) {
        clearBuffer()
      }

      const now = Date.now()
      const timeSinceLastKey = now - lastKeyTimeRef.current
      const maxGapMs = Math.max(maxIntervalMs * 2, 70)
      const inEditable =
        isEditableTarget(e.target) || isEditableTarget(document.activeElement)

      // Jika tombol Enter ditekan
      if (e.key === 'Enter') {
        if (burstTimeoutRef.current) {
          clearTimeout(burstTimeoutRef.current)
          burstTimeoutRef.current = null
        }

        const buffer = bufferRef.current.trim()
        const timestamps = burstTimestampsRef.current

        if (isValidScanBurst(buffer, timestamps, inEditable)) {
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

      // Tombol Escape, '/' (shortcut fokus cari), Backspace/Delete/Tab membatalkan buffer saat ini
      if (
        e.key === 'Escape' ||
        e.key === '/' ||
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Tab'
      ) {
        clearBuffer()
        return
      }

      // Hanya tampung karakter tunggal yang valid untuk UID RFID (alphanumeric, -, _)
      if (e.key.length === 1) {
        if (!UID_CHAR_REGEX.test(e.key)) {
          clearBuffer()
          return
        }

        if (burstTimeoutRef.current) {
          clearTimeout(burstTimeoutRef.current)
          burstTimeoutRef.current = null
        }

        // Jika jeda terlalu lama dari ketukan sebelumnya, reset sebagai awal sequence baru
        if (timeSinceLastKey > maxGapMs && bufferRef.current.length > 0) {
          bufferRef.current = e.key
          burstTimestampsRef.current = [now]
        } else {
          bufferRef.current += e.key
          burstTimestampsRef.current.push(now)
        }

        lastKeyTimeRef.current = now
        lastTargetRef.current = e.target

        // Fallback untuk USB RFID reader yang tidak mengirimkan tombol Enter:
        // Jika karakter datang cepat berturut-turut (burst), trigger onScan setelah jeda 150ms
        const targetIsEditable = inEditable
        burstTimeoutRef.current = setTimeout(() => {
          const buffer = bufferRef.current.trim()
          const timestamps = burstTimestampsRef.current

          if (isValidScanBurst(buffer, timestamps, targetIsEditable)) {
            const scannedUid = buffer
            clearBuffer()
            onScanRef.current(scannedUid)
          } else {
            clearBuffer()
          }
        }, 150)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      if (burstTimeoutRef.current) {
        clearTimeout(burstTimeoutRef.current)
      }
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, maxIntervalMs, clearBuffer, isValidScanBurst])

  return {
    clearBuffer,
  }
}

export default useRfidScanner
