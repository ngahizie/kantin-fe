import React, { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Banknote,
  Receipt,
  Wallet,
  ArrowUpRight,
  Plus,
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
import apiClient from '@/lib/api-client'
import { formatTimeWithZone, formatNumber } from '@/lib/formatters'
import {
  formatRupiah,
  getLast7Days,
  getStatusBadgeClass,
} from '../dashboard-utils'
import type { RiwayatTransaksiKeseluruhanItem, RingkasanSaldoMengendap } from '@/features/laporan/types'

interface SetoranRekapRow {
  tanggal: string
  petugasNama: string
  totalSiswa: number
  status: string
}

interface ChartDayTopup {
  hari: string
  date: string
  nominal: number
  transaksi: number
}

export const TuDashboard: React.FC = () => {
  const [saldoMengendap, setSaldoMengendap] = useState<RingkasanSaldoMengendap | null>(null)
  const [setoranList, setSetoranList] = useState<SetoranRekapRow[]>([])
  const [recentTopups, setRecentTopups] = useState<RiwayatTransaksiKeseluruhanItem[]>([])
  const [topupWeeklyData, setTopupWeeklyData] = useState<ChartDayTopup[]>(() => {
    return getLast7Days().map((d) => ({
      hari: d.label,
      date: d.dateStr,
      nominal: 0,
      transaksi: 0,
    }))
  })
  const [todayTopupSum, setTodayTopupSum] = useState<number>(0)
  const [todayTopupCount, setTodayTopupCount] = useState<number>(0)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [saldoRes, trxRes, setoranRes] = await Promise.allSettled([
          typeof laporanApi?.getSaldoMengendap === 'function' ? laporanApi.getSaldoMengendap() : Promise.resolve(null),
          typeof laporanApi?.getRiwayatTransaksiKeseluruhan === 'function' ? laporanApi.getRiwayatTransaksiKeseluruhan({ batas: 100 }) : Promise.resolve([]),
          apiClient?.get ? apiClient.get('/api/saldo/setoran-tu/rekap').catch(() => null) : Promise.resolve(null),
        ])

        if (!isMounted) return

        if (saldoRes.status === 'fulfilled' && saldoRes.value) {
          setSaldoMengendap(saldoRes.value)
        }

        const sevenDays = getLast7Days()
        const todayStr = sevenDays[sevenDays.length - 1].dateStr

        if (trxRes.status === 'fulfilled' && Array.isArray(trxRes.value)) {
          const allTxs = trxRes.value
          const topups = allTxs.filter((t) => t.jenis === 'TOPUP_TUNAI' || t.jenis === 'TOPUP_ONLINE' || (t.jenis as string) === 'TOPUP')

          // Ambil 5 transaksi top-up terakhir
          setRecentTopups(topups.slice(0, 5))

          // Hitung akumulasi topup hari ini
          const todayTxs = topups.filter((t) => {
            if (!t.waktu) return false
            return t.waktu.startsWith(todayStr)
          })

          const sumToday = todayTxs.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
          setTodayTopupSum(sumToday)
          setTodayTopupCount(todayTxs.length)

          // Susun tren 7 hari terakhir untuk top-up
          const weeklyChart: ChartDayTopup[] = sevenDays.map((d) => {
            const dayTxs = topups.filter((t) => t.waktu && t.waktu.startsWith(d.dateStr))
            const dayNominal = dayTxs.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
            return {
              hari: d.label,
              date: d.dateStr,
              nominal: dayNominal,
              transaksi: dayTxs.length,
            }
          })
          setTopupWeeklyData(weeklyChart)
        }

        // Rekap Setoran TU
        if (setoranRes.status === 'fulfilled' && setoranRes.value?.data?.data) {
          const raw = setoranRes.value.data.data
          if (Array.isArray(raw)) {
            const mapped: SetoranRekapRow[] = raw.slice(0, 5).map((row: Record<string, unknown>) => ({
              tanggal: String(row.tanggal || ''),
              petugasNama: String(row.petugas_nama || row.petugasNama || 'Petugas TU'),
              totalSiswa: Number(row.total_nominal_siswa || row.totalSiswa || row.totalNominal || 0),
              status: String(row.status || 'MENUNGGU').toUpperCase(),
            }))
            setSetoranList(mapped)
          }
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

  const avgTopup = todayTopupCount > 0 ? Math.round(todayTopupSum / todayTopupCount) : 0
  const todaySetoran = setoranList[0]
  const isSetoranDisetor = todaySetoran?.status === 'DIKONFIRMASI' || todaySetoran?.status === 'TERKONFIRMASI'
  const nominalSetoranHariIni = todaySetoran ? todaySetoran.totalSiswa : todayTopupSum

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
            Dashboard Layanan TU
          </h1>
          <p className='text-sm text-muted-foreground'>
            Pantau layanan pengisian saldo tunai siswa, rekap setoran kas harian, dan mutasi saldo mengendap.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button asChild size='sm' className='gap-2'>
            <Link to='/tu/topup'>
              <Plus className='size-4' />
              <span>Isi Saldo Siswa</span>
            </Link>
          </Button>
          <Button asChild variant='outline' size='sm' className='gap-2'>
            <Link to='/tu/setoran'>
              <Receipt className='size-4' />
              <span>Setor Kas Harian</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ===== 4 Kartu Metrik Utama ===== */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <DashboardStatCard
          title='Top-Up Tunai Hari Ini'
          value={formatRupiah(todayTopupSum)}
          icon={Banknote}
          iconColorClass='border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
          badgeText='Kas Masuk TU'
          badgeColorClass='text-emerald-600 dark:text-emerald-400 font-semibold'
          subtext='• Tunai diterima hari ini'
          href='/tu/topup'
        />

        <DashboardStatCard
          title='Frekuensi Top-Up'
          value={todayTopupCount}
          unit='Trx'
          icon={ArrowUpRight}
          iconColorClass='border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
          badgeText='Rata-rata'
          badgeColorClass='text-blue-600 dark:text-blue-400 font-semibold'
          subtext={`• ${formatRupiah(avgTopup)} / top-up`}
        />

        <DashboardStatCard
          title='Status Setoran Kas TU'
          value={formatRupiah(nominalSetoranHariIni)}
          icon={Receipt}
          iconColorClass={
            isSetoranDisetor
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
          }
          badgeText={isSetoranDisetor ? 'Terkonfirmasi' : 'Perlu Setor'}
          badgeColorClass={
            isSetoranDisetor
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-amber-600 dark:text-amber-400 font-semibold'
          }
          subtext={
            isSetoranDisetor
              ? '• Diterima bendahara'
              : '• Siap disetor'
          }
          href='/tu/setoran'
        />

        <DashboardStatCard
          title='Total Saldo Mengendap'
          value={formatRupiah(saldoMengendap?.total ?? saldoMengendap?.saldoSiswa ?? 0)}
          icon={Wallet}
          iconColorClass='border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
          badgeText='Dana Titipan'
          badgeColorClass='text-purple-600 dark:text-purple-400 font-semibold'
          subtext={`• ${saldoMengendap?.jumlahSiswa ?? 0} siswa`}
          href='/laporan/saldo-mengendap'
        />
      </div>

      {/* ===== Grid Konten Tengah: Grafik Top-Up & Rekap Setoran TU ===== */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
        {/* Kolom Kiri: Tren Pengisian Saldo 7 Hari Terakhir */}
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base font-semibold'>
              Tren Pengisian Saldo 7 Hari Terakhir
            </CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              Akumulasi nominal rupiah (Rp) penerimaan top-up tunai siswa di layanan TU
            </CardDescription>
          </CardHeader>
          <CardContent className='ps-1 pe-4 pb-4 pt-3'>
            <div className='h-[310px] w-full min-h-[310px] min-w-0'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={topupWeeklyData}
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
                        const row = payload[0].payload as ChartDayTopup
                        return (
                          <div className='rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-lg backdrop-blur-sm min-w-[190px]'>
                            <p className='font-semibold text-foreground mb-1.5'>{label}</p>
                            <div className='flex items-center justify-between gap-6 py-0.5 text-muted-foreground'>
                              <span>Nominal Top-Up:</span>
                              <span className='font-bold tabular-nums text-foreground'>
                                {formatRupiah(row.nominal)}
                              </span>
                            </div>
                            <div className='flex items-center justify-between gap-6 py-0.5 text-muted-foreground'>
                              <span>Frekuensi:</span>
                              <span className='font-semibold tabular-nums text-foreground'>
                                {row.transaksi} Transaksi
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey='nominal'
                    fill='#10b981'
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Kolom Kanan: Rekapitulasi Setoran Kas TU */}
        <Card className='col-span-1 lg:col-span-3 flex flex-col overflow-hidden'>
          <CardHeader className='pb-3 flex flex-row items-start justify-between gap-2'>
            <div>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <Receipt className='size-4 text-primary' />
                <span>Status Setoran Kas TU</span>
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Rekapitulasi berkala penyerahan uang tunai ke bendahara sekolah
              </CardDescription>
            </div>
            <Link
              to='/tu/setoran'
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
                    <TableHead className='ps-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Tanggal</TableHead>
                    <TableHead className='text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Nominal</TableHead>
                    <TableHead className='text-center pe-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setoranList.length === 0 ? (
                    <TableRow className='hover:bg-transparent border-b-0'>
                      <TableCell colSpan={4} className='h-28 text-center text-xs text-muted-foreground px-6'>
                        <Receipt className='size-6 text-muted-foreground/50 mx-auto mb-1 opacity-70' />
                        Belum ada riwayat setoran kas TU.
                      </TableCell>
                    </TableRow>
                  ) : (
                    setoranList.map((st, idx) => (
                      <TableRow key={`${st.tanggal}-${idx}`} className='text-xs hover:bg-transparent border-b border-border last:border-b-0'>
                        <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums ps-4 py-3'>
                          {idx + 1}
                        </TableCell>
                        <TableCell className='ps-2 py-3 font-medium text-foreground'>
                          {st.tanggal}
                        </TableCell>
                        <TableCell className='text-right py-3 font-semibold text-foreground tabular-nums'>
                          {formatRupiah(st.totalSiswa)}
                        </TableCell>
                        <TableCell className='text-center pe-6 py-3'>
                          <Badge
                            variant='outline'
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClass(st.status)}`}
                          >
                            {st.status}
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

      {/* ===== Tabel Bawah: Aktivitas Layanan Top-Up Terakhir ===== */}
      <Card className='overflow-hidden'>
        <CardHeader className='pb-3 flex flex-row items-center justify-between gap-4'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Aktivitas Layanan Top-Up Terakhir
            </CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              Pencatatan real-time penerimaan saldo tunai siswa oleh petugas TU
            </CardDescription>
          </div>
          <Button asChild variant='ghost' size='sm' className='text-xs font-semibold text-primary'>
            <Link to='/tu/topup'>Buka Formulir Top-Up</Link>
          </Button>
        </CardHeader>
        <CardContent className='p-0 border-t border-border'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40 border-b border-border'>
                  <TableHead className='w-12 text-center ps-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                  <TableHead className='w-[140px] ps-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Waktu</TableHead>
                  <TableHead className='w-[220px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Nama Siswa</TableHead>
                  <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Petugas TU</TableHead>
                  <TableHead className='text-right w-[160px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Nominal Isi Saldo</TableHead>
                  <TableHead className='text-center w-[120px] pe-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTopups.length === 0 ? (
                  <TableRow className='hover:bg-transparent border-b-0'>
                    <TableCell colSpan={6} className='h-28 text-center text-xs text-muted-foreground px-6'>
                      <Banknote className='size-6 text-muted-foreground/50 mx-auto mb-1 opacity-70' />
                      Belum ada mutasi top-up tunai hari ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTopups.map((tx, idx) => (
                    <TableRow key={tx.id} className='text-xs hover:bg-transparent border-b border-border last:border-b-0'>
                      <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums ps-4 py-3'>
                        {idx + 1}
                      </TableCell>
                      <TableCell className='ps-2 py-3'>
                        <div className='font-medium text-foreground tabular-nums'>
                          {formatTimeWithZone(tx.waktu)}
                        </div>
                      </TableCell>
                      <TableCell className='py-3'>
                        <div className='font-semibold text-foreground'>
                          {tx.siswaNama || `Siswa #${tx.siswaId}`}
                        </div>
                        {tx.siswaNis && (
                          <div className='text-[10px] text-muted-foreground'>
                            NIS: {tx.siswaNis} {tx.siswaKelas ? `• ${tx.siswaKelas}` : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className='text-muted-foreground py-3'>
                        {tx.petugas && tx.petugas !== '-' ? tx.petugas : 'Petugas TU'}
                      </TableCell>
                      <TableCell className='text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums py-3'>
                        +{formatRupiah(Number(tx.nominal ?? 0))}
                      </TableCell>
                      <TableCell className='text-center pe-6 py-3'>
                        <Badge
                          variant='outline'
                          className='rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                        >
                          SUKSES
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
