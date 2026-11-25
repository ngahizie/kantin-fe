import { useState } from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { useRobotsNoindex } from './useRobotsNoindex'

function TestComponent() {
  useRobotsNoindex()
  return <div>Error Component</div>
}

function Harness() {
  const [mounted, setMounted] = useState(true)
  return (
    <div>
      <button onClick={() => setMounted(false)}>Unmount</button>
      {mounted && <TestComponent />}
    </div>
  )
}

describe('useRobotsNoindex', () => {
  beforeEach(() => {
    const existing = document.querySelector("meta[name='robots']")
    if (existing) existing.remove()
  })

  it('menambahkan meta tag robots noindex, nofollow saat mount dan menghapusnya saat unmount', async () => {
    expect(document.querySelector("meta[name='robots']")).toBeNull()

    render(<Harness />)

    await vi.waitFor(() => {
      const meta = document.querySelector("meta[name='robots']")
      expect(meta).not.toBeNull()
      expect(meta?.getAttribute('content')).toBe('noindex, nofollow')
    })

    const button = document.querySelector('button')
    button?.click()

    await vi.waitFor(() => {
      expect(document.querySelector("meta[name='robots']")).toBeNull()
    })
  })
})
