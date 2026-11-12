import type { MenuItem } from './types'

export const MENU_AUTO_REFRESH_INTERVAL_MS = 30_000
const KATALOG_SYNC_CHANNEL = 'kantin-katalog-sync'
const KATEGORI_CHANGED_EVENT = 'kantin:kategori-changed'

/**
 * Mengurutkan daftar menu dengan item terbaru (ID terbesar) berada di paling atas,
 * lalu diurutkan alfabetis jika ID sama.
 */
export function sortMenusNewestFirst(menus: MenuItem[]): MenuItem[] {
  return [...menus].sort((a, b) => {
    const idDiff = Number(b.id ?? 0) - Number(a.id ?? 0)
    if (idDiff !== 0) return idDiff
    return (a.nama ?? '').localeCompare(b.nama ?? '')
  })
}

export function shouldPauseMenuAutoRefresh(params: {
  autoRefreshEnabled?: boolean
  isModalOpen: boolean
  hasDeleteTarget: boolean
  isDeleting: boolean
  togglingId?: number | null
  isDocumentHidden: boolean
}): boolean {
  const {
    autoRefreshEnabled = true,
    isModalOpen,
    hasDeleteTarget,
    isDeleting,
    togglingId = null,
    isDocumentHidden,
  } = params

  return (
    !autoRefreshEnabled ||
    isModalOpen ||
    hasDeleteTarget ||
    isDeleting ||
    togglingId !== null ||
    isDocumentHidden
  )
}

export function notifyKategoriChanged(sourceId?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<{ sourceId?: string }>(KATEGORI_CHANGED_EVENT, {
        detail: { sourceId },
      })
    )
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(KATALOG_SYNC_CHANNEL)
      channel.postMessage({ type: 'kategori-changed', sourceId })
      channel.close()
    } catch {
      // Abaikan bila BroadcastChannel tidak didukung di lingkungan eksekusi
    }
  }
}

export function subscribeKategoriChanges(
  onChange: () => void,
  ownSourceId?: string
): () => void {
  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ sourceId?: string }>).detail
    if (ownSourceId && detail?.sourceId === ownSourceId) return
    onChange()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener(KATEGORI_CHANGED_EVENT, handleCustomEvent)
  }

  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(KATALOG_SYNC_CHANNEL)
      channel.onmessage = (event: MessageEvent<{ type?: string; sourceId?: string }>) => {
        if (event.data?.type !== 'kategori-changed') return
        if (ownSourceId && event.data?.sourceId === ownSourceId) return
        onChange()
      }
    } catch {
      channel = null
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(KATEGORI_CHANGED_EVENT, handleCustomEvent)
    }
    if (channel) {
      channel.close()
    }
  }
}

export function matchesMenuSearchQuery(
  item: Pick<MenuItem, 'nama' | 'kodeBarcode'>,
  rawQuery: string
): boolean {
  const query = (rawQuery || '').trim().toLowerCase()
  if (!query) return true
  const nama = (item?.nama ?? '').toLowerCase()
  const barcode = (item?.kodeBarcode ?? '').toLowerCase()
  return nama.includes(query) || barcode.includes(query)
}

