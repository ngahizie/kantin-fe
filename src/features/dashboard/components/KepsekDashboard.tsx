import React, { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Banknote,
  Scale,
  Wallet,
  TrendingUp,
  ShoppingCart,
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
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DashboardStatCard } from './DashboardStatCard'
import { laporanApi } from '@/features/laporan/api/laporan-api'
import { formatTimeWithZone } from '@/lib/formatters'
import {
  formatRupiah,
  getLast7Days,
  getStatusBadgeClass,
  type RecentTransactionDisplayItem,
} from '../dashboard-utils'
import type {
  RingkasanPenjualan,
  RingkasanRekonsiliasi,
  RingkasanSaldoMengendap,
  BarisPenjualanKategori,
} from '@/features/laporan/types'

interface OmsetDayItem {
  hari: string
  date: string
  omset: number
}

export const KepsekDashboard: React.FC = () => {
  const [penjualan, setPenjualan] = useState<RingkasanPenjualan | null>(null)
  const [rekonsiliasi, setRekonsiliasi] = useState<RingkasanRekonsiliasi | null>(null)
  const [rekonsiliasiStatus, setRekonsiliasiStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [saldoMengendap, setSaldoMengendap] = useState<RingkasanSaldoMengendap | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionDisplayItem[]>([])
  const [weeklyOmsetData, setWeeklyOmsetData] = useState<OmsetDayItem[]>(() => {
    return getLast7Days().map((d) => ({
      hari: d.label,
      date: d.dateStr,
      omset: 0,
    }))
  })

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [penjualanRes, rekonRes, saldoRes, trxRes] = await Promise.allSettled([
          typeof laporanApi.getPenjualan === 'function' ? laporanApi.getPenjualan() : Promise.resolve(null),
          typeof laporanApi.getRekonsiliasi === 'function' ? laporanApi.getRekonsiliasi(undefined, { silent: true }) : Promise.resolve(null),
          typeof laporanApi.getSaldoMengendap === 'function' ? laporanApi.getSaldoMengendap() : Promise.resolve(null),
          typeof laporanApi.getRiwayatTransaksiKeseluruhan === 'function' ? laporanApi.getRiwayatTransaksiKeseluruhan({ batas: 25 }) : Promise.resolve([]),
        ])

        if (!isMounted) return

        if (penjualanRes.status === 'fulfilled' && penjualanRes.value) {
          setPenjualan(penjualanRes.value)
        }

        if (rekonRes.status === 'fulfilled' && rekonRes.value) {
          setRekonsiliasi(rekonRes.value)
          setRekonsiliasiStatus('loaded')
        } else {
          setRekonsiliasi(null)
          setRekonsiliasiStatus('error')
        }

        if (saldoRes.status === 'fulfilled' && saldoRes.value) {
          setSaldoMengendap(saldoRes.value)
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

        // Hitung omset mingguan
        const sevenDays = getLast7Days()
        const weeklyPromises = sevenDays.map((d) =>
          laporanApi
            .getPenjualanPerKategori({ tanggal: d.dateStr })
            .catch(() => [])
        )
        const weeklyResults = await Promise.allSettled(weeklyPromises)

        const dynamicChartData: OmsetDayItem[] = sevenDays.map((day, idx) => {
          let dayTotal = 0
          const dayRes = weeklyResults[idx]
          if (dayRes.status === 'fulfilled' && Array.isArray(dayRes.value)) {
            dayRes.value.forEach((item: BarisPenjualanKategori) => {
              const amount = Number(item.total ?? item.penjualanBersih ?? 0)
              dayTotal += amount
            })
          }
          return {
            hari: day.label,
            date: day.dateStr,
            omset: dayTotal,
          }
        })

        if (!isMounted) return
        setWeeklyOmsetData(dynamicChartData)
      } catch {
        if (isMounted) {
          setRekonsiliasiStatus('error')
        }
      }
    }

    void fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  const todaySales = penjualan?.penjualanBersih ?? penjualan?.penjualanBruto ?? 0
  const todayTransactions = Number(penjualan?.jumlahTransaksi ?? 0)
  const todayBruto = penjualan?.penjualanBruto ?? todaySales
  const todayRefund = penjualan?.nilaiRefund ?? 0
  const todayHpp = penjualan?.totalModal ?? Math.round(todaySales * 0.65)
  const todayLabaKotor = penjualan?.laba ?? (todaySales - todayHpp)
  const todayMargin = penjualan?.marginPersen ?? (todaySales > 0 ? Math.round((todayLabaKotor / todaySales) * 100) : 0)

  const saldoMengendapKas = rekonsiliasi?.saldoMengendap ?? saldoMengendap?.total ?? saldoMengendap?.saldoSiswa ?? 0
  const selisihKas = rekonsiliasi?.selisih ?? 0
  const isKasSeimbang = Boolean(rekonsiliasi?.seimbang)

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-foreground'>
          Dashboard Kepala Sekolah
        </h1>
        <p className='text-sm text-muted-foreground'>
          Ringkasan eksekutif kinerja finansial, perputaran omset, margin laba kotor, dan kesehatan kas kantin sekolah.
        </p>
      </div>

      {/* ===== 4 Kartu Metrik Utama ===== */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <DashboardStatCard
          title='Total Penjualan Hari Ini'
          value={formatRupiah(todaySales)}
          icon={Banknote}
          iconColorClass='border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'
          badgeText='Omset Bersih'
          badgeColorClass='text-emerald-600 dark:text-emerald-400 font-semibold'
          subtext={`• ${todayTransactions} Transaksi kantin`}
          href='/laporan/penjualan'
        />

        <DashboardStatCard
          title='Laba Kotor Kantin'
          value={formatRupiah(todayLabaKotor)}
          icon={TrendingUp}
          iconColorClass='border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
          badgeText={`Margin ${todayMargin}%`}
          badgeColorClass='text-emerald-600 dark:text-emerald-400 font-semibold'
          subtext={`• HPP Modal ${formatRupiah(todayHpp)}`}
          href='/laporan/laba-kotor'
        />

        <DashboardStatCard
          title='Kesehatan Kas (Cek Selisih)'
          value={
            rekonsiliasiStatus === 'loading'
              ? '—'
              : formatRupiah(saldoMengendapKas)
          }
          icon={Scale}
          iconColorClass={
            !rekonsiliasi
              ? rekonsiliasiStatus === 'error'
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border-border bg-muted/50 text-muted-foreground'
              : isKasSeimbang
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
          }
          badgeText={
            rekonsiliasi
              ? isKasSeimbang
                ? 'Seimbang'
                : 'Ada Selisih'
              : rekonsiliasiStatus === 'loading'
                ? 'Memuat...'
                : 'Belum dimuat'
          }
          badgeColorClass={
            isKasSeimbang
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-rose-600 dark:text-rose-400 font-semibold'
          }
          subtext={
            rekonsiliasi
              ? `• Selisih ${formatRupiah(selisihKas)}`
              : '• Data audit tidak tersedia'
          }
          href='/laporan/rekonsiliasi'
        />

        <DashboardStatCard
          title='Total Saldo Siswa Tersimpan'
          value={formatRupiah(saldoMengendap?.total ?? saldoMengendap?.saldoSiswa ?? saldoMengendapKas)}
          icon={Wallet}
          iconColorClass='border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
          badgeText='Plafon Dana Siswa'
          badgeColorClass='text-purple-600 dark:text-purple-400 font-semibold'
          subtext={`• ${saldoMengendap?.jumlahSiswa ?? 0} Siswa terdaftar`}
          href='/laporan/saldo-mengendap'
        />
      </div>

      {/* ===== Grid Konten Tengah: Grafik Omset & Ringkasan Performa Finansial ===== */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
        {/* Kolom Kiri: Tren Omset 7 Hari Terakhir */}
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base font-semibold'>
              Tren Pertumbuhan Omset 7 Hari
            </CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              Akumulasi penjualan bersih harian kantin sekolah (Rupiah)
            </CardDescription>
          </CardHeader>
          <CardContent className='ps-1 pe-4 pb-4 pt-3'>
            <div className='h-[310px] w-full min-h-[310px] min-w-0'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={weeklyOmsetData}
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
                        return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
                      }
                      return `Rp ${(value / 1_000).toLocaleString('id-ID')} rb`
                    }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'currentColor', opacity: 0.04 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload as OmsetDayItem
                        return (
                          <div className='rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-lg backdrop-blur-sm min-w-[190px]'>
                            <p className='font-semibold text-foreground mb-1.5'>{label}</p>
                            <div className='flex items-center justify-between gap-6 py-0.5 text-muted-foreground'>
                              <span>Omset Penjualan:</span>
                              <span className='font-bold tabular-nums text-foreground'>
                                {formatRupiah(row.omset)}
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey='omset'
                    fill='#0284c7'
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Kolom Kanan: Ringkasan Kinerja Keuangan */}
        <Card className='col-span-1 lg:col-span-3 flex flex-col overflow-hidden'>
          <CardHeader className='pb-3 flex flex-row items-start justify-between gap-2'>
            <div>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <TrendingUp className='size-4 text-primary' />
                <span>Ringkasan Keuangan</span>
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Struktur pendapatan, beban modal (HPP), dan laba kotor hari ini
              </CardDescription>
            </div>
            <Link
              to='/laporan/laba-kotor'
              className='text-xs font-semibold text-primary hover:underline shrink-0 pt-0.5'
            >
              Laporan
            </Link>
          </CardHeader>
          <CardContent className='flex-1 p-4 border-t border-border space-y-3'>
            <div className='rounded-lg border border-border bg-muted/30 p-3 space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Penjualan Bruto:</span>
                <span className='font-semibold tabular-nums text-foreground'>
                  {formatRupiah(todayBruto)}
                </span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Pengembalian / Batal:</span>
                <span className='font-semibold tabular-nums text-rose-600 dark:text-rose-400'>
                  -{formatRupiah(todayRefund)}
                </span>
              </div>
              <div className='flex items-center justify-between text-xs pt-1 border-t border-border/80'>
                <span className='font-medium text-foreground'>Penjualan Bersih:</span>
                <span className='font-bold tabular-nums text-foreground'>
                  {formatRupiah(todaySales)}
                </span>
              </div>
            </div>

            <div className='rounded-lg border border-border bg-muted/30 p-3 space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Beban Modal (HPP):</span>
                <span className='font-semibold tabular-nums text-foreground'>
                  {formatRupiah(todayHpp)}
                </span>
              </div>
              <div className='flex items-center justify-between text-xs pt-1 border-t border-border/80'>
                <span className='font-medium text-emerald-600 dark:text-emerald-400'>Laba Kotor Kantin:</span>
                <span className='font-bold tabular-nums text-emerald-600 dark:text-emerald-400'>
                  {formatRupiah(todayLabaKotor)}
                </span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Margin Keuntungan:</span>
                <Badge
                  variant='outline'
                  className='rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                >
                  {todayMargin}% Margin
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Tabel Bawah: Aktivitas Transaksi Kantin Terkini ===== */}
      <Card className='overflow-hidden'>
        <CardHeader className='pb-3 flex flex-row items-center justify-between gap-4'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Aktivitas Transaksi Kantin Terkini
            </CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              Pencatatan real-time pembelian siswa via reader RFID USB
            </CardDescription>
          </div>
          <Button asChild variant='ghost' size='sm' className='text-xs font-semibold text-primary'>
            <Link to='/laporan/penjualan'>Buka Laporan Penjualan</Link>
          </Button>
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
