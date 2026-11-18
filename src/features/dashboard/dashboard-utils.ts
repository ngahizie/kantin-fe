import React from 'react'
import { formatWeekdayShort, formatMonthShort, formatDateIso } from '@/lib/formatters'

export interface DynamicCategory {
  id: number
  key: string
  nama: string
  color: string
}

export interface ChartDayItem {
  hari: string
  date: string
  total: number
  [key: string]: string | number
}

export interface RecentTransactionDisplayItem {
  id: string
  waktu: string
  nama: string
  identitas?: string
  item: string
  total: number
  status: string
  subjekTipe?: string
  jenis?: string
}

export const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green (emerald)
  '#f59e0b', // amber (gold)
  '#9333ea', // purple (violet)
  '#ef4444', // red (rose)
  '#0ea5e9', // sky
  '#ec4899', // pink
  '#64748b', // slate
]

export const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)
}

export const getLast7Days = () => {
  const result: { dateStr: string; label: string }[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)

    const dateStr = formatDateIso(d)

    let label: string
    if (i === 0) {
      label = 'Hari Ini'
    } else {
      const dayName = formatWeekdayShort(d)
      const dayNum = String(d.getDate()).padStart(2, '0')
      const monthName = formatMonthShort(d)
      label = `${dayName} (${dayNum} ${monthName})`
    }

    result.push({ dateStr, label })
  }

  return result
}

export const getRoundedTopBarPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 6
) => {
  if (height <= 0 || width <= 0) return ''
  const r = Math.min(radius, width / 2, height)
  return `M ${x},${y + height} L ${x},${y + r} Q ${x},${y} ${x + r},${y} L ${x + width - r},${y} Q ${x + width},${y} ${x + width},${y + r} L ${x + width},${y + height} Z`
}

export const isTopSegment = (
  payload: Record<string, unknown> | undefined,
  currentKey: string,
  categories: DynamicCategory[]
): boolean => {
  if (!payload) return false
  for (let i = categories.length - 1; i >= 0; i--) {
    const key = categories[i].key
    const val = Number(payload[key] ?? 0)
    if (val > 0) {
      return key === currentKey
    }
  }
  return false
}

export const renderStackedBar = (
  props: {
    x?: number
    y?: number
    width?: number
    height?: number
    fill?: string
    payload?: Record<string, unknown>
  },
  currentKey: string,
  categories: DynamicCategory[]
) => {
  const { x = 0, y = 0, width = 0, height = 0, fill = '#3b82f6', payload } = props
  if (height <= 0 || width <= 0) return null

  const isTop = isTopSegment(payload, currentKey, categories)
  if (isTop) {
    return React.createElement('path', {
      d: getRoundedTopBarPath(x, y, width, height, 8),
      fill,
    })
  }

  return React.createElement('rect', {
    x,
    y,
    width,
    height,
    fill,
  })
}

export const getStatusBadgeClass = (status: string) => {
  const normalized = status.toUpperCase()
  if (
    [
      'SUKSES',
      'BERHASIL',
      'SELESAI',
      'SEIMBANG',
      'AMAN',
      'AKTIF',
      'DIKONFIRMASI',
      'TERKONFIRMASI',
      'OPERASIONAL',
    ].includes(normalized)
  ) {
    return 'border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  }
  if (
    [
      'REFUND',
      'VOID',
      'GAGAL',
      'BATAL',
      'DIBATALKAN',
      'DITOLAK',
      'HABIS',
      'DIBLOKIR',
      'KURANG',
      'ADA SELISIH',
      'SELISIH',
    ].includes(normalized)
  ) {
    return 'border border-rose-200 dark:border-rose-900/60 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
  }
  if (
    [
      'PENDING',
      'MENUNGGU',
      'MENIPIS',
      'DIKOREKSI',
      'PROSES',
      'PERLU RESTOCK',
      'NONAKTIF',
    ].includes(normalized)
  ) {
    return 'border border-amber-200 dark:border-amber-900/60 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  }
  return 'border border-border bg-muted/50 text-muted-foreground'
}
