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

