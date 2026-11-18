import React, { useState, useEffect, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Store,
  ShieldCheck,
  ShoppingCart,
  RotateCcw,
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { pengaturanApi } from '@/features/pengaturan/api/pengaturan-api'
import apiClient from '@/lib/api-client'
import { formatTimeWithZone } from '@/lib/formatters'
import {
  formatRupiah,
  getLast7Days,
  getStatusBadgeClass,
} from '../dashboard-utils'
import type {
  RingkasanPenjualan,
  BarisPembatalanKasir,
} from '@/features/laporan/types'
import type { TitikKasir } from '@/features/pengaturan/types'

interface ActivityDayItem {
  hari: string
  date: string
  sukses: number
  batal: number
}

interface RawKontrolItem {
  siswaId: number | string
  diblokir?: boolean
  adaLimit?: boolean
  limitHarian?: number
}

export const AdminDashboard: React.FC = () => {
  const [penjualan, setPenjualan] = useState<RingkasanPenjualan | null>(null)
  const [titikKasirList, setTitikKasirList] = useState<TitikKasir[]>([])
  const [pembatalanList, setPembatalanList] = useState<BarisPembatalanKasir[]>([])
  const [totalSiswa, setTotalSiswa] = useState<number>(0)
  const [blockedCount, setBlockedCount] = useState<number>(0)
  const [limitCount, setLimitCount] = useState<number>(0)
  const [weeklyActivity, setWeeklyActivity] = useState<ActivityDayItem[]>(() => {
    return getLast7Days().map((d) => ({
      hari: d.label,
      date: d.dateStr,
      sukses: 0,
      batal: 0,
    }))
  })

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [titikRes, penjualanRes, pembatalanRes, siswaRes, trxRes] = await Promise.allSettled([
          typeof pengaturanApi?.getTitikKasirList === 'function' ? pengaturanApi.getTitikKasirList() : Promise.resolve([]),
          typeof laporanApi?.getPenjualan === 'function' ? laporanApi.getPenjualan() : Promise.resolve(null),
          typeof laporanApi?.getPembatalan === 'function' ? laporanApi.getPembatalan() : Promise.resolve([]),
          apiClient?.get ? apiClient.get('/api/siswa', { params: { batas: 100 } }).catch(() => null) : Promise.resolve(null),
          typeof laporanApi?.getRiwayatTransaksiKeseluruhan === 'function' ? laporanApi.getRiwayatTransaksiKeseluruhan({ batas: 100 }) : Promise.resolve([]),
        ])

        if (!isMounted) return

        if (titikRes.status === 'fulfilled' && Array.isArray(titikRes.value)) {
          setTitikKasirList(titikRes.value)
        }

        if (penjualanRes.status === 'fulfilled' && penjualanRes.value) {
          setPenjualan(penjualanRes.value)
        }

        if (pembatalanRes.status === 'fulfilled' && Array.isArray(pembatalanRes.value)) {
          setPembatalanList(pembatalanRes.value)
        }

        // Hitung kontrol siswa (blokir dan limit)
        if (siswaRes.status === 'fulfilled' && siswaRes.value?.data?.data) {
          const siswaData = siswaRes.value.data.data
          if (Array.isArray(siswaData)) {
            setTotalSiswa(siswaData.length)
            const ids = siswaData.map((s: Record<string, unknown>) => s.siswaId || s.siswa_id).filter(Boolean)
            if (ids.length > 0) {
              try {
                const bulkRes = await apiClient.get('/api/kontrol-kartu/bulk', {
                  params: { siswaIds: ids.join(',') },
                })
                const bulkList: RawKontrolItem[] = bulkRes.data?.data || []
                let blocked = 0
                let withLimit = 0
                bulkList.forEach((item) => {
                  if (item.diblokir) blocked++
                  if (item.adaLimit && (Number(item.limitHarian) || 0) > 0) withLimit++
                })
                setBlockedCount(blocked)
                setLimitCount(withLimit)
              } catch {
                // Ignore bulk fetch failure
              }
            }
          }
        }

        // Hitung tren 7 hari transaksi sukses vs batal
        const sevenDays = getLast7Days()
        if (trxRes.status === 'fulfilled' && Array.isArray(trxRes.value)) {
          const chartData: ActivityDayItem[] = sevenDays.map((d) => {
            const dayTxs = trxRes.value.filter((t) => t.waktu && t.waktu.startsWith(d.dateStr))
            const sukses = dayTxs.filter((t) => t.jenis === 'BELANJA').length
            const batal = dayTxs.filter((t) => t.jenis === 'VOID').length
            return {
              hari: d.label,
              date: d.dateStr,
              sukses,
              batal,
            }
          })
          setWeeklyActivity(chartData)
        }
      } catch {
        // Fallback handled gracefully
      }
    }

    void fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  const activeTitikCount = useMemo(
    () => titikKasirList.filter((t) => t.aktif).length,
    [titikKasirList]
  )
  const totalTitikCount = titikKasirList.length

  const todayStr = getLast7Days()[6].dateStr
  const todayPembatalan = useMemo(() => {
    return pembatalanList.filter((p) => {
      const w = p.voidAt || p.waktu
      return w && w.startsWith(todayStr)
    })
  }, [pembatalanList, todayStr])

  const todayBatalNominal = useMemo(() => {
    return todayPembatalan.reduce((sum, p) => sum + (Number(p.total) || 0), 0)
  }, [todayPembatalan])

  const todaySales = penjualan?.penjualanBersih ?? penjualan?.penjualanBruto ?? 0
  const todayTransactions = Number(penjualan?.jumlahTransaksi ?? 0)

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-foreground'>
          Dashboard Admin Sekolah
        </h1>
        <p className='text-sm text-muted-foreground'>
          Pantau operasional kantin, status perangkat titik kasir, pengawasan kartu siswa, dan audit pembatalan transaksi.
        </p>
      </div>

      {/* ===== 4 Kartu Metrik Utama ===== */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <DashboardStatCard
          title='Titik Kasir Aktif'
          value={activeTitikCount}
          unit={`/ ${totalTitikCount} Perangkat`}
          icon={Store}
          iconColorClass='border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
          badgeText={activeTitikCount > 0 ? 'Operasional' : 'Belum Aktif'}
          badgeColorClass={
            activeTitikCount > 0
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-amber-600 dark:text-amber-400 font-semibold'
          }
          subtext={`• ${totalTitikCount - activeTitikCount} Nonaktif`}
          href='/pengaturan/titik-kasir'
        />

        <DashboardStatCard
          title='Pengawasan Kartu Siswa'
          value={totalSiswa}
          unit='Siswa'
          icon={ShieldCheck}
          iconColorClass='border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
          badgeText={blockedCount > 0 ? `${blockedCount} Diblokir` : 'Semua Aktif'}
          badgeColorClass={
            blockedCount > 0
              ? 'text-rose-600 dark:text-rose-400 font-semibold'
              : 'text-emerald-600 dark:text-emerald-400 font-semibold'
          }
          subtext={`• ${limitCount} Limit Jajan Aktif`}
          href='/kontrol-siswa'
        />

        <DashboardStatCard
          title='Total Transaksi Hari Ini'
          value={todayTransactions}
          unit='Trx'
          icon={ShoppingCart}
          iconColorClass='border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300'
          badgeText='Omset Terlayani'
          badgeColorClass='text-blue-600 dark:text-blue-400 font-semibold'
          subtext={`• ${formatRupiah(todaySales)} omset`}
        />

        <DashboardStatCard
          title='Pembatalan Kasir (Refund)'
          value={todayPembatalan.length}
          unit='Trx'
          icon={RotateCcw}
          iconColorClass='border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
          badgeText={todayPembatalan.length > 0 ? 'Ada Pembatalan' : 'Nihil Batal'}
          badgeColorClass={
            todayPembatalan.length > 0
              ? 'text-rose-600 dark:text-rose-400 font-semibold'
              : 'text-emerald-600 dark:text-emerald-400 font-semibold'
          }
          subtext={`• ${formatRupiah(todayBatalNominal)} dibatalkan`}
          href='/laporan/pembatalan'
        />
      </div>

      {/* ===== Grid Konten Tengah: Grafik Transaksi & Status Titik Kasir ===== */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
        {/* Kolom Kiri: Tren Aktivitas Transaksi & Pembatalan 7 Hari */}
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader className='pb-3 space-y-2'>
            <div>
              <CardTitle className='text-base font-semibold'>
                Tren Transaksi & Pembatalan 7 Hari
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Perbandingan frekuensi transaksi sukses dengan transaksi yang dibatalkan kasir (refund)
              </CardDescription>
            </div>
            <div className='flex items-center gap-4 text-xs pt-2 border-t border-border'>
              <div className='flex items-center gap-1.5'>
                <span className='size-2.5 rounded-full bg-blue-500 shrink-0' />
                <span className='font-medium text-muted-foreground'>Transaksi Sukses</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='size-2.5 rounded-full bg-rose-500 shrink-0' />
                <span className='font-medium text-muted-foreground'>Pembatalan (Refund)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className='ps-1 pe-4 pb-4 pt-3'>
            <div className='h-[310px] w-full min-h-[310px] min-w-0'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={weeklyActivity}
                  maxBarSize={48}
                  barCategoryGap='20%'
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
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'currentColor', opacity: 0.04 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const row = payload[0].payload as ActivityDayItem
                        return (
                          <div className='rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-lg backdrop-blur-sm min-w-[190px]'>
                            <p className='font-semibold text-foreground mb-1.5'>{label}</p>
                            <div className='flex items-center justify-between gap-6 py-0.5 text-muted-foreground'>
                              <span className='flex items-center gap-1.5'>
                                <span className='size-2 rounded-full bg-blue-500' />
                                Transaksi Sukses:
                              </span>
                              <span className='font-bold tabular-nums text-foreground'>
                                {row.sukses} Trx
                              </span>
                            </div>
                            <div className='flex items-center justify-between gap-6 py-0.5 text-muted-foreground'>
                              <span className='flex items-center gap-1.5'>
                                <span className='size-2 rounded-full bg-rose-500' />
                                Pembatalan (Refund):
                              </span>
                              <span className='font-semibold tabular-nums text-rose-600 dark:text-rose-400'>
                                {row.batal} Trx
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey='sukses'
                    name='sukses'
                    fill='#3b82f6'
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey='batal'
                    name='batal'
                    fill='#ef4444'
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Kolom Kanan: Status Titik Kasir */}
        <Card className='col-span-1 lg:col-span-3 flex flex-col overflow-hidden'>
          <CardHeader className='pb-3 flex flex-row items-start justify-between gap-2'>
            <div>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <Store className='size-4 text-primary' />
                <span>Status Titik Kasir</span>
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Perangkat kasir terdaftar dan status operasionalnya saat ini
              </CardDescription>
            </div>
            <Link
              to='/pengaturan/titik-kasir'
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
                    <TableHead className='ps-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Titik Kasir</TableHead>
                    <TableHead className='text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Kode</TableHead>
                    <TableHead className='text-center pe-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titikKasirList.length === 0 ? (
                    <TableRow className='hover:bg-transparent border-b-0'>
                      <TableCell colSpan={4} className='h-28 text-center text-xs text-muted-foreground px-6'>
                        <Store className='size-6 text-muted-foreground/50 mx-auto mb-1 opacity-70' />
                        Belum ada titik kasir terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    titikKasirList.map((tk, idx) => (
                      <TableRow key={tk.id} className='text-xs hover:bg-transparent border-b border-border last:border-b-0'>
                        <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums ps-4 py-3'>
                          {idx + 1}
                        </TableCell>
                        <TableCell className='ps-2 py-3 font-semibold text-foreground'>
                          {tk.nama}
                        </TableCell>
                        <TableCell className='text-center py-3 font-mono text-xs text-muted-foreground tabular-nums'>
                          {tk.kode}
                        </TableCell>
                        <TableCell className='text-center pe-6 py-3'>
                          <Badge
                            variant='outline'
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClass(
                              tk.aktif ? 'AKTIF' : 'NONAKTIF'
                            )}`}
                          >
                            {tk.aktif ? 'AKTIF' : 'NONAKTIF'}
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

      {/* ===== Tabel Bawah: Aktivitas Pembatalan Kasir (Refund) Terkini ===== */}
      <Card className='overflow-hidden'>
        <CardHeader className='pb-3 flex flex-row items-center justify-between gap-4'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Aktivitas Pembatalan Kasir (Refund) Terkini
            </CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              Audit transaksi kasir yang dibatalkan beserta alasan dan waktu pembatalan
            </CardDescription>
          </div>
          <Button asChild variant='ghost' size='sm' className='text-xs font-semibold text-primary'>
            <Link to='/laporan/pembatalan'>Buka Laporan Pembatalan</Link>
          </Button>
        </CardHeader>
        <CardContent className='p-0 border-t border-border'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40 border-b border-border'>
                  <TableHead className='w-12 text-center ps-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                  <TableHead className='w-[140px] ps-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Waktu Batal</TableHead>
                  <TableHead className='w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Siswa</TableHead>
                  <TableHead className='w-[160px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Titik Kasir</TableHead>
                  <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Alasan Pembatalan</TableHead>
                  <TableHead className='text-right w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Nominal</TableHead>
                  <TableHead className='text-center w-[120px] pe-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pembatalanList.length === 0 ? (
                  <TableRow className='hover:bg-transparent border-b-0'>
                    <TableCell colSpan={7} className='h-28 text-center text-xs text-muted-foreground px-6'>
                      <RotateCcw className='size-6 text-muted-foreground/50 mx-auto mb-1 opacity-70' />
                      Belum ada pembatalan transaksi kasir yang tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  pembatalanList.slice(0, 5).map((pb, idx) => (
                    <TableRow key={pb.transaksiId || idx} className='text-xs hover:bg-transparent border-b border-border last:border-b-0'>
                      <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums ps-4 py-3'>
                        {idx + 1}
                      </TableCell>
                      <TableCell className='ps-2 py-3'>
                        <div className='font-medium text-foreground tabular-nums'>
                          {formatTimeWithZone(pb.voidAt || pb.waktu)}
                        </div>
                      </TableCell>
                      <TableCell className='py-3'>
                        <div className='font-semibold text-foreground'>
                          {pb.siswaNama || (pb.siswaId ? `Siswa #${pb.siswaId}` : 'Siswa')}
                        </div>
                        {pb.siswaNis && (
                          <div className='text-[10px] text-muted-foreground'>
                            NIS: {pb.siswaNis} {pb.siswaKelas ? `• ${pb.siswaKelas}` : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className='text-muted-foreground py-3 font-medium'>
                        {pb.titikKasirNama || (pb.titikKasirId ? `POS #${pb.titikKasirId}` : 'POS Kantin')}
                      </TableCell>
                      <TableCell className='text-muted-foreground py-3'>
                        <span className='italic text-foreground'>&quot;{pb.alasanVoid || 'Salah ketik / Batal'}&quot;</span>
                      </TableCell>
                      <TableCell className='text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums py-3'>
                        {formatRupiah(Number(pb.total || 0))}
                      </TableCell>
                      <TableCell className='text-center pe-6 py-3'>
                        <Badge
                          variant='outline'
                          className='rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                        >
                          REFUND
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
