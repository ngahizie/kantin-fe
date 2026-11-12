import { useState, useEffect, useMemo } from 'react'
import {
  ShoppingCart,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Banknote,
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
import { BackofficeHeader } from '@/components/layout/backoffice-header'
import { Main } from '@/components/layout/main'
import { laporanApi } from '@/features/laporan/api/laporan-api'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import { useRoleStore } from '@/stores/useRoleStore'
import { formatTimeWithZone } from '@/lib/formatters'
import type { RingkasanPenjualan, RingkasanRekonsiliasi, BarisPenjualanKategori } from '@/features/laporan/types'
import type { MenuItem } from '@/features/katalog/types'

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

const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green (emerald)
  '#f59e0b', // amber (gold)
  '#9333ea', // purple (violet)
  '#ef4444', // red (rose)
  '#0ea5e9', // sky
  '#ec4899', // pink
  '#64748b', // slate
]

const getLast7Days = () => {
  const result: { dateStr: string; label: string }[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${day}`

    let label: string
    if (i === 0) {
      label = 'Hari Ini'
    } else {
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' })
      const dayNum = String(d.getDate()).padStart(2, '0')
      const monthName = d.toLocaleDateString('id-ID', { month: 'short' })
      label = `${dayName} (${dayNum} ${monthName})`
    }

    result.push({ dateStr, label })
  }

  return result
}

interface LowStockDisplayItem {
  id: number
  nama: string
  kategori_nama: string
  stok: number
  stok_minimum: number
  satuan: string
}

interface RecentTransactionDisplayItem {
  id: string
  waktu: string
  nama: string
  identitas?: string
  tipe: string
  item: string
  total: number
  metode: string
  status: string
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)
}

const getRoundedTopBarPath = (
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

const isTopSegment = (
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

const renderStackedBar = (
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
    return (
      <path
        d={getRoundedTopBarPath(x, y, width, height, 8)}
        fill={fill}
      />
    )
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const getStatusBadgeClass = (status: string) => {
  const normalized = status.toUpperCase()
  if (['SUKSES', 'BERHASIL', 'SELESAI', 'SEIMBANG', 'AMAN', 'AKTIF', 'TERKONFIRMASI'].includes(normalized)) {
    return 'has-border border border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  }
  if (['REFUND', 'VOID', 'GAGAL', 'BATAL', 'DIBATALKAN', 'DITOLAK', 'HABIS', 'DIBLOKIR', 'KURANG'].includes(normalized)) {
    return 'has-border border border-rose-200 dark:border-rose-800 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
  }
  if (['PENDING', 'MENUNGGU', 'MENIPIS', 'DIKOREKSI', 'PROSES'].includes(normalized)) {
    return 'has-border border border-amber-200 dark:border-amber-800 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  }
  return 'has-border border border-slate-200 dark:border-slate-800 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
}

export function DashboardPage() {
  const { currentRole } = useRoleStore()
  const [penjualan, setPenjualan] = useState<RingkasanPenjualan | null>(null)
  const [rekonsiliasi, setRekonsiliasi] = useState<RingkasanRekonsiliasi | null>(null)
  const [rekonsiliasiStatus, setRekonsiliasiStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
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

  const canViewRekonsiliasi = useMemo(() => {
    return ['admin', 'bendahara', 'tu', 'kepsek'].includes(currentRole)
  }, [currentRole])

  // Fetch data awal saat komponen dibuka
  useEffect(() => {
    let isMounted = true

    const fetchInitialData = async () => {
      try {
        const canViewKatalog = currentRole !== 'kepsek'
        const canViewTransaksi = ['admin', 'tu', 'bendahara', 'pengelola'].includes(currentRole)

        const [
          penjualanRes,
          rekonsiliasiRes,
          menuRes,
          kategoriRes,
          trxRes,
        ] = await Promise.allSettled([
          laporanApi.getPenjualan(),
          canViewRekonsiliasi
            ? laporanApi.getRekonsiliasi(undefined, { silent: true })
            : Promise.resolve(null),
          canViewKatalog ? katalogApi.getMenuList(undefined, true) : Promise.resolve([]),
          canViewKatalog ? katalogApi.getKategoriList() : Promise.resolve([]),
          canViewTransaksi
            ? laporanApi.getRiwayatTransaksiKeseluruhan({ batas: 25 })
            : Promise.resolve([]),
        ])

        if (!isMounted) return

        // 1. Data Penjualan Hari Ini
        if (penjualanRes.status === 'fulfilled' && penjualanRes.value) {
          setPenjualan(penjualanRes.value)
        }

        // 2. Data Status Rekonsiliasi Kas
        if (!canViewRekonsiliasi) {
          setRekonsiliasi(null)
          setRekonsiliasiStatus('loaded')
        } else if (rekonsiliasiRes.status === 'fulfilled' && rekonsiliasiRes.value) {
          setRekonsiliasi(rekonsiliasiRes.value)
          setRekonsiliasiStatus('loaded')
        } else {
          setRekonsiliasi(null)
          setRekonsiliasiStatus('error')
        }

        // 3. Peta Kategori Menu
        const map: Record<number, string> = {}
        if (kategoriRes.status === 'fulfilled' && Array.isArray(kategoriRes.value)) {
          kategoriRes.value.forEach((k) => {
            map[k.id] = k.nama
          })
          setKategoriMap(map)
        }

        // 4. Data Menu & Stok
        if (menuRes.status === 'fulfilled' && Array.isArray(menuRes.value)) {
          setMenuItems(menuRes.value)
        }

        // 5. Transaksi Kasir Terakhir (dari /api/laporan/transaksi-keseluruhan dengan rincian item & nama siswa)
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
              nama: trx.siswaNama || (trx.siswaId ? `Siswa #${trx.siswaId}` : 'Pelanggan'),
              tipe: 'Siswa',
              item: itemSummary,
              total: Number(trx.nominal ?? 0),
              metode: 'RFID Tap',
              status: trx.jenis === 'VOID' ? 'REFUND' : 'SUKSES',
            }
          })
          setRecentTransactions(mapped)
        } else {
          setRecentTransactions([])
        }

        // 6. Data Tren Penjualan 7 Hari Terakhir per Kategori dari Database
        const sevenDays = getLast7Days()

        // Ambil kategori dari database katalog_menu (hanya jika role memiliki akses katalog)
        const categoriesFromDb: DynamicCategory[] = []
        if (kategoriRes.status === 'fulfilled' && Array.isArray(kategoriRes.value) && kategoriRes.value.length > 0) {
          kategoriRes.value.forEach((k, idx) => {
            categoriesFromDb.push({
              id: k.id,
              key: `cat_${k.id}`,
              nama: k.nama,
              color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
            })
          })
        }

        // Panggil laporan penjualan per kategori untuk 7 hari terakhir secara paralel dari BE
        const weeklyPromises = sevenDays.map((d) =>
          laporanApi
            .getPenjualanPerKategori({ tanggal: d.dateStr })
            .catch(() => [])
        )
        const weeklyResults = await Promise.allSettled(weeklyPromises)

        // Tambahkan kategori dari data transaksi penjualan per kategori jika belum ada di katalog
        const resolvedCategories = [...categoriesFromDb]
        let extraCategorySeq = 1
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
                const resolvedId = catId > 0 ? catId : -(extraCategorySeq++)
                const resolvedKey =
                  catId > 0
                    ? `cat_${catId}`
                    : `cat_extra_${Math.abs(resolvedId)}`
                resolvedCategories.push({
                  id: resolvedId,
                  key: resolvedKey,
                  nama: catName,
                  color:
                    CATEGORY_COLORS[
                      resolvedCategories.length % CATEGORY_COLORS.length
                    ],
                })
              }
            })
          }
        })

        // Susun data per hari untuk chart
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
                row[matchedCat.key] =
                  ((row[matchedCat.key] as number) || 0) + amount
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
        if (isMounted && canViewRekonsiliasi) {
          setRekonsiliasi(null)
          setRekonsiliasiStatus('error')
        }
      }
    }

    void fetchInitialData()

    return () => {
      isMounted = false
    }
  }, [currentRole, canViewRekonsiliasi])

  // Normalisasi data menu dari BE
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

  // Item dengan stok menipis (stok <= stok_minimum), diurutkan dari stok paling sedikit
  const lowStockItems = useMemo(() => {
    return effectiveMenuItems
      .filter((item) => item.stok <= item.stok_minimum)
      .sort((a, b) => a.stok - b.stok)
  }, [effectiveMenuItems])

  // Hitung metrik hari ini dari BE
  const todaySales = penjualan?.penjualanBersih ?? penjualan?.penjualanBruto ?? 0
  const todayTransactions = Number(penjualan?.jumlahTransaksi ?? 0)
  const avgPerTransaction = todayTransactions > 0 ? Math.round(todaySales / todayTransactions) : 0
  const saldoMengendapKas = rekonsiliasi?.saldoMengendap ?? 0
  const selisihKas = rekonsiliasi?.selisih ?? 0
  const isKasSeimbang = Boolean(rekonsiliasi?.seimbang)

  // Gunakan data penjualan per kategori per hari langsung dari BE tanpa memodifikasi kategori pertama
  const chartData = rawWeeklyData

  return (
    <>
      {/* Top Header Shell dengan breadcrumb, sekolah, modul status, search & profil */}
      <BackofficeHeader />

      <Main className='space-y-6 pb-12'>
        {/* ===== Kartu Metrik Utama ===== */}
        <div
          className={`grid gap-4 sm:grid-cols-2 ${
            currentRole === 'pengelola' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
          }`}
        >
          {/* Card 1: Penjualan Hari Ini */}
          <Card className='has-outline outline-2 outline-slate-200 dark:outline-slate-800 border-0 bg-card shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Penjualan Hari Ini
              </CardTitle>
              <div className='has-border flex size-9 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300'>
                <Banknote className='size-5' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground'>
                {formatRupiah(todaySales)}
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold'>
                  Omset Bersih
                </span>
                <span>• Akumulasi hari ini</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Transaksi Hari Ini */}
          <Card className='has-outline outline-2 outline-slate-200 dark:outline-slate-800 border-0 bg-card shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Transaksi Hari Ini
              </CardTitle>
              <div className='has-border flex size-9 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300'>
                <ShoppingCart className='size-5' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground'>
                {todayTransactions} <span className='text-base font-normal text-muted-foreground'>Trx</span>
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold'>
                  Rata-rata
                </span>
                <span>• {formatRupiah(avgPerTransaction)} / trx</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Status Rekonsiliasi Kas (Hanya ditampilkan untuk peran selain pengelola) */}
          {currentRole !== 'pengelola' && (
            canViewRekonsiliasi ? (
              <Card className='has-outline outline-2 outline-slate-200 dark:outline-slate-800 border-0 bg-card shadow-sm'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>
                    Status Rekonsiliasi Kas
                  </CardTitle>
                  <div
                    className={`has-border flex size-9 items-center justify-center rounded-lg ${
                      !rekonsiliasi
                        ? rekonsiliasiStatus === 'error'
                          ? 'border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                        : isKasSeimbang
                          ? 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                  >
                    <Scale className='size-5' />
                  </div>
                </CardHeader>
                <CardContent>
                  {rekonsiliasi ? (
                    <>
                      <div className='text-2xl font-bold tracking-tight text-foreground'>
                        {formatRupiah(saldoMengendapKas)}
                      </div>
                      <div className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground mt-1'>
                        <span
                          className={`inline-flex items-center font-semibold ${
                            isKasSeimbang ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isKasSeimbang ? 'Seimbang' : 'Ada Selisih'}
                        </span>
                        <span>
                          • Saldo mengendap (selisih {formatRupiah(selisihKas)})
                        </span>
                      </div>
                    </>
                  ) : rekonsiliasiStatus === 'loading' ? (
                    <>
                      <div className='text-2xl font-bold tracking-tight text-muted-foreground'>
                        —
                      </div>
                      <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                        <span>Memuat data rekonsiliasi...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className='text-2xl font-bold tracking-tight text-muted-foreground'>
                        —
                      </div>
                      <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                        <span className='inline-flex items-center font-semibold text-amber-600 dark:text-amber-400'>
                          Belum dimuat
                        </span>
                        <span>• Data rekonsiliasi tidak tersedia</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className='has-outline outline-2 outline-slate-200 dark:outline-slate-800 border-0 bg-card shadow-sm'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>
                    Status Rekonsiliasi Kas
                  </CardTitle>
                  <div className='has-border flex size-9 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'>
                    <Scale className='size-5' />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold tracking-tight text-foreground'>
                    Akses Terbatas
                  </div>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1 whitespace-nowrap overflow-hidden'>
                    <span className='inline-flex items-center font-semibold text-emerald-600 dark:text-emerald-400 shrink-0'>
                      Terbatas
                    </span>
                    <span className='truncate'>• Dikelola TU & Bendahara</span>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Card 4: Alert Status Stok Menipis */}
          <Card className='has-outline outline-2 outline-slate-200 dark:outline-slate-800 border-0 bg-card shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Peringatan Stok Barang
              </CardTitle>
              <div
                className={`has-border flex size-9 items-center justify-center rounded-lg ${
                  lowStockItems.length === 0
                    ? 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {lowStockItems.length === 0 ? (
                  <CheckCircle2 className='size-5' />
                ) : (
                  <AlertTriangle className='size-5' />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground'>
                {lowStockItems.length} <span className='text-base font-normal text-muted-foreground'>Item</span>
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span
                  className={`inline-flex items-center font-semibold ${
                    lowStockItems.length === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {lowStockItems.length === 0 ? 'Stok Aman' : 'Perlu Restock'}
                </span>
                <span>• {effectiveMenuItems.filter(i => i.stok === 0).length} Habis, {effectiveMenuItems.filter(i => i.stok > 0 && i.stok <= i.stok_minimum).length} Menipis</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Grid Konten Tengah: Grafik Penjualan 7 Hari & Alert Stok Menipis ===== */}
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
          {/* Kolom Kiri: Tren Penjualan 7 Hari Terakhir (Recharts) */}
          <Card className='col-span-1 lg:col-span-4 has-outline outline-2 outline-slate-200 dark:outline-slate-800 border-0 bg-card shadow-sm'>
            <CardHeader className='pb-3 space-y-3'>
              <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2'>
                <div>
                  <CardTitle className='text-base font-semibold'>
                    Tren Penjualan 7 Hari Terakhir
                  </CardTitle>
                  <CardDescription className='text-xs mt-0.5'>
                    Grafik omset harian kasir kantin dalam Rupiah (Rp) per kategori
                  </CardDescription>
                </div>
              </div>

              {/* Legend Kategori Dinamis: Grid Presisi 4 Kolom x 2 Baris yang Rapi */}
              {chartCategories.length > 3 ? (
                <div className='has-border grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/60'>
                  {chartCategories.map((cat) => (
                    <div
                      key={cat.key}
                      className='flex items-center gap-2 min-w-0'
                      title={cat.nama}
                    >
                      <span
                        className='size-2.5 rounded-full shrink-0 shadow-sm'
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className='font-medium text-muted-foreground truncate'>
                        {cat.nama}
                      </span>
                    </div>
                  ))}
                </div>
              ) : chartCategories.length > 0 ? (
                <div className='has-border flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/60'>
                  {chartCategories.map((cat) => (
                    <div
                      key={cat.key}
                      className='flex items-center gap-2'
                      title={cat.nama}
                    >
                      <span
                        className='size-2.5 rounded-full shrink-0 shadow-sm'
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
                <ResponsiveContainer
                  width='100%'
                  height='100%'
                  minHeight={310}
                  minWidth={250}
                  initialDimension={{ width: 500, height: 310 }}
                >
                  <BarChart
                    data={chartData}
                    maxBarSize={56}
                    barCategoryGap='16%'
                    margin={{ top: 10, right: 8, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' className='stroke-slate-200/80 dark:stroke-slate-800' vertical={false} />
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
                          return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
                        }
                        return `Rp ${(value / 1_000).toLocaleString('id-ID')} rb`
                      }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'currentColor', opacity: 0.04 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)
                          return (
                            <div className='has-border rounded-xl border border-slate-200 dark:border-slate-800 bg-popover/95 p-3 text-xs shadow-xl shadow-slate-950/10 backdrop-blur-sm min-w-[200px]'>
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
                              <div className='has-border mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-6 font-semibold text-foreground'>
                                <span>Total Omset</span>
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
          <Card className='col-span-1 lg:col-span-3 has-outline outline-2 outline-slate-200 dark:outline-slate-800 border-0 bg-card shadow-sm flex flex-col'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <AlertTriangle className='size-4 text-amber-500' />
                <span>Stok Menipis</span>
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Item dengan stok kurang dari atau sama dengan batas minimum sekolah
              </CardDescription>
            </CardHeader>
            <CardContent className='flex-1 p-0'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='text-xs bg-muted/40 hover:bg-muted/40'>
                      <TableHead className='w-12 text-center ps-4'>No.</TableHead>
                      <TableHead className='ps-2'>Menu</TableHead>
                      <TableHead className='text-center'>Sisa / Min</TableHead>
                      <TableHead className='text-center pe-6'>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.length === 0 ? (
                      <TableRow className='hover:bg-transparent'>
                        <TableCell colSpan={4} className='h-28 text-center text-xs text-muted-foreground px-6'>
                          <CheckCircle2 className='size-6 text-emerald-500 mx-auto mb-1 opacity-70' />
                          Semua stok menu dalam kondisi aman di atas batas minimum.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockItems.map((item, idx) => {
                        const isOut = item.stok === 0
                        return (
                          <TableRow key={item.id} className='text-xs hover:bg-transparent'>
                            <TableCell className='text-center font-mono text-xs text-muted-foreground ps-4 py-3'>
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
                              <Badge variant='outline' className={`rounded-full text-[10px] font-semibold px-2.5 py-0.5 uppercase tracking-wide shadow-none ${getStatusBadgeClass(isOut ? 'HABIS' : 'MENIPIS')}`}>
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

        {/* Transaksi Kasir Terkini */}
        <Card className='has-outline outline-2 outline-slate-200 dark:outline-slate-800 border-0 bg-card shadow-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base font-semibold'>
              Aktivitas Transaksi Kasir Terakhir
            </CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              Pencatatan real-time pembelian siswa & tamu via reader RFID USB
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='text-xs bg-muted/40 hover:bg-muted/40'>
                    <TableHead className='w-12 text-center ps-4'>No.</TableHead>
                    <TableHead className='w-[140px] ps-2'>Waktu</TableHead>
                    <TableHead className='w-[200px]'>Pelanggan</TableHead>
                    <TableHead>Item Menu</TableHead>
                    <TableHead className='text-right w-[140px]'>Total Belanja</TableHead>
                    <TableHead className='text-center w-[120px] pe-6'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.length === 0 ? (
                    <TableRow className='hover:bg-transparent'>
                      <TableCell colSpan={6} className='h-28 text-center text-xs text-muted-foreground px-6'>
                        <ShoppingCart className='size-6 text-muted-foreground/50 mx-auto mb-1 opacity-70' />
                        Belum ada aktivitas transaksi kasir hari ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTransactions.map((trx, idx) => (
                      <TableRow key={trx.id} className='text-xs hover:bg-transparent'>
                        <TableCell className='text-center font-mono text-xs text-muted-foreground ps-4 py-3'>
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
                          <Badge variant='outline' className={`rounded-full text-[10px] font-semibold px-2.5 py-0.5 uppercase tracking-wide shadow-none ${getStatusBadgeClass(trx.status)}`}>
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
      </Main>
    </>
  )
}

export default DashboardPage
