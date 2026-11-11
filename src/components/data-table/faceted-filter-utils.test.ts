import { describe, expect, it } from 'vitest'
import {
  computeNextFilterValues,
  normalizeSelectedValues,
  resolveFacetedFilterLabels,
} from './faceted-filter-utils'

describe('faceted-filter-utils', () => {
  it('membentuk label dropdown default untuk filter Kategori dan Status', () => {
    expect(resolveFacetedFilterLabels({ title: 'Kategori' })).toEqual({
      resetOptionLabel: 'Semua Kategori',
      triggerPlaceholder: 'Semua Kategori',
      resolvedSearchPlaceholder: 'Cari kategori...',
    })

    expect(resolveFacetedFilterLabels({ title: 'Status' })).toEqual({
      resetOptionLabel: 'Semua Status',
      triggerPlaceholder: 'Semua Status',
      resolvedSearchPlaceholder: 'Cari status...',
    })
  })

  it('menangani filter Urutkan dan override kustom tanpa awalan "Semua Urutkan"', () => {
    expect(resolveFacetedFilterLabels({ title: 'Urutkan' })).toEqual({
      resetOptionLabel: 'Bawaan (Default)',
      triggerPlaceholder: 'Urutkan',
      resolvedSearchPlaceholder: 'Cari urutkan...',
    })

    expect(
      resolveFacetedFilterLabels({
        title: 'Kategori',
        allLabel: 'Seluruh Kategori',
        searchPlaceholder: 'Ketik kategori...',
      })
    ).toEqual({
      resetOptionLabel: 'Seluruh Kategori',
      triggerPlaceholder: 'Seluruh Kategori',
      resolvedSearchPlaceholder: 'Ketik kategori...',
    })
  })

  it('mengubah pilihan single-select langsung tanpa toggle-kosong saat diklik', () => {
    const selected = normalizeSelectedValues(['2'], undefined)
    expect(selected.has('2')).toBe(true)

    expect(
      computeNextFilterValues({
        currentValues: selected,
        targetValue: '3',
        isSingleSelect: true,
      })
    ).toEqual(['3'])

    expect(
      computeNextFilterValues({
        currentValues: selected,
        targetValue: '2',
        isSingleSelect: true,
      })
    ).toEqual(['2'])
  })

  it('men-toggle nilai multi-select dengan benar', () => {
    const selected = new Set(['ACTIVE'])
    expect(
      computeNextFilterValues({
        currentValues: selected,
        targetValue: 'BLOCKED',
        isSingleSelect: false,
      })
    ).toEqual(['ACTIVE', 'BLOCKED'])

    expect(
      computeNextFilterValues({
        currentValues: selected,
        targetValue: 'ACTIVE',
        isSingleSelect: false,
      })
    ).toEqual([])
  })
})

