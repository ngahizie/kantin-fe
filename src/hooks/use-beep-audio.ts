import { useMemo } from 'react'

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  try {
    if (!sharedAudioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      if (AudioContextClass) {
        sharedAudioContext = new AudioContextClass()
      }
    }

    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {})
    }

    return sharedAudioContext
  } catch {
    return null
  }
}

/**
 * Audio Synthesizer Engine (bisa dipanggil mandiri atau via hook)
 */
export const beepAudioEngine = {
  /**
   * Suara sukses: nada frekuensi tinggi C5-G5 (800Hz - 1200Hz, durasi ~150ms)
   */
  playSuccess: () => {
    const ctx = getAudioContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.16)
    } catch {
      // Graceful fallback
    }
  },

  /**
   * Suara gagal: nada ganda frekuensi rendah (220Hz buzz, durasi ~300ms)
   */
  playError: () => {
    const ctx = getAudioContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime

      // Buzz 1: 220Hz (A3), durasi 100ms
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sawtooth'
      osc1.frequency.setValueAtTime(220, now)

      gain1.gain.setValueAtTime(0.0001, now)
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.01)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.11)

      // Buzz 2: 200Hz, durasi 120ms
      const t2 = now + 0.14
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sawtooth'
      osc2.frequency.setValueAtTime(200, t2)

      gain2.gain.setValueAtTime(0.0001, t2)
      gain2.gain.linearRampToValueAtTime(0.25, t2 + 0.01)
      gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.14)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(t2)
      osc2.stop(t2 + 0.15)
    } catch {
      // Graceful fallback
    }
  },

  /**
   * Suara pembatalan / void: nada menurun 600Hz -> 300Hz durasi ~200ms
   */
  playVoid: () => {
    const ctx = getAudioContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, now)
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.2)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.21)
    } catch {
      // Graceful fallback
    }
  },
}

/**
 * Web Audio API Synthesizer Hook untuk komponen React
 */
export function useBeepAudio() {
  return useMemo(() => beepAudioEngine, [])
}

export default useBeepAudio
