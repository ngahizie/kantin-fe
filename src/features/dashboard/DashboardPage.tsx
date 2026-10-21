import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Banknote,
  RefreshCw,
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
import { BackofficeHeader } from '@/components/layout/backoffice-header'
import { Main } from '@/components/layout/main'
import { laporanApi } from '@/features/laporan/api/laporan-api'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import apiClient from '@/lib/api-client'
import { MOCK_MENU } from '@/mocks/mock-data'
import type { RingkasanPenjualan, RingkasanRekonsiliasi } from '@/features/laporan/types'
import type { MenuItem } from '@/features/katalog/types'

// Data tren penjualan 7 hari terakhir (baseline)
const SALES_TREND_DATA = [
  { hari: 'Sen (26 Sep)', makanan: 1250000, minuman: 420000, snack: 180000, total: 1850000, transaksi: 124 },
  { hari: 'Sel (27 Sep)', makanan: 1420000, minuman: 480000, snack: 220000, total: 2120000, transaksi: 148 },
  { hari: 'Rab (28 Sep)', makanan: 1310000, minuman: 440000, snack: 190000, total: 1940000, transaksi: 135 },
  { hari: 'Kam (29 Sep)', makanan: 1580000, minuman: 530000, snack: 240000, total: 2350000, transaksi: 160 },
  { hari: 'Jum (30 Sep)', makanan: 1820000, minuman: 610000, snack: 250000, total: 2680000, transaksi: 185 },
  { hari: 'Sab (01 Okt)', makanan: 980000, minuman: 320000, snack: 150000, total: 1450000, transaksi: 92 },
  { hari: 'Hari Ini', makanan: 1680000, minuman: 560000, snack: 245000, total: 2485000, transaksi: 168 },
]

// Baseline transaksi demo
const FALLBACK_TRANSACTIONS = [
  {
    id: 'TRX-94821',
    waktu: '11:42:15',
    nama: 'Budi Santoso',
    identitas: 'Kelas X IPA 1 (NIS: 2026001)',
    tipe: 'Siswa',
    item: 'Nasi Uduk Komplit, Es Teh Manis',
    total: 16000,
    metode: 'RFID Tap',
    status: 'SUKSES',
  },
  {
    id: 'TRX-94820',
    waktu: '11:40:02',
    nama: 'Pak Budi Hartono',
    identitas: 'Kartu Tamu (KT-004)',
    tipe: 'Tamu/Guru',
    item: 'Nasi Goreng Ayam',
    total: 15000,
    metode: 'RFID Tap',
    status: 'SUKSES',
  },
  {
    id: 'TRX-94819',
    waktu: '11:38:44',
    nama: 'Ahmad Fauzi',
    identitas: 'Kelas XII IPA 3 (NIS: 2026003)',
    tipe: 'Siswa',
    item: 'Ayam Geprek Sambal Bawang, Air Mineral',
    total: 18000,
    metode: 'RFID Tap',
    status: 'SUKSES',
  },
  {
    id: 'TRX-94818',
    waktu: '11:35:10',
    nama: 'Dewi Anggraini',
    identitas: 'Kelas XI MIPA 2 (NIS: 2026005)',
    tipe: 'Siswa',
    item: 'Donat Gula Halus, Susu UHT Cokelat',
    total: 10000,
    metode: 'RFID Tap',
    status: 'SUKSES',
  },
  {
    id: 'TRX-94817',
    waktu: '11:31:28',
    nama: 'Rifki Pratama',
    identitas: 'Kelas X IPS 2 (NIS: 2026011)',
    tipe: 'Siswa',
    item: 'Roti Cokelat Keju',
    total: 5000,
    metode: 'RFID Tap',
    status: 'SUKSES',
  },
]

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
  identitas: string
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

