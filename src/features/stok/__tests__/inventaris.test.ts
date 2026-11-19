import { describe, it, expect } from 'vitest'
import type { InventarisItem } from '../types'

describe('Inventaris Sorting & Valuasi Safety (INV-04)', () => {
  it('tetap stabil dan tidak menghasilkan NaN saat stok atau hpp bernilai undefined/null', () => {
    const rawItems: Partial<InventarisItem>[] = [
      { menuId: 1, nama: 'Menu Tanpa HPP', stok: 10, hpp: undefined, nilaiPersediaan: undefined },
      { menuId: 2, nama: 'Menu Normal', stok: 5, hpp: 10000, nilaiPersediaan: 50000 },
      { menuId: 3, nama: 'Menu Stok Kosong', stok: 0, hpp: 2000, nilaiPersediaan: 0 },
    ]

    const sortFn = (a: Partial<InventarisItem>, b: Partial<InventarisItem>, sortBy: string) => {
      const stokA = a.stokBerjalan ?? a.stok ?? 0
      const stokB = b.stokBerjalan ?? b.stok ?? 0
      const hppA = a.hpp ?? 0
      const hppB = b.hpp ?? 0
      const valA = a.nilaiPersediaan ?? (stokA * hppA)
      const valB = b.nilaiPersediaan ?? (stokB * hppB)
      const nameA = a.namaMenu || a.nama || ''
      const nameB = b.namaMenu || b.nama || ''

      if (sortBy === 'NILAI_DESC') return (valB || 0) - (valA || 0)
      if (sortBy === 'NILAI_ASC') return (valA || 0) - (valB || 0)
      if (sortBy === 'STOK_DESC') return stokB - stokA
      if (sortBy === 'STOK_ASC') return stokA - stokB
      if (sortBy === 'NAMA_ASC') return nameA.localeCompare(nameB)
      return 0
    }

    const sortedDesc = [...rawItems].sort((a, b) => sortFn(a, b, 'NILAI_DESC'))
    expect(sortedDesc[0].menuId).toBe(2) // 50000
    expect(sortedDesc[1].menuId).toBe(1) // 0
    expect(sortedDesc[2].menuId).toBe(3) // 0

    const sortedAsc = [...rawItems].sort((a, b) => sortFn(a, b, 'NILAI_ASC'))
    expect(sortedAsc[2].menuId).toBe(2) // 50000 di paling akhir
  })
})
