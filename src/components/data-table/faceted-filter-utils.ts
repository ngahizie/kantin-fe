import type { ComponentType } from 'react'

export type FilterOption = {
  label: string
  value: string
  icon?: ComponentType<{ className?: string }>
}

export function resolveFacetedFilterLabels(params: {
  title?: string
  allLabel?: string
  searchPlaceholder?: string
}) {
  const { title, allLabel, searchPlaceholder } = params
  const isSortFilter = title?.trim().toLowerCase() === 'urutkan'
  const resetOptionLabel =
    allLabel ??
    (isSortFilter ? 'Bawaan (Default)' : title ? `Semua ${title}` : 'Semua')
  const triggerPlaceholder =
    allLabel ?? (isSortFilter ? (title ?? 'Urutkan') : resetOptionLabel)
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? (title ? `Cari ${title.toLowerCase()}...` : 'Cari...')

  return {
    resetOptionLabel,
    triggerPlaceholder,
    resolvedSearchPlaceholder,
  }
}

export function normalizeSelectedValues(
  propSelectedValues: Set<string> | string[] | undefined,
  columnFilterValue: unknown
): Set<string> {
  if (propSelectedValues !== undefined) {
    if (propSelectedValues instanceof Set) return new Set(propSelectedValues)
    if (Array.isArray(propSelectedValues)) return new Set(propSelectedValues)
    if (propSelectedValues) return new Set([String(propSelectedValues)])
    return new Set<string>()
  }
  if (Array.isArray(columnFilterValue)) {
    return new Set(columnFilterValue.map(String))
  }
  return new Set<string>()
}

export function computeNextFilterValues(params: {
  currentValues: Set<string>
  targetValue: string
  isSingleSelect?: boolean
}): string[] {
  const { currentValues, targetValue, isSingleSelect } = params
  if (isSingleSelect) {
    return [targetValue]
  }
  const next = new Set(currentValues)
  if (next.has(targetValue)) {
    next.delete(targetValue)
  } else {
    next.add(targetValue)
  }
  return Array.from(next)
}
