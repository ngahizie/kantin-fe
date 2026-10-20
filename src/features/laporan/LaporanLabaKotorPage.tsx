import { useState, useEffect, useMemo } from 'react'
import {
  Download,
  Search,
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
import { formatRupiah, formatNumber } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { laporanApi } from './api/laporan-api'
import type { RingkasanPenjualan, BarisPenjualanItem } from './types'

const getCategoryBadgeClass = (kategori: string) => {
  const k = (kategori || '').toLowerCase()
  if (k.includes('berat')) {
    return 'border-0 bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
  }
  if (k.includes('dingin') || k.includes('minum')) {
    return 'border-0 bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300'
  }
  if (k.includes('snack') || k.includes('roti')) {
    return 'border-0 bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
  }
  if (k.includes('hangat')) {
    return 'border-0 bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
  }
  return 'border-0 bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300'
}

export function LaporanLabaKotorPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanPenjualan | null>(null)
  const [items, setItems] = useState<BarisPenjualanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [marginFilter, setMarginFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')
  const [sortBy, setSortBy] = useState<'laba_desc' | 'margin_desc' | 'omset_desc'>('laba_desc')

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
        title: 'LAPORAN ANALISIS LABA KOTOR KANTIN SKOOLIA (PRD §9.5)',
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
              Laporan Keuangan
            </span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-medium">Laba Kotor</span>
          </div>
          <div className="flex items-center gap-2">
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main>
        <div className="space-y-6 pb-12">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Laporan Laba Kotor
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="default"
                size="sm"
                onClick={handleExportExcel}
                disabled={isLoading || !ringkasan}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
            </div>
          </div>

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Laba Kotor
                </CardTitle>
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

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rata-rata Gross Margin
                </CardTitle>
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

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Beban Pokok Penjualan (HPP)
                </CardTitle>
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

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Menu Juara Laba
                </CardTitle>
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
          <Card className="border-0 bg-muted/70 dark:bg-muted/30">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Daftar Kontribusi Laba per Menu
                </CardTitle>
                <CardDescription>
                  Evaluasi harga jual vs HPP setiap menu untuk penetapan harga dan subsidi kantin.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-56">
                  <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                  <Input
                    placeholder="Cari menu / kategori..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>

                <Select
                  value={marginFilter}
                  onValueChange={(v) => setMarginFilter(v as 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW')}
                >
                  <SelectTrigger className="w-[160px] text-xs">
                    <SelectValue placeholder="Filter Margin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Margin</SelectItem>
                    <SelectItem value="HIGH">Margin Tinggi (≥ 35%)</SelectItem>
                    <SelectItem value="MEDIUM">Margin Sedang (20-34%)</SelectItem>
                    <SelectItem value="LOW">Margin Tipis (&lt; 20%)</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as 'laba_desc' | 'margin_desc' | 'omset_desc')}
                >
                  <SelectTrigger className="w-[160px] text-xs">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laba_desc">Laba Terbesar</SelectItem>
                    <SelectItem value="margin_desc">Margin Tertinggi</SelectItem>
                    <SelectItem value="omset_desc">Omset Tertinggi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-hidden rounded-lg">
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
                            <Badge
                              variant="secondary"
                              className={`text-xs font-medium ${getCategoryBadgeClass(item.kategoriNama)}`}
                            >
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
