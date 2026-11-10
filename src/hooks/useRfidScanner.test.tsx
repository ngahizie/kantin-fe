import { useRef, useState, useEffect } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { useRfidScanner } from './useRfidScanner'

function ScannerHarness({
  onScan,
  enabled = true,
}: {
  onScan: (uid: string) => void
  enabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    const handleSlashShortcut = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleSlashShortcut)
    return () => window.removeEventListener('keydown', handleSlashShortcut)
  }, [])

  useRfidScanner({ onScan, enabled })

  return (
    <div>
      <input
        ref={inputRef}
        aria-label='Cari menu'
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}

function dispatchKeySequence(
  target: EventTarget,
  keys: string[],
  stepMs: number,
  options?: { repeat?: boolean }
) {
  keys.forEach((key, idx) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      repeat: options?.repeat ?? false,
    })
    target.dispatchEvent(event)
    if (idx < keys.length - 1 && stepMs > 0) {
      vi.advanceTimersByTime(stepMs)
    }
  })
}

describe('useRfidScanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tidak memicu scan saat tekan "/" lalu ketik kata pencarian menu dan Enter', async () => {
    const onScan = vi.fn()
    const screen = await render(<ScannerHarness onScan={onScan} />)
    const input = screen.getByLabelText('Cari menu').element() as HTMLInputElement

    // 1. Tekan '/' di window untuk fokus ke kolom cari menu
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    )
    expect(document.activeElement).toBe(input)

    // 2. Ketik nama menu cepat (75ms/karakter = 225ms total < 600ms) lalu Enter
    dispatchKeySequence(input, ['a', 'y', 'a', 'm', 'Enter'], 75)
    vi.advanceTimersByTime(200)
    expect(onScan).not.toHaveBeenCalled()

    // 3. Bahkan ketikan akord sangat cepat (25ms/karakter) untuk kata huruf murni juga tetap diabaikan
    dispatchKeySequence(input, ['Backspace', 'n', 'a', 's', 'i', 'Enter'], 25)
    vi.advanceTimersByTime(200)
    expect(onScan).not.toHaveBeenCalled()
  })

  it('tidak memicu scan untuk kata dengan angka di kecepatan ketik manusia atau auto-repeat tombol', async () => {
    const onScan = vi.fn()
    const screen = await render(<ScannerHarness onScan={onScan} />)
    const input = screen.getByLabelText('Cari menu').element() as HTMLInputElement
    input.focus()

    // Ketik manual "600ml" pada kecepatan ketik cepat manusia (60ms/karakter) lalu Enter
    dispatchKeySequence(input, ['6', '0', '0', 'm', 'l', 'Enter'], 60)
    vi.advanceTimersByTime(200)
    expect(onScan).not.toHaveBeenCalled()

    // Menahan tombol angka (auto-repeat OS setiap 25ms) lalu Enter
    dispatchKeySequence(input, ['0', '0', '0', '0', '0', '0'], 25, { repeat: true })
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(onScan).not.toHaveBeenCalled()
  })

  it('tetap mendeteksi scan burst perangkat keras RFID walau kursor berada di input cari', async () => {
    const onScan = vi.fn()
    const screen = await render(<ScannerHarness onScan={onScan} />)
    const input = screen.getByLabelText('Cari menu').element() as HTMLInputElement

    // Fokus via '/' tepat sebelum burst scan hardware
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    )
    vi.advanceTimersByTime(10)

    const uidChars = ['0', '4', 'A', '1', 'B', '2', 'C', '3', 'D', '4']
    dispatchKeySequence(input, uidChars, 15)
    vi.advanceTimersByTime(15)

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(enterEvent)

    expect(enterEvent.defaultPrevented).toBe(true)
    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith('04A1B2C3D4')
  })

  it('mendukung scan burst tanpa akhiran Enter via fallback timeout 150ms saat fokus di luar input', async () => {
    const onScan = vi.fn()
    await render(<ScannerHarness onScan={onScan} />)

    dispatchKeySequence(
      document.body,
      ['0', '4', 'A', '1', 'B', '2', 'C', '3'],
      15
    )

    expect(onScan).not.toHaveBeenCalled()
    vi.advanceTimersByTime(160)

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith('04A1B2C3')
  })
})
