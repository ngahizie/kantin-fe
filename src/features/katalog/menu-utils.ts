import type { KategoriItem, MenuItem } from './types'

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

/**
 * Mengisi jumlah menu terkait per kategori berdasarkan daftar menu katalog
 * karena endpoint daftar kategori BE belum menyertakan field jumlahItem.
 */
export function mergeKategoriMenuCounts(
  kategoris: KategoriItem[],
  menus: Pick<MenuItem, 'kategoriId'>[] | null | undefined
): KategoriItem[] {
  if (!Array.isArray(menus)) return kategoris

  const counts = new Map<number, number>()
  for (const menu of menus) {
    if (menu.kategoriId === null || menu.kategoriId === undefined) continue
    const key = Number(menu.kategoriId)
    if (!Number.isFinite(key)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return kategoris.map((kat) => ({
    ...kat,
    jumlahItem: counts.get(Number(kat.id)) ?? 0,
  }))
}

/**
 * Mengembalikan pesan penolakan bila kategori masih memiliki menu terkait,
 * atau null jika kategori memenuhi syarat untuk dihapus.
 */
export function getKategoriDeleteBlockedReason(
  kat: Pick<KategoriItem, 'nama' | 'jumlahItem'> | null | undefined
): string | null {
  if (!kat) return null
  const relatedCount = kat.jumlahItem ?? 0
  if (relatedCount > 0) {
    return `Kategori "${kat.nama}" tidak dapat dihapus karena masih memiliki ${relatedCount} menu terkait. Pindahkan atau hapus menu terkait terlebih dahulu.`
  }
  return null
}

