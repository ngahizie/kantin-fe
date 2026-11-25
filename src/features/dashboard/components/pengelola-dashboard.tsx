import React, { useState, useEffect, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  UtensilsCrossed,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DashboardStatCard } from './dashboard-stat-card'
import { laporanApi } from '@/features/laporan/api/laporan-api'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import { formatTimeWithZone, formatNumber } from '@/lib/formatters'
import {
  formatRupiah,
  getLast7Days,
  renderStackedBar,
  getStatusBadgeClass,
  CATEGORY_COLORS,
  type DynamicCategory,
  type ChartDayItem,
  type RecentTransactionDisplayItem,
} from '../dashboard-utils'
import type { RingkasanPenjualan, BarisPenjualanKategori } from '@/features/laporan/types'
import type { MenuItem } from '@/features/katalog/types'

interface LowStockDisplayItem {
  id: number
  nama: string
  kategori_nama: string
  stok: number
  stok_minimum: number
  satuan: string
}

export const PengelolaDashboard: React.FC = () => {
  const [penjualan, setPenjualan] = useState<RingkasanPenjualan | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [kategoriMap, setKategoriMap] = useState<Record<number, string>>({})
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionDisplayItem[]>([])
  const [chartCategories, setChartCategories] = useState<DynamicCategory[]>([])
  const [rawWeeklyData, setRawWeeklyData] = useState<ChartDayItem[]>(() => {
    return getLast7Days().map((d) => ({
      hari: d.label,
      date: d.dateStr,
      total: 0,
    }))
  })

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [penjualanRes, menuRes, kategoriRes, trxRes] = await Promise.allSettled([
          laporanApi.getPenjualan(),
          katalogApi.getMenuList(undefined, true),
          katalogApi.getKategoriList(),
          laporanApi.getRiwayatTransaksiKeseluruhan({ batas: 25 }),
        ])

        if (!isMounted) return

        if (penjualanRes.status === 'fulfilled' && penjualanRes.value) {
          setPenjualan(penjualanRes.value)
        }

        const map: Record<number, string> = {}
        if (kategoriRes.status === 'fulfilled' && Array.isArray(kategoriRes.value)) {
          kategoriRes.value.forEach((k) => {
            map[k.id] = k.nama
          })
          setKategoriMap(map)
        }

        if (menuRes.status === 'fulfilled' && Array.isArray(menuRes.value)) {
          setMenuItems(menuRes.value)
        }

        if (trxRes.status === 'fulfilled' && Array.isArray(trxRes.value)) {
          const kasirRows = trxRes.value
            .filter((trx) => trx.jenis === 'BELANJA' || trx.jenis === 'VOID')
            .slice(0, 5)

          const mapped: RecentTransactionDisplayItem[] = kasirRows.map((trx) => {
            const timeStr = formatTimeWithZone(trx.waktu)
            const hasRealItems = Array.isArray(trx.items) && trx.items.length > 0
            const itemSummary = hasRealItems
              ? trx.items!
                  .map((it) => {
                    const menuName =
                      (it as { namaMenu?: string; nama?: string }).namaMenu ||
                      it.nama ||
                      'Item'
                    return (it.qty && it.qty > 1 ? `${it.qty}x ` : '') + menuName
                  })
                  .join(', ')
              : trx.titikKasir && trx.titikKasir !== '-'
                ? `POS ${trx.titikKasir}`
                : 'Transaksi Kantin'

            return {
              id: `TRX-${trx.id}`,
              waktu: timeStr,
              nama:
                trx.siswaNama ||
                (trx.siswaId ? `Siswa #${trx.siswaId}` : 'Pelanggan Tunai'),
              item: itemSummary,
              total: Number(trx.nominal ?? 0),
              status: trx.jenis === 'VOID' ? 'REFUND' : 'SUKSES',
            }
          })
          setRecentTransactions(mapped)
        }

        const sevenDays = getLast7Days()
        const categoriesFromDb: DynamicCategory[] = []
        if (kategoriRes.status === 'fulfilled' && Array.isArray(kategoriRes.value)) {
          kategoriRes.value.forEach((k, idx) => {
            categoriesFromDb.push({
              id: k.id,
              key: `cat_${k.id}`,
              nama: k.nama,
              color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
            })
          })
        }

        const weeklyPromises = sevenDays.map((d) =>
          laporanApi
            .getPenjualanPerKategori({ tanggal: d.dateStr })
            .catch(() => [])
        )
        const weeklyResults = await Promise.allSettled(weeklyPromises)

        const resolvedCategories = [...categoriesFromDb]
        let extraSeq = 1
        weeklyResults.forEach((res) => {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            res.value.forEach((row: BarisPenjualanKategori) => {
              const catName = String(row.nama || '').trim()
              const catId = Number(row.kunciId ?? row.kategoriId ?? 0)
              if (
                catName &&
                !resolvedCategories.some(
                  (c) =>
                    (catId > 0 && c.id === catId) ||
                    c.nama.toLowerCase() === catName.toLowerCase()
                )
              ) {
                const resolvedId = catId > 0 ? catId : -(extraSeq++)
                resolvedCategories.push({
                  id: resolvedId,
                  key: catId > 0 ? `cat_${catId}` : `cat_extra_${Math.abs(resolvedId)}`,
                  nama: catName,
                  color: CATEGORY_COLORS[resolvedCategories.length % CATEGORY_COLORS.length],
                })
              }
            })
          }
        })

        const dynamicChartData: ChartDayItem[] = sevenDays.map((day, idx) => {
          const row: ChartDayItem = {
            hari: day.label,
            date: day.dateStr,
            total: 0,
          }
          resolvedCategories.forEach((cat) => {
            row[cat.key] = 0
          })

          const dayRes = weeklyResults[idx]
          if (dayRes.status === 'fulfilled' && Array.isArray(dayRes.value)) {
            let dayTotal = 0
            dayRes.value.forEach((item: BarisPenjualanKategori) => {
              const catName = String(item.nama || '').trim()
              const catId = Number(item.kunciId ?? item.kategoriId ?? 0)
              const amount = Number(item.total ?? item.penjualanBersih ?? 0)
              const matchedCat = resolvedCategories.find(
                (c) =>
                  (catId > 0 && c.id === catId) ||
                  c.nama.toLowerCase() === catName.toLowerCase()
              )
              if (matchedCat) {
                row[matchedCat.key] = ((row[matchedCat.key] as number) || 0) + amount
              }
              dayTotal += amount
            })
            row.total = dayTotal
          }
          return row
        })

        if (!isMounted) return
        setChartCategories(resolvedCategories)
        setRawWeeklyData(dynamicChartData)
      } catch {
        // Fallback handled gracefully
      }
    }

    void fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  const effectiveMenuItems: LowStockDisplayItem[] = useMemo(() => {
    return menuItems.map((m) => ({
      id: m.id,
      nama: m.nama,
      kategori_nama: (m.kategoriId && kategoriMap[m.kategoriId]) || 'Umum',
      stok: m.stokBerjalan ?? 0,
      stok_minimum: m.stokMinimum ?? 5,
      satuan: m.satuan || 'Porsi',
    }))
  }, [menuItems, kategoriMap])

  const lowStockItems = useMemo(() => {
    return effectiveMenuItems
      .filter((item) => item.stok <= item.stok_minimum)
      .sort((a, b) => a.stok - b.stok)
  }, [effectiveMenuItems])

  const todaySales = penjualan?.penjualanBersih ?? penjualan?.penjualanBruto ?? 0
  const todayTransactions = Number(penjualan?.jumlahTransaksi ?? 0)
  const avgPerTransaction = todayTransactions > 0 ? Math.round(todaySales / todayTransactions) : 0
  const activeMenuCount = menuItems.filter((m) => m.aktif).length
  const totalMenuCount = menuItems.length
  const habisCount = effectiveMenuItems.filter((i) => i.stok === 0).length
  const menipisCount = effectiveMenuItems.filter((i) => i.stok > 0 && i.stok <= i.stok_minimum).length

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-foreground'>
          Dashboard Pengelola Kantin
        </h1>
        <p className='text-sm text-muted-foreground'>
          Pantau penjualan harian, perputaran menu, stok menipis, dan aktivitas kasir kantin secara real-time.
        </p>
      </div>

      {/* ===== 4 Kartu Metrik Utama ===== */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch'>
        <DashboardStatCard
          title='Penjualan Hari Ini'
          value={formatRupiah(todaySales)}
          icon={Banknote}
          iconColorClass='border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'
          badgeText='Penjualan Akhir'
          badgeColorClass='text-emerald-600 dark:text-emerald-400 font-semibold'
          subtext='• Hari ini'
        />

        <DashboardStatCard
          title='Total Transaksi'
          value={todayTransactions}
          unit='Trx'
          icon={ShoppingCart}
          iconColorClass='border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300'
          badgeText='Rata-rata'
          badgeColorClass='text-blue-600 dark:text-blue-400 font-semibold'
          subtext={`• ${formatRupiah(avgPerTransaction)} / trx`}
        />

        <DashboardStatCard
          title='Peringatan Stok Barang'
          value={lowStockItems.length}
          unit='Item'
          icon={lowStockItems.length === 0 ? CheckCircle2 : AlertTriangle}
          iconColorClass={
            lowStockItems.length === 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
          }
          badgeText={lowStockItems.length === 0 ? 'Stok Aman' : 'Perlu Restock'}
          badgeColorClass={
            lowStockItems.length === 0
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-amber-600 dark:text-amber-400 font-semibold'
          }
          subtext={`• ${habisCount} habis, ${menipisCount} menipis`}
        />

        <DashboardStatCard
          title='Menu Aktif'
          value={activeMenuCount}
          unit={`/ ${totalMenuCount} Menu`}
          icon={UtensilsCrossed}
          iconColorClass='border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
          badgeText={activeMenuCount > 0 ? 'Operasional' : 'Belum Ada'}
          badgeColorClass={
            activeMenuCount > 0
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-amber-600 dark:text-amber-400 font-semibold'
          }
          subtext={`• ${totalMenuCount - activeMenuCount} nonaktif`}
          href='/katalog/menu'
        />
      </div>

      {/* ===== Grid Konten Tengah: Grafik Penjualan 7 Hari & Stok Menipis ===== */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
        {/* Kolom Kiri: Tren Penjualan 7 Hari Terakhir */}
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader className='pb-3 space-y-3'>
            <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2'>
              <div>
                <CardTitle className='text-base font-semibold'>
                  Tren Penjualan 7 Hari Terakhir
                </CardTitle>
                <CardDescription className='text-xs mt-0.5'>
                  Grafik penjualan harian kasir kantin dalam Rupiah (Rp) per kategori
                </CardDescription>
              </div>
            </div>

            {chartCategories.length > 3 ? (
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs pt-2 border-t border-border'>
                {chartCategories.map((cat) => (
                  <div
                    key={cat.key}
                    className='flex items-center gap-2 min-w-0'
                    title={cat.nama}
                  >
                    <span
                      className='size-2.5 rounded-full shrink-0 shadow-xs'
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className='font-medium text-muted-foreground truncate'>
                      {cat.nama}
                    </span>
                  </div>
                ))}
              </div>
            ) : chartCategories.length > 0 ? (
              <div className='flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-border'>
                {chartCategories.map((cat) => (
                  <div
                    key={cat.key}
                    className='flex items-center gap-2'
                    title={cat.nama}
                  >
                    <span
                      className='size-2.5 rounded-full shrink-0 shadow-xs'
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className='font-medium text-muted-foreground whitespace-nowrap'>
                      {cat.nama}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className='ps-1 pe-4 pb-4 pt-3'>
            <div className='h-[310px] w-full min-h-[310px] min-w-0'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={rawWeeklyData}
                  maxBarSize={56}
                  barCategoryGap='16%'
                  margin={{ top: 10, right: 8, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray='3 3' className='stroke-border' vertical={false} />
                  <XAxis
                    dataKey='hari'
                    stroke='#888888'
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis
                    stroke='#888888'
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value === 0) return 'Rp 0'
                      if (value >= 1_000_000) {
                        return `Rp ${formatNumber(value / 1_000_000, { maximumFractionDigits: 1 })} jt`
                      }
                      return `Rp ${formatNumber(value / 1_000)} rb`
                    }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'currentColor', opacity: 0.04 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)
                        return (
                          <div className='rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-lg backdrop-blur-sm min-w-[200px]'>
                            <p className='font-semibold text-foreground mb-2'>{label}</p>
                            {payload.map((entry) => (
                              <div key={entry.name} className='flex items-center justify-between gap-6 py-1'>
                                <span className='capitalize text-muted-foreground flex items-center gap-2'>
                                  <span className='size-2 rounded-full shrink-0' style={{ backgroundColor: entry.color }} />
                                  {entry.name}
                                </span>
                                <span className='font-semibold text-foreground tabular-nums'>
                                  {formatRupiah(Number(entry.value))}
                                </span>
                              </div>
                            ))}
                            <div className='mt-2 pt-2 border-t border-border flex items-center justify-between gap-6 font-semibold text-foreground'>
                              <span>Total Penjualan</span>
                              <span className='font-bold tabular-nums text-foreground'>{formatRupiah(total)}</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  {chartCategories.map((cat) => (
                    <Bar
                      key={cat.key}
                      dataKey={cat.key}
                      name={cat.nama}
                      stackId='a'
                      fill={cat.color}
                      shape={(barProps: unknown) =>
                        renderStackedBar(
                          barProps as {
                            x?: number
                            y?: number
                            width?: number
                            height?: number
                            fill?: string
                            payload?: Record<string, unknown>
                          },
                          cat.key,
                          chartCategories
                        )
                      }
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Kolom Kanan: Stok Menipis */}
        <Card className='col-span-1 lg:col-span-3 flex flex-col overflow-hidden'>
          <CardHeader className='pb-3 flex flex-row items-start justify-between gap-2'>
            <div>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <AlertTriangle className='size-4 text-amber-600 dark:text-amber-400' />
                <span>Stok Menipis</span>
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Item dengan stok kurang dari atau sama dengan batas minimum
              </CardDescription>
            </div>
            <Link
              to='/stok/kartu'
              className='text-xs font-semibold text-primary hover:underline shrink-0 pt-0.5'
            >
              Kelola
            </Link>
          </CardHeader>
          <CardContent className='flex-1 p-0 border-t border-border'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40 hover:bg-muted/40 border-b border-border'>
                    <TableHead className='w-12 text-center ps-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                    <TableHead className='ps-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Menu</TableHead>
                    <TableHead className='text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Sisa / Min</TableHead>
                    <TableHead className='text-center pe-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.length === 0 ? (
                    <TableRow className='hover:bg-transparent border-b-0'>
                      <TableCell colSpan={4} className='h-28 text-center text-xs text-muted-foreground px-6'>
                        <CheckCircle2 className='size-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1 opacity-80' />
                        Semua stok menu dalam kondisi aman di atas batas minimum.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockItems.map((item, idx) => {
                      const isOut = item.stok === 0
                      return (
                        <TableRow key={item.id} className='text-xs hover:bg-transparent border-b border-border last:border-b-0'>
                          <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums ps-4 py-3'>
                            {idx + 1}
                          </TableCell>
                          <TableCell className='ps-2 py-3 font-medium'>
                            <div className='flex flex-col'>
                              <span className='text-foreground font-semibold'>{item.nama}</span>
                              <span className='text-[10px] text-muted-foreground'>{item.kategori_nama}</span>
                            </div>
                          </TableCell>
                          <TableCell className='text-center py-3 text-xs tabular-nums'>
                            <span className={isOut ? 'text-destructive font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                              {item.stok}
                            </span>
                            <span className='text-muted-foreground'> / {item.stok_minimum} {item.satuan}</span>
                          </TableCell>
                          <TableCell className='text-center pe-6 py-3'>
                            <Badge variant='outline' className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClass(isOut ? 'HABIS' : 'MENIPIS')}`}>
                              {isOut ? 'HABIS' : 'MENIPIS'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Tabel Bawah: Aktivitas Transaksi Kasir Terakhir ===== */}
      <Card className='overflow-hidden'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base font-semibold'>
            Aktivitas Transaksi Kasir Terakhir
          </CardTitle>
          <CardDescription className='text-xs mt-0.5'>
            Pencatatan real-time pembelian siswa via reader RFID USB
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0 border-t border-border'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40 border-b border-border'>
                  <TableHead className='w-12 text-center ps-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                  <TableHead className='w-[140px] ps-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Waktu</TableHead>
                  <TableHead className='w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Pelanggan</TableHead>
                  <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Item Menu</TableHead>
                  <TableHead className='text-right w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Total Belanja</TableHead>
                  <TableHead className='text-center w-[120px] pe-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow className='hover:bg-transparent border-b-0'>
                    <TableCell colSpan={6} className='h-28 text-center text-xs text-muted-foreground px-6'>
                      <ShoppingCart className='size-6 text-muted-foreground/50 mx-auto mb-1 opacity-70' />
                      Belum ada aktivitas transaksi kasir hari ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((trx, idx) => (
                    <TableRow key={trx.id} className='text-xs hover:bg-transparent border-b border-border last:border-b-0'>
                      <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums ps-4 py-3'>
                        {idx + 1}
                      </TableCell>
                      <TableCell className='ps-2 py-3'>
                        <div className='font-medium text-foreground tabular-nums'>{trx.waktu}</div>
                      </TableCell>
                      <TableCell className='py-3'>
                        <div className='font-semibold text-foreground'>{trx.nama}</div>
                      </TableCell>
                      <TableCell className='text-muted-foreground py-3'>
                        {trx.item}
                      </TableCell>
                      <TableCell className='text-right font-semibold text-foreground tabular-nums py-3'>
                        {formatRupiah(trx.total)}
                      </TableCell>
                      <TableCell className='text-center pe-6 py-3'>
                        <Badge variant='outline' className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClass(trx.status)}`}>
                          {trx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
