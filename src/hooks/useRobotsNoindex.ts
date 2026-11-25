import { useEffect } from 'react'

/**
 * Hook untuk menambahkan meta tag robots noindex, nofollow saat halaman error aktif (OWASP A02).
 * Mencegah crawler mesin pencari mengindeks rute kesalahan sistem.
 */
export function useRobotsNoindex(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return

    let meta = document.querySelector("meta[name='robots']")
    const created = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    const prevContent = meta.getAttribute('content')
    meta.setAttribute('content', 'noindex, nofollow')

    return () => {
      if (created) {
        meta?.remove()
      } else if (prevContent) {
        meta?.setAttribute('content', prevContent)
      } else {
        meta?.removeAttribute('content')
      }
    }
  }, [])
}
