import React, { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Banknote,
  Scale,
  Wallet,
  ReceiptText,
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
import type {
  RingkasanPenjualan,
  RingkasanRekonsiliasi,
  RingkasanSaldoMengendap,
  RiwayatTransaksiKeseluruhanItem,
} from '@/features/laporan/types'

interface CashFlowDayItem {
  hari: string
  date: string
  penjualan: number
  topup: number
}

export const BendaharaDashboard: React.FC = () => {
  const [penjualan, setPenjualan] = useState<RingkasanPenjualan | null>(null)
  const [rekonsiliasi, setRekonsiliasi] = useState<RingkasanRekonsiliasi | null>(null)
  const [rekonsiliasiStatus, setRekonsiliasiStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [saldoMengendap, setSaldoMengendap] = useState<RingkasanSaldoMengendap | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RiwayatTransaksiKeseluruhanItem[]>([])
  const [kasMasukTotal, setKasMasukTotal] = useState<number>(0)
  const [cashFlowData, setCashFlowData] = useState<CashFlowDayItem[]>(() => {
    return getLast7Days().map((d) => ({
      hari: d.label,
      date: d.dateStr,
      penjualan: 0,
      topup: 0,
    }))
  })

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const [penjualanRes, rekonRes, saldoRes, trxRes, setoranRes] = await Promise.allSettled([
          typeof laporanApi.getPenjualan === 'function' ? laporanApi.getPenjualan() : Promise.resolve(null),
          typeof laporanApi.getRekonsiliasi === 'function' ? laporanApi.getRekonsiliasi(undefined, { silent: true }) : Promise.resolve(null),
          typeof laporanApi.getSaldoMengendap === 'function' ? laporanApi.getSaldoMengendap() : Promise.resolve(null),
          typeof laporanApi.getRiwayatTransaksiKeseluruhan === 'function' ? laporanApi.getRiwayatTransaksiKeseluruhan({ batas: 25 }) : Promise.resolve([]),
          apiClient?.get ? apiClient.get('/api/saldo/setoran-tu/rekap').catch(() => null) : Promise.resolve(null),
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

        const sevenDays = getLast7Days()

        if (trxRes.status === 'fulfilled' && Array.isArray(trxRes.value)) {
          setRecentTransactions(trxRes.value.slice(0, 5))

          // Hitung tren harian arus kas (Penjualan vs Top-up)
          const weeklyChart: CashFlowDayItem[] = sevenDays.map((d) => {
            const dayTxs = trxRes.value.filter((t) => t.waktu && t.waktu.startsWith(d.dateStr))
            const daySales = dayTxs
              .filter((t) => t.jenis === 'BELANJA')
              .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
            const dayTopup = dayTxs
              .filter((t) => t.jenis === 'TOPUP_TUNAI' || t.jenis === 'TOPUP_ONLINE' || (t.jenis as string) === 'TOPUP')
              .reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)

            return {
              hari: d.label,
              date: d.dateStr,
              penjualan: daySales,
              topup: dayTopup,
            }
          })
          setCashFlowData(weeklyChart)
        }

        // Hitung total setoran terverifikasi
        if (setoranRes.status === 'fulfilled' && setoranRes.value?.data?.data) {
          const raw = setoranRes.value.data.data
          if (Array.isArray(raw)) {
            const confirmedTotal = raw
              .filter((r: Record<string, unknown>) => {
                const s = String(r.status || '').toUpperCase()
                return s === 'DIKONFIRMASI' || s === 'TERKONFIRMASI'
              })
              .reduce((sum: number, r: Record<string, unknown>) => {
                return sum + (Number(r.total_nominal_siswa || r.totalSiswa || 0))
              }, 0)
            setKasMasukTotal(confirmedTotal)
          }
        }
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
  const saldoMengendapKas = rekonsiliasi?.saldoMengendap ?? saldoMengendap?.total ?? saldoMengendap?.saldoSiswa ?? 0
  const selisihKas = rekonsiliasi?.selisih ?? 0
  const isKasSeimbang = Boolean(rekonsiliasi?.seimbang)

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-foreground'>
          Dashboard Bendahara Sekolah
        </h1>
        <p className='text-sm text-muted-foreground'>
          Pantau rekonsiliasi kas kantin, verifikasi setoran kas, total saldo mengendap, dan arus kas harian.
        </p>
      </div>

      {/* ===== 4 Kartu Metrik Utama ===== */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch'>
        <DashboardStatCard
          title='Status Rekonsiliasi Kas'
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
              : '• Data rekonsiliasi tidak tersedia'
          }
          href='/laporan/rekonsiliasi'
        />

        <DashboardStatCard
          title='Penjualan Hari Ini'
          value={formatRupiah(todaySales)}
          icon={Banknote}
          iconColorClass='border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'
          badgeText='Omset Bersih'
          badgeColorClass='text-emerald-600 dark:text-emerald-400 font-semibold'
          subtext={`• ${todayTransactions} transaksi`}
          href='/laporan/penjualan'
        />

        <DashboardStatCard
          title='Kas Terverifikasi'
          value={formatRupiah(kasMasukTotal > 0 ? kasMasukTotal : todaySales)}
          icon={ReceiptText}
          iconColorClass='border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300'
          badgeText='Terkonfirmasi'
          badgeColorClass='text-indigo-600 dark:text-indigo-400 font-semibold'
          subtext='• Setoran kas masuk'
          href='/tu/setoran'
        />

        <DashboardStatCard
          title='Total Saldo Mengendap'
          value={formatRupiah(saldoMengendap?.total ?? saldoMengendap?.saldoSiswa ?? saldoMengendapKas)}
          icon={Wallet}
          iconColorClass='border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
          badgeText='Titipan Dana'
          badgeColorClass='text-purple-600 dark:text-purple-400 font-semibold'
          subtext={`• ${saldoMengendap?.jumlahSiswa ?? 0} siswa`}
          href='/laporan/saldo-mengendap'
        />
      </div>

      {/* ===== Grid Konten Tengah: Grafik Arus Kas & Ringkasan Rekonsiliasi ===== */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
        {/* Kolom Kiri: Tren Arus Kas 7 Hari Terakhir */}
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader className='pb-3 space-y-2'>
            <div>
              <CardTitle className='text-base font-semibold'>
                Arus Kas 7 Hari Terakhir
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Perbandingan harian antara Omset Penjualan Kantin dan Penerimaan Saldo Siswa
              </CardDescription>
            </div>
            <div className='flex items-center gap-4 text-xs pt-2 border-t border-border'>
              <div className='flex items-center gap-1.5'>
                <span className='size-2.5 rounded-full bg-sky-500 shrink-0' />
                <span className='font-medium text-muted-foreground'>Penjualan Kantin</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='size-2.5 rounded-full bg-emerald-500 shrink-0' />
                <span className='font-medium text-muted-foreground'>Top-Up Siswa</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className='ps-1 pe-4 pb-4 pt-3'>
            <div className='h-[310px] w-full min-h-[310px] min-w-0'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={cashFlowData}
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
                        const row = payload[0].payload as CashFlowDayItem
                        return (
                          <div className='rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-lg backdrop-blur-sm min-w-[200px]'>
                            <p className='font-semibold text-foreground mb-1.5'>{label}</p>
                            <div className='flex items-center justify-between gap-6 py-0.5 text-muted-foreground'>
                              <span className='flex items-center gap-1.5'>
                                <span className='size-2 rounded-full bg-sky-500' />
                                Penjualan Kantin:
                              </span>
                              <span className='font-bold tabular-nums text-foreground'>
                                {formatRupiah(row.penjualan)}
                              </span>
                            </div>
                            <div className='flex items-center justify-between gap-6 py-0.5 text-muted-foreground'>
                              <span className='flex items-center gap-1.5'>
                                <span className='size-2 rounded-full bg-emerald-500' />
                                Top-Up Siswa:
                              </span>
                              <span className='font-semibold tabular-nums text-foreground'>
                                {formatRupiah(row.topup)}
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey='penjualan'
                    name='penjualan'
                    fill='#0ea5e9'
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey='topup'
                    name='topup'
                    fill='#10b981'
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Kolom Kanan: Ringkasan Rekonsiliasi Kas */}
        <Card className='col-span-1 lg:col-span-3 flex flex-col overflow-hidden'>
          <CardHeader className='pb-3 flex flex-row items-start justify-between gap-2'>
            <div>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <Scale className='size-4 text-primary' />
                <span>Ringkasan Cek Selisih</span>
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Audit kecocokan saldo fisik dengan ledger transaksi sistem
              </CardDescription>
            </div>
            <Link
              to='/laporan/rekonsiliasi'
              className='text-xs font-semibold text-primary hover:underline shrink-0 pt-0.5'
            >
              Rincian
            </Link>
          </CardHeader>
          <CardContent className='flex-1 p-4 border-t border-border space-y-3'>
            <div className='rounded-lg border border-border bg-muted/30 p-3 space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Saldo Mengendap:</span>
                <span className='font-bold tabular-nums text-foreground'>
                  {formatRupiah(saldoMengendapKas)}
                </span>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Status Audit:</span>
                <Badge
                  variant='outline'
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClass(
                    isKasSeimbang ? 'SEIMBANG' : 'ADA SELISIH'
                  )}`}
                >
                  {isKasSeimbang ? 'SEIMBANG' : 'ADA SELISIH'}
                </Badge>
              </div>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>Nominal Selisih Kas:</span>
                <span
                  className={`font-semibold tabular-nums ${
                    selisihKas === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatRupiah(selisihKas)}
                </span>
              </div>
            </div>

            <div className='text-xs text-muted-foreground leading-relaxed'>
              {isKasSeimbang ? (
                <p>
                  ✅ Kas sekolah dan titipan saldo siswa dalam kondisi <strong className='text-emerald-600 dark:text-emerald-400'>seimbang</strong> tanpa indikasi selisih buku.
                </p>
              ) : (
                <p>
                  ⚠️ Terdeteksi selisih sebesar <strong className='text-rose-600 dark:text-rose-400'>{formatRupiah(selisihKas)}</strong>. Buka halaman Cek Selisih Uang untuk melakukan audit dan penyesuaian saldo.
                </p>
              )}
            </div>

            <div className='pt-2 flex gap-2'>
              <Button asChild variant='outline' size='sm' className='w-full text-xs'>
                <Link to='/saldo/koreksi'>Penyesuaian Saldo</Link>
              </Button>
              <Button asChild size='sm' className='w-full text-xs'>
                <Link to='/laporan/rekonsiliasi'>Audit Kas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Tabel Bawah: Aktivitas Transaksi Finansial Terakhir ===== */}
      <Card className='overflow-hidden'>
        <CardHeader className='pb-3 flex flex-row items-center justify-between gap-4'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Aktivitas Mutasi Keuangan Terkini
            </CardTitle>
            <CardDescription className='text-xs mt-0.5'>
              Pencatatan mutasi saldo keuangan (Top-Up, Belanja, Refund, dan Pembatalan)
            </CardDescription>
          </div>
          <Button asChild variant='ghost' size='sm' className='text-xs font-semibold text-primary'>
            <Link to='/laporan/riwayat-keseluruhan'>Buka Riwayat Lengkap</Link>
          </Button>
        </CardHeader>
        <CardContent className='p-0 border-t border-border'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40 border-b border-border'>
                  <TableHead className='w-12 text-center ps-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                  <TableHead className='w-[140px] ps-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Waktu</TableHead>
                  <TableHead className='w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Tipe Mutasi</TableHead>
                  <TableHead className='w-[220px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Subjek / Siswa</TableHead>
                  <TableHead className='text-right w-[160px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Nominal (Rp)</TableHead>
                  <TableHead className='text-center w-[120px] pe-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow className='hover:bg-transparent border-b-0'>
                    <TableCell colSpan={6} className='h-28 text-center text-xs text-muted-foreground px-6'>
                      <Banknote className='size-6 text-muted-foreground/50 mx-auto mb-1 opacity-70' />
                      Belum ada mutasi keuangan hari ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((tx, idx) => {
                    const isMasuk = tx.arah === 'KREDIT' || tx.jenis === 'TOPUP_TUNAI' || tx.jenis === 'TOPUP_ONLINE' || (tx.jenis as string) === 'TOPUP'
                    return (
                      <TableRow key={tx.id} className='text-xs hover:bg-transparent border-b border-border last:border-b-0'>
                        <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums ps-4 py-3'>
                          {idx + 1}
                        </TableCell>
                        <TableCell className='ps-2 py-3'>
                          <div className='font-medium text-foreground tabular-nums'>
                            {formatTimeWithZone(tx.waktu)}
                          </div>
                        </TableCell>
                        <TableCell className='py-3 font-semibold text-foreground'>
                          <Badge variant='outline' className='rounded-full px-2 py-0 text-[10px] uppercase font-mono'>
                            {tx.jenis || 'TRANSAKSI'}
                          </Badge>
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
                        <TableCell className='text-right font-semibold tabular-nums py-3'>
                          <span className={isMasuk ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}>
                            {isMasuk ? '+' : '-'}{formatRupiah(Number(tx.nominal ?? 0))}
                          </span>
                        </TableCell>
                        <TableCell className='text-center pe-6 py-3'>
                          <Badge
                            variant='outline'
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${getStatusBadgeClass(
                              tx.jenis === 'VOID' ? 'REFUND' : 'SUKSES'
                            )}`}
                          >
                            {tx.jenis === 'VOID' ? 'REFUND' : 'SUKSES'}
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
  )
}