export function DashboardPage() {
  const [penjualan, setPenjualan] = useState<RingkasanPenjualan | null>(null)
  const [rekonsiliasi, setRekonsiliasi] = useState<RingkasanRekonsiliasi | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [kategoriMap, setKategoriMap] = useState<Record<number, string>>({})
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionDisplayItem[]>(FALLBACK_TRANSACTIONS)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch data awal saat komponen dibuka
  useEffect(() => {
    let isMounted = true

    const fetchInitialData = async () => {
      try {
        const [
          penjualanRes,
          rekonsiliasiRes,
          menuRes,
          kategoriRes,
          trxRes,
        ] = await Promise.allSettled([
          laporanApi.getPenjualan(),
          laporanApi.getRekonsiliasi(),
          katalogApi.getMenuList(),
          katalogApi.getKategoriList(),
          apiClient.get('/api/kasir/transaksi', { params: { ukuran: 5, halaman: 0 } }),
        ])

        if (!isMounted) return

        // 1. Data Penjualan Hari Ini
        if (penjualanRes.status === 'fulfilled' && penjualanRes.value) {
          setPenjualan(penjualanRes.value)
        }

        // 2. Data Status Rekonsiliasi Kas
        if (rekonsiliasiRes.status === 'fulfilled' && rekonsiliasiRes.value) {
          setRekonsiliasi(rekonsiliasiRes.value)
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
        if (menuRes.status === 'fulfilled' && Array.isArray(menuRes.value) && menuRes.value.length > 0) {
          setMenuItems(menuRes.value)
        }

        // 5. Transaksi Kasir Terakhir
        if (trxRes.status === 'fulfilled' && trxRes.value?.data?.data) {
          const rawItems = trxRes.value.data.data.items || trxRes.value.data.data
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const mapped: RecentTransactionDisplayItem[] = rawItems.slice(0, 5).map((trx: Record<string, unknown>) => {
              const timeStr = trx.waktu
                ? new Date(String(trx.waktu)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '11:42:15'
              const isSiswa = trx.subjekTipe === 'SISWA'
              const isTamu = trx.subjekTipe === 'KARTU_TAMU'
              return {
                id: `TRX-${trx.id}`,
                waktu: timeStr,
                nama: String(trx.subjekNama || (isSiswa ? `Siswa #${trx.subjekId}` : isTamu ? 'Tamu / Guru' : 'Pelanggan')),
                identitas: isTamu
                  ? (trx.kartuUid ? `Kartu: ${trx.kartuUid}` : 'Kartu Tamu')
                  : (trx.subjekId ? `ID: ${trx.subjekId}` : 'Siswa Kantin'),
                tipe: isTamu ? 'Tamu/Guru' : 'Siswa',
                item: trx.titikKasirNama ? `POS ${trx.titikKasirNama}` : 'Transaksi Tap RFID',
                total: Number(trx.total ?? 0),
                metode: 'RFID Tap',
                status: String(trx.status || 'SUKSES'),
              }
            })
            setRecentTransactions(mapped)
          }
        }
      } catch {
        // Fallback graceful
      }
    }

    void fetchInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  // Fungsi refresh manual
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [
        penjualanRes,
        rekonsiliasiRes,
        menuRes,
        kategoriRes,
        trxRes,
      ] = await Promise.allSettled([
        laporanApi.getPenjualan(),
        laporanApi.getRekonsiliasi(),
        katalogApi.getMenuList(),
        katalogApi.getKategoriList(),
        apiClient.get('/api/kasir/transaksi', { params: { ukuran: 5, halaman: 0 } }),
      ])

      if (penjualanRes.status === 'fulfilled' && penjualanRes.value) {
        setPenjualan(penjualanRes.value)
      }
      if (rekonsiliasiRes.status === 'fulfilled' && rekonsiliasiRes.value) {
        setRekonsiliasi(rekonsiliasiRes.value)
      }
      if (kategoriRes.status === 'fulfilled' && Array.isArray(kategoriRes.value)) {
        const map: Record<number, string> = {}
        kategoriRes.value.forEach((k) => {
          map[k.id] = k.nama
        })
        setKategoriMap(map)
      }
      if (menuRes.status === 'fulfilled' && Array.isArray(menuRes.value) && menuRes.value.length > 0) {
        setMenuItems(menuRes.value)
      }
      if (trxRes.status === 'fulfilled' && trxRes.value?.data?.data) {
        const rawItems = trxRes.value.data.data.items || trxRes.value.data.data
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const mapped: RecentTransactionDisplayItem[] = rawItems.slice(0, 5).map((trx: Record<string, unknown>) => {
            const timeStr = trx.waktu
              ? new Date(String(trx.waktu)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '11:42:15'
            const isSiswa = trx.subjekTipe === 'SISWA'
            const isTamu = trx.subjekTipe === 'KARTU_TAMU'
            return {
              id: `TRX-${trx.id}`,
              waktu: timeStr,
              nama: String(trx.subjekNama || (isSiswa ? `Siswa #${trx.subjekId}` : isTamu ? 'Tamu / Guru' : 'Pelanggan')),
              identitas: isTamu
                ? (trx.kartuUid ? `Kartu: ${trx.kartuUid}` : 'Kartu Tamu')
                : (trx.subjekId ? `ID: ${trx.subjekId}` : 'Siswa Kantin'),
              tipe: isTamu ? 'Tamu/Guru' : 'Siswa',
              item: trx.titikKasirNama ? `POS ${trx.titikKasirNama}` : 'Transaksi Tap RFID',
              total: Number(trx.total ?? 0),
              metode: 'RFID Tap',
              status: String(trx.status || 'SUKSES'),
            }
          })
          setRecentTransactions(mapped)
        }
      }
    } catch {
      // Fallback graceful
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Normalisasi data menu dari BE atau fallback MOCK_MENU
  const effectiveMenuItems: LowStockDisplayItem[] = useMemo(() => {
    if (menuItems.length > 0) {
      return menuItems.map((m) => ({
        id: m.id,
        nama: m.nama,
        kategori_nama: (m.kategoriId && kategoriMap[m.kategoriId]) || 'Umum',
        stok: m.stokBerjalan ?? 0,
        stok_minimum: m.stokMinimum ?? 5,
        satuan: m.satuan || 'Porsi',
      }))
    }
    return MOCK_MENU.map((m) => ({
      id: m.id,
      nama: m.nama,
      kategori_nama: m.kategori_nama,
      stok: m.stok,
      stok_minimum: m.stok_minimum,
      satuan: m.satuan,
    }))
  }, [menuItems, kategoriMap])

  // Item dengan stok menipis (stok <= stok_minimum)
  const lowStockItems = useMemo(() => {
    return effectiveMenuItems.filter((item) => item.stok <= item.stok_minimum)
  }, [effectiveMenuItems])

  // Hitung metrik hari ini dari BE
  const todaySales = penjualan?.penjualanBersih ?? penjualan?.penjualanBruto ?? 2485000
  const todayTransactions = Number(penjualan?.jumlahTransaksi ?? 168)
  const avgPerTransaction = todayTransactions > 0 ? Math.round(todaySales / todayTransactions) : 0
  const selisihKas = rekonsiliasi?.selisih ?? 0
  const isKasSeimbang = rekonsiliasi ? rekonsiliasi.seimbang : true

  // Grafik tren penjualan 7 hari yang tersinkronisasi dinamis
  const chartData = useMemo(() => {
    return SALES_TREND_DATA.map((item, idx) => {
      if (idx === SALES_TREND_DATA.length - 1 && todaySales > 0) {
        return {
          ...item,
          makanan: Math.round(todaySales * 0.68),
          minuman: Math.round(todaySales * 0.22),
          snack: Math.round(todaySales * 0.10),
          total: todaySales,
          transaksi: todayTransactions,
        }
      }
      return item
    })
  }, [todaySales, todayTransactions])

  return (
    <>
      {/* Top Header Shell dengan breadcrumb, sekolah, modul status, search & profil */}
      <BackofficeHeader />

      <Main className='space-y-6 pb-12'>
        {/* Header Title & Tombol Segarkan */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-bold tracking-tight text-foreground'>
              Dashboard Kantin
            </h1>
            <p className='text-xs text-muted-foreground'>
              Ringkasan performa penjualan harian, status kas, dan persediaan kantin
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className='h-8 text-xs gap-1.5 border-0 bg-muted/60 hover:bg-muted text-foreground'
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>

        {/* ===== 4 Kartu Metrik Utama ===== */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {/* Card 1: Penjualan Hari Ini */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Penjualan Hari Ini
              </CardTitle>
              <div className='flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'>
                <Banknote className='size-5' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground'>
                {formatRupiah(todaySales)}
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold'>
                  <TrendingUp className='size-3.5 mr-0.5' /> Live BE
                </span>
                <span>• Omset bersih hari ini</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total Transaksi Hari Ini */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Transaksi Hari Ini
              </CardTitle>
              <div className='flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                <ShoppingCart className='size-5' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground'>
                {todayTransactions} <span className='text-base font-normal text-muted-foreground'>Trx</span>
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-foreground'>Rata-rata: {formatRupiah(avgPerTransaction)}</span>
                <span>/ siswa</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Status Rekonsiliasi Kas */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Status Rekonsiliasi Kas
              </CardTitle>
              <div className={`flex size-9 items-center justify-center rounded-lg ${
                isKasSeimbang
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              }`}>
                <Scale className='size-5' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground'>
                {formatRupiah(selisihKas)} <span className='text-base font-normal text-muted-foreground'>Selisih</span>
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className={`inline-flex items-center font-semibold ${
                  isKasSeimbang ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                }`}>
                  {isKasSeimbang ? 'Seimbang' : 'Ada Selisih'}
                </span>
                <span>• {isKasSeimbang ? 'Kas fisik TU cocok sistem' : 'Perlu pemeriksaan kas'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Alert Status Stok Menipis */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Peringatan Stok Barang
              </CardTitle>
              <div className='flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400'>
                <AlertTriangle className='size-5' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground'>
                {lowStockItems.length} <span className='text-base font-normal text-muted-foreground'>Item</span>
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='inline-flex items-center text-amber-600 dark:text-amber-400 font-semibold'>
                  Perlu Restock
                </span>
                <span>• {effectiveMenuItems.filter(i => i.stok === 0).length} Habis, {effectiveMenuItems.filter(i => i.stok > 0 && i.stok <= i.stok_minimum).length} Menipis</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Grid Konten Tengah: Grafik Penjualan 7 Hari & Alert Stok Menipis ===== */}
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
          {/* Kolom Kiri: Tren Penjualan 7 Hari Terakhir (Recharts) */}
          <Card className='col-span-1 lg:col-span-4 border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                <div>
                  <CardTitle className='text-base font-semibold'>
                    Tren Penjualan 7 Hari Terakhir
                  </CardTitle>
                  <CardDescription className='text-xs mt-0.5'>
                    Grafik omset harian kasir kantin dalam Rupiah (Rp) per kategori
                  </CardDescription>
                </div>
                {/* Legend Kategori */}
                <div className='flex items-center gap-3.5 text-xs shrink-0'>
                  <div className='flex items-center gap-1.5'>
                    <span className='size-2.5 rounded-full bg-[#3b82f6] shrink-0' />
                    <span className='font-medium text-muted-foreground'>Makanan</span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <span className='size-2.5 rounded-full bg-[#06b6d4] shrink-0' />
                    <span className='font-medium text-muted-foreground'>Minuman</span>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <span className='size-2.5 rounded-full bg-[#f59e0b] shrink-0' />
                    <span className='font-medium text-muted-foreground'>Snack</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className='ps-2 pe-6 pb-4 pt-3'>
              <div className='h-[310px] w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart
                    data={chartData}
                    maxBarSize={36}
                    margin={{ top: 10, right: 10, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' vertical={false} />
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
                            <div className='rounded-xl border-0 bg-popover p-3 text-xs shadow-lg min-w-[200px]'>
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
                              <div className='mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-6 font-semibold text-foreground'>
                                <span>Total Omset</span>
                                <span className='font-bold tabular-nums text-foreground'>{formatRupiah(total)}</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey='makanan' name='Makanan' stackId='a' fill='#3b82f6' radius={[0, 0, 0, 0]} />
                    <Bar dataKey='minuman' name='Minuman' stackId='a' fill='#06b6d4' radius={[0, 0, 0, 0]} />
                    <Bar dataKey='snack' name='Snack' stackId='a' fill='#f59e0b' radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Kolom Kanan: Stok Menipis */}
          <Card className='col-span-1 lg:col-span-3 border-0 bg-muted/70 dark:bg-muted/30 flex flex-col'>
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
                    <TableRow className='text-xs'>
                      <TableHead className='ps-6'>Menu</TableHead>
                      <TableHead className='text-center'>Sisa / Min</TableHead>
                      <TableHead className='text-center pe-6'>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className='h-28 text-center text-xs text-muted-foreground px-6'>
                          <CheckCircle2 className='size-6 text-emerald-500 mx-auto mb-1 opacity-70' />
                          Semua stok menu dalam kondisi aman di atas batas minimum.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockItems.map((item) => {
                        const isOut = item.stok === 0
                        return (
                          <TableRow key={item.id} className='text-xs'>
                            <TableCell className='ps-6 py-3 font-medium'>
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
                              {isOut ? (
                                <Badge variant='destructive' className='rounded-full text-[10px] font-semibold px-2.5 py-0.5 uppercase tracking-wide border-0'>
                                  HABIS
                                </Badge>
                              ) : (
                                <Badge variant='outline' className='rounded-full text-[10px] font-semibold px-2.5 py-0.5 border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300 uppercase tracking-wide'>
                                  MENIPIS
                                </Badge>
                              )}
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
        <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
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
                  <TableRow className='text-xs'>
                    <TableHead className='w-[140px] ps-6'>Waktu & ID</TableHead>
                    <TableHead className='w-[200px]'>Pelanggan</TableHead>
                    <TableHead>Item Menu</TableHead>
                    <TableHead className='text-right w-[140px]'>Total Belanja</TableHead>
                    <TableHead className='text-center w-[120px] pe-6'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((trx) => (
                    <TableRow key={trx.id} className='text-xs'>
                      <TableCell className='ps-6 py-3'>
                        <div className='font-medium text-foreground tabular-nums'>{trx.waktu}</div>
                        <div className='text-[10px] text-muted-foreground tabular-nums'>{trx.id}</div>
                      </TableCell>
                      <TableCell className='py-3'>
                        <div className='font-semibold text-foreground'>{trx.nama}</div>
                        <div className='text-[10px] text-muted-foreground'>{trx.identitas}</div>
                      </TableCell>
                      <TableCell className='text-muted-foreground py-3'>
                        {trx.item}
                      </TableCell>
                      <TableCell className='text-right font-semibold text-foreground tabular-nums py-3'>
                        {formatRupiah(trx.total)}
                      </TableCell>
                      <TableCell className='text-center pe-6 py-3'>
                        <Badge variant='outline' className='rounded-full text-[10px] font-semibold px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 uppercase tracking-wide'>
                          {trx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
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
