import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  Coins,
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  Receipt,
  Percent,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { formatRupiah, formatNumber } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { laporanApi } from './api/laporan-api'
import type { RingkasanPenjualan, BarisPenjualanItem } from './types'

export function LaporanLabaKotorPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanPenjualan | null>(null)
  const [items, setItems] = useState<BarisPenjualanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [marginFilter, setMarginFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')
  const [sortBy, setSortBy] = useState<'laba_desc' | 'margin_desc' | 'omset_desc'>('laba_desc')

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [resRingkasan, resItems] = await Promise.all([
        laporanApi.getPenjualan(),
        laporanApi.getPenjualanPerItem(),
      ])
      setRingkasan(resRingkasan)
      setItems(resItems)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat laba kotor'
      toast.error('Gagal Memuat Laporan Laba Kotor', { description: msg })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [resRingkasan, resItems] = await Promise.all([
          laporanApi.getPenjualan(),
          laporanApi.getPenjualanPerItem(),
        ])
        if (!isMounted) return
        setRingkasan(resRingkasan)
        setItems(resItems)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat laba kotor'
        toast.error('Gagal Memuat Laporan Laba Kotor', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  // Filter & Urutan
  const filteredItems = useMemo(() => {
    let list = [...items]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (i) =>
          i.nama.toLowerCase().includes(q) ||
          i.kategoriNama.toLowerCase().includes(q)
      )
    }

    if (marginFilter === 'HIGH') {
      list = list.filter((i) => i.margin >= 35)
    } else if (marginFilter === 'MEDIUM') {
      list = list.filter((i) => i.margin >= 20 && i.margin < 35)
    } else if (marginFilter === 'LOW') {
      list = list.filter((i) => i.margin < 20)
    }

    if (sortBy === 'laba_desc') {
      list.sort((a, b) => b.labaKotor - a.labaKotor)
    } else if (sortBy === 'margin_desc') {
      list.sort((a, b) => b.margin - a.margin)
    } else if (sortBy === 'omset_desc') {
      list.sort((a, b) => b.penjualanBersih - a.penjualanBersih)
    }

    return list
  }, [items, searchQuery, marginFilter, sortBy])

  // Hitung menu kontributor laba terbesar
  const topProfitItem = useMemo(() => {
    if (items.length === 0) return null
    return [...items].sort((a, b) => b.labaKotor - a.labaKotor)[0]
  }, [items])

  const handleExportExcel = () => {
    if (!ringkasan) {
      toast.error('Data belum siap diekspor')
      return
    }

    try {
      exportTableToExcel({
        filename: `Laporan_Laba_Kotor_Kantin_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Laba Kotor',
        title: 'LAPORAN ANALISIS LABA KOTOR KANTIN SKOOLIA',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Penjualan Bersih (Omset)': formatRupiah(ringkasan.penjualanBersih),
          'Beban Pokok Penjualan (HPP)': formatRupiah(ringkasan.totalHpp),
          'Total Laba Kotor': formatRupiah(ringkasan.labaKotor),
          'Rata-rata Gross Margin': `${ringkasan.marginLabaPersen}%`,
        },
        columns: [
          { header: 'No', key: 'menuId', width: 8 },
          { header: 'Nama Menu', key: 'nama', width: 28 },
          { header: 'Kategori', key: 'kategoriNama', width: 18 },
          { header: 'Qty Terjual', key: 'qty', width: 12 },
          { header: 'Harga Satuan (Rp)', key: 'hargaJual', width: 16 },
          { header: 'HPP Unit (Rp)', key: 'hpp', width: 14 },
          { header: 'Penjualan Bersih (Rp)', key: 'penjualanBersih', width: 20 },
          { header: 'Total HPP (Rp)', key: 'totalHpp', width: 18 },
          { header: 'Laba Kotor (Rp)', key: 'labaKotor', width: 18 },
          {
            header: 'Margin (%)',
            key: 'margin',
            formatter: (v) => `${v}%`,
            width: 12,
          },
        ],
        data: filteredItems,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Laporan Laba Kotor (.xlsx) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas Excel'
      toast.error('Gagal Ekspor', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Pusat Laporan Keuangan
            </span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-medium">Laba Kotor</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main fixed>
        <div className="space-y-6 pb-12">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Laporan Laba Kotor
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Analisis profitabilitas kantin: Laba kotor = Penjualan bersih − Σ HPP item terjual.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadData()}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleExportExcel}
                disabled={isLoading || !ringkasan}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
            </div>
          </div>

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Laba Kotor
                </CardTitle>
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-emerald-600">
                  {ringkasan ? formatRupiah(ringkasan.labaKotor) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Keuntungan murni setelah dipotong beban HPP
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rata-rata Gross Margin
                </CardTitle>
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                  <Percent className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-blue-600">
                  {ringkasan ? `${ringkasan.marginLabaPersen}%` : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rasio laba kotor terhadap penjualan bersih
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Beban Pokok Penjualan (HPP)
                </CardTitle>
                <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
                  <Receipt className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatRupiah(ringkasan.totalHpp) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total modal kulakan menu terjual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Menu Juara Laba
                </CardTitle>
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
                  <Sparkles className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold tracking-tight truncate">
                  {topProfitItem ? topProfitItem.nama : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {topProfitItem ? `Laba: ${formatRupiah(topProfitItem.labaKotor)}` : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABEL PROFITABILITAS PER MENU */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Daftar Kontribusi Laba per Menu
                </CardTitle>
                <CardDescription>
                  Evaluasi harga jual vs HPP setiap menu untuk penetapan harga dan subsidi kantin.
                </CardDescription>
              </div>

              <TableToolbar
                searchPlaceholder="Cari menu / kategori..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                filters={[
                  {
                    title: 'Margin',
                    options: [
                      { label: 'Margin Tinggi (≥ 35%)', value: 'HIGH' },
                      { label: 'Margin Sedang (20-34%)', value: 'MEDIUM' },
                      { label: 'Margin Tipis (< 20%)', value: 'LOW' },
                    ],
                    selectedValues: marginFilter !== 'ALL' ? [marginFilter] : [],
                    onSelect: (vals) => setMarginFilter((vals[0] as any) || 'ALL'),
                    isSingleSelect: true,
                  },
                  {
                    title: 'Urutkan',
                    options: [
                      { label: 'Laba Terbesar', value: 'laba_desc' },
                      { label: 'Margin Tertinggi', value: 'margin_desc' },
                      { label: 'Omset Tertinggi', value: 'omset_desc' },
                    ],
                    selectedValues: sortBy !== 'laba_desc' ? [sortBy] : [],
                    onSelect: (vals) => setSortBy((vals[0] as any) || 'laba_desc'),
                    isSingleSelect: true,
                  },
                ]}
                isFiltered={Boolean(searchQuery || marginFilter !== 'ALL' || sortBy !== 'laba_desc')}
                onReset={() => {
                  setSearchQuery('')
                  setMarginFilter('ALL')
                  setSortBy('laba_desc')
                }}
              />
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Nama Menu</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Harga Jual</TableHead>
                      <TableHead className="text-right">HPP Unit</TableHead>
                      <TableHead className="text-right">Penjualan Bersih</TableHead>
                      <TableHead className="text-right">Total HPP</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600">Laba Kotor</TableHead>
                      <TableHead className="text-center">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                          Memuat data laba kotor...
                        </TableCell>
                      </TableRow>
                    ) : filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                          Tidak ada menu yang sesuai kriteria pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item, idx) => (
                        <TableRow key={item.menuId}>
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {item.nama}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.kategoriNama}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatNumber(item.qty)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatRupiah(item.hargaJual)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {formatRupiah(item.hpp)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm">
                            {formatRupiah(item.penjualanBersih)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {formatRupiah(item.totalHpp)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-emerald-600">
                            {formatRupiah(item.labaKotor)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={`font-mono text-xs ${
                                item.margin >= 35
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : item.margin >= 20
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {item.margin}%
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
      </Main>
    </>
  )
}
