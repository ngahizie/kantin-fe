export type KatalogChangeReason = 'menu' | 'kategori' | 'stok' | 'kasir'

export interface KatalogChangeEvent {
  id: string
  reason: KatalogChangeReason
  sourceTabId: string
  timestamp: number
}

export interface KatalogChangeNotification extends KatalogChangeEvent {
  isCrossTab: boolean
}

export const KATALOG_SYNC_CHANNEL_NAME = 'kantin:katalog-sync'
const KATALOG_SYNC_WINDOW_EVENT = 'kantin:katalog-changed'
export const KATALOG_SYNC_STORAGE_KEY = 'kantin:katalog-last-change'

const MAX_SEEN_EVENT_IDS = 100

function createUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const CURRENT_TAB_ID = createUniqueId()

const VALID_REASONS = new Set<KatalogChangeReason>([
  'menu',
  'kategori',
  'stok',
  'kasir',
])

function parseKatalogChangeEvent(raw: unknown): KatalogChangeEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (
    typeof obj.id !== 'string' ||
    !obj.id ||
    typeof obj.reason !== 'string' ||
    !VALID_REASONS.has(obj.reason as KatalogChangeReason) ||
    typeof obj.sourceTabId !== 'string' ||
    typeof obj.timestamp !== 'number'
  ) {
    return null
  }
  return {
    id: obj.id,
    reason: obj.reason as KatalogChangeReason,
    sourceTabId: obj.sourceTabId,
    timestamp: obj.timestamp,
  }
}

let publisherChannel: BroadcastChannel | null = null
let publisherChannelCtor: typeof BroadcastChannel | undefined

function getPublisherChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!publisherChannel || publisherChannelCtor !== BroadcastChannel) {
    try {
      publisherChannel?.close()
    } catch {
      // Abaikan error saat menutup channel lama
    }
    try {
      publisherChannel = new BroadcastChannel(KATALOG_SYNC_CHANNEL_NAME)
      publisherChannelCtor = BroadcastChannel
    } catch {
      publisherChannel = null
      publisherChannelCtor = undefined
    }
  }
  return publisherChannel
}

/**
 * Ambil ID perubahan katalog terakhir yang tercatat di localStorage.
 * Berguna untuk mendeteksi mutasi dari tab lain yang terjadi saat tab saat ini
 * sempat dibekukan (bfcache / background tab throttling).
 */
export function getLatestKatalogChangeId(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KATALOG_SYNC_STORAGE_KEY)
    if (!raw) return null
    const parsed = parseKatalogChangeEvent(JSON.parse(raw))
    return parsed?.id ?? null
  } catch {
    return null
  }
}

/**
 * Siarkan sinyal perubahan katalog (menu, kategori, stok, atau transaksi kasir)
 * ke listener di tab yang sama maupun ke seluruh tab/jendela lain pada origin yang sama.
 */
export function notifyKatalogChanged(
  reason: KatalogChangeReason
): KatalogChangeEvent {
  const event: KatalogChangeEvent = {
    id: createUniqueId(),
    reason,
    sourceTabId: CURRENT_TAB_ID,
    timestamp: Date.now(),
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(KATALOG_SYNC_STORAGE_KEY, JSON.stringify(event))
    } catch {
      // Abaikan bila storage dibatasi atau penuh
    }
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = getPublisherChannel()
      channel?.postMessage(event)
    } catch {
      // Reset cache channel bila sempat tertutup lalu coba kirim sekali lagi
      publisherChannel = null
      try {
        getPublisherChannel()?.postMessage(event)
      } catch {
        // Fallback window storage event tetap berjalan di tab lain
      }
    }
  }

  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent<KatalogChangeEvent>(KATALOG_SYNC_WINDOW_EVENT, {
          detail: event,
        })
      )
    } catch {
      // Abaikan kegagalan dispatch pada lingkungan non-standar
    }
  }

  return event
}

/**
 * Berlangganan notifikasi perubahan katalog di tab saat ini maupun lintas tab.
 * Menggabungkan BroadcastChannel (utama) dan storage event (cadangan) dengan
 * deduplikasi ID event agar listener dipanggil maksimal satu kali per mutasi.
 */
export function subscribeKatalogChanges(
  onChange: (notification: KatalogChangeNotification) => void
): () => void {
  const seenIds = new Set<string>()

  const rememberAndEmit = (raw: unknown, defaultCrossTab: boolean) => {
    const event = parseKatalogChangeEvent(raw)
    if (!event) return

    const isCrossTab =
      defaultCrossTab || event.sourceTabId !== CURRENT_TAB_ID
    if (defaultCrossTab && event.sourceTabId === CURRENT_TAB_ID) {
      return
    }

    if (seenIds.has(event.id)) return
    if (seenIds.size >= MAX_SEEN_EVENT_IDS) {
      const oldest = seenIds.values().next().value
      if (oldest) seenIds.delete(oldest)
    }
    seenIds.add(event.id)

    onChange({
      ...event,
      isCrossTab,
    })
  }

  const handleWindowEvent = (evt: Event) => {
    const customEvt = evt as CustomEvent<unknown>
    rememberAndEmit(customEvt.detail, false)
  }

  const handleStorageEvent = (evt: StorageEvent) => {
    if (evt.key !== KATALOG_SYNC_STORAGE_KEY || !evt.newValue) return
    try {
      rememberAndEmit(JSON.parse(evt.newValue), true)
    } catch {
      // Abaikan payload storage yang tidak valid
    }
  }

  let receiverChannel: BroadcastChannel | null = null
  const handleChannelMessage = (evt: MessageEvent<unknown>) => {
    rememberAndEmit(evt.data, true)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener(KATALOG_SYNC_WINDOW_EVENT, handleWindowEvent)
    window.addEventListener('storage', handleStorageEvent)
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      receiverChannel = new BroadcastChannel(KATALOG_SYNC_CHANNEL_NAME)
      receiverChannel.addEventListener('message', handleChannelMessage)
    } catch {
      receiverChannel = null
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(KATALOG_SYNC_WINDOW_EVENT, handleWindowEvent)
      window.removeEventListener('storage', handleStorageEvent)
    }
    if (receiverChannel) {
      try {
        receiverChannel.removeEventListener('message', handleChannelMessage)
        receiverChannel.close()
      } catch {
        // Abaikan error penutupan channel
      }
    }
  }
}
