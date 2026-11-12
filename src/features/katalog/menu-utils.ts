import type { MenuItem } from './types'

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
  togglingId: number | null
  isDocumentHidden: boolean
}): boolean {
  const {
    autoRefreshEnabled = true,
    isModalOpen,
    hasDeleteTarget,
    isDeleting,
    togglingId,
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

