import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  Download,
  Tag,
  Store,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { exportMultiSheetExcel } from '@/lib/excelExport'
import { laporanApi } from './api/laporan-api'
import type {
  RingkasanPenjualan,
  BarisPenjualanItem,
  BarisPenjualanKategori,
  BarisPenjualanKasir,
} from './types'

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

export function LaporanPenjualanPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanPenjualan | null>(null)
  const [items, setItems] = useState<BarisPenjualanItem[]>([])
  const [kategoris, setKategoris] = useState<BarisPenjualanKategori[]>([])
  const [kasirs, setKasirs] = useState<BarisPenjualanKasir[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'item' | 'kategori' | 'kasir'>('item')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'terlaris' | 'laba' | 'margin'>('terlaris')


  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [resRingkasan, resItems, resKategoris] = await Promise.all([
          laporanApi.getPenjualan(),
          laporanApi.getPenjualanPerItem(),
          laporanApi.getPenjualanPerKategori(),
        ])
        const resKasirs = await laporanApi.getPenjualanPerKasir().catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('Endpoint penjualan per kasir belum tersedia atau gagal:', err)
          return []
        })
        if (!isMounted) return
        setRingkasan(resRingkasan)
        setItems(resItems)
        setKategoris(resKategoris)
        setKasirs(resKasirs)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat data penjualan'
        toast.error('Gagal Memuat Laporan Penjualan', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  // Filter & Sort Items
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

    if (sortBy === 'terlaris') {
      list.sort((a, b) => b.qty - a.qty)
    } else if (sortBy === 'laba') {
      list.sort((a, b) => b.labaKotor - a.labaKotor)
    } else if (sortBy === 'margin') {
      list.sort((a, b) => b.margin - a.margin)
    }
    return list
  }, [items, searchQuery, sortBy])

  // Filter Kategoris
  const filteredKategoris = useMemo(() => {
    if (!searchQuery.trim()) return kategoris
    const q = searchQuery.toLowerCase()
    return kategoris.filter((k) => k.nama.toLowerCase().includes(q))
  }, [kategoris, searchQuery])

  // Filter Kasirs
  const filteredKasirs = useMemo(() => {
    if (!searchQuery.trim()) return kasirs
    const q = searchQuery.toLowerCase()
    return kasirs.filter(
      (k) =>
        k.namaTitikKasir.toLowerCase().includes(q) ||
        k.petugas.toLowerCase().includes(q)
    )
  }, [kasirs, searchQuery])

  // Handler Ekspor Excel (Multi-Sheet Lengkap)
  const handleExportExcel = () => {
    if (!ringkasan) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      exportMultiSheetExcel({
        filename: `Laporan_Penjualan_Kantin_${new Date().toISOString().split('T')[0]}`,
        sheets: [
          {
            sheetName: 'Penjualan per Item',
            title: 'LAPORAN PENJUALAN PER ITEM MENU KANTIN SKOOLIA',
            metadata: {
              'Tanggal Cetak': new Date().toLocaleString('id-ID'),
              'Penjualan Bersih Total': formatRupiah(ringkasan.penjualanBersih),
              'Total HPP': formatRupiah(ringkasan.totalHpp),
              'Laba Kotor Total': formatRupiah(ringkasan.labaKotor),
              'Rata-rata Margin': `${ringkasan.marginLabaPersen}%`,
            },
            columns: [
              { header: 'ID Menu', key: 'menuId', width: 10 },
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
            data: items,
          },
          {
            sheetName: 'Penjualan per Kategori',
            title: 'LAPORAN PENJUALAN PER KATEGORI MENU',
            columns: [
              { header: 'ID Kategori', key: 'kategoriId', width: 12 },
              { header: 'Nama Kategori', key: 'nama', width: 25 },
              { header: 'Jumlah Variasi Menu', key: 'jumlahItem', width: 18 },
              { header: 'Total Qty Terjual', key: 'qty', width: 16 },
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
            data: kategoris,
          },
          {
            sheetName: 'Penjualan per Kasir',
            title: 'LAPORAN PENJUALAN PER TITIK KASIR',
            columns: [
              { header: 'ID Titik Kasir', key: 'titikKasirId', width: 14 },
              { header: 'Titik Kasir', key: 'namaTitikKasir', width: 25 },
              { header: 'Petugas Jaga', key: 'petugas', width: 20 },
              { header: 'Jumlah Transaksi', key: 'jumlahTransaksi', width: 16 },
              { header: 'Penjualan Bruto (Rp)', key: 'penjualanBruto', width: 20 },
              { header: 'Nilai Void (Rp)', key: 'nilaiVoid', width: 16 },
              { header: 'Penjualan Bersih (Rp)', key: 'penjualanBersih', width: 20 },
            ],
            data: kasirs,
          },
        ],
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Buku kerja Excel dengan 3 sheet laporan penjualan berhasil diunduh.',
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
            <span className="text-xs font-medium">Penjualan & Laba Kotor</span>
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
                Laporan Penjualan & Laba Kotor
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
                  Penjualan Bersih
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatRupiah(ringkasan.penjualanBersih) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>Bruto: {ringkasan ? formatRupiah(ringkasan.penjualanBruto) : '-'}</span>
                  <span className="text-amber-600">Void: {ringkasan ? formatRupiah(ringkasan.nilaiVoid) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Beban HPP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatRupiah(ringkasan.totalHpp) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Biaya bahan pokok menu terjual
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Laba Kotor (Gross Profit)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-blue-600">
                  {ringkasan ? formatRupiah(ringkasan.labaKotor) : '...'}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge variant="secondary" className="font-mono text-xs text-blue-700 bg-blue-50">
                    Margin: {ringkasan?.marginLabaPersen || 0}%
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">dari omset bersih</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Volume Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? `${formatNumber(ringkasan.jumlahTransaksi)} Trx` : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ringkasan?.jumlahVoid || 0} transaksi dibatalkan (void)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABS VIEW: PER ITEM, PER KATEGORI, PER KASIR */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'item' | 'kategori' | 'kasir')}
            className="space-y-4"
          >
            <TableToolbar
              extraLeft={
                <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                  <TabsTrigger value="item" className="gap-2">
                    <Layers className="h-4 w-4" />
                    <span>Per Menu ({items.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="kategori" className="gap-2">
                    <Tag className="h-4 w-4" />
                    <span>Per Kategori ({kategoris.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="kasir" className="gap-2">
                    <Store className="h-4 w-4" />
                    <span>Per Titik Kasir ({kasirs.length})</span>
                  </TabsTrigger>
                </TabsList>
              }
              searchPlaceholder="Cari data laporan..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              filters={
                activeTab === 'item'
                  ? [
                      {
                        title: 'Urutkan',
                        options: [
                          { label: 'Terlaris', value: 'terlaris' },
                          { label: 'Laba Terbesar', value: 'laba' },
                        ],
                        selectedValues: [sortBy],
                        onSelect: (vals) => setSortBy((vals[0] as 'terlaris' | 'laba') || 'terlaris'),
                        isSingleSelect: true,
                      },
                    ]
                  : []
              }
              isFiltered={Boolean(searchQuery || (activeTab === 'item' && sortBy !== 'terlaris'))}
              onReset={() => {
                setSearchQuery('')
                setSortBy('terlaris')
              }}
            />
{/* TAB CONTENT 1: PENJUALAN PER ITEM */}
            <TabsContent value="item" className="space-y-4">
              <Card className="border-0 bg-muted/70 dark:bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base font-bold">
                    Penjualan & Laba Kotor per Item Menu
                  </CardTitle>
                  <CardDescription>
                    Peringkat menu berdasarkan volume terjual, harga pokok (HPP), dan kontribusi laba kotor.
                  </CardDescription>
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
                          <TableHead className="text-right font-bold text-primary">Laba Kotor</TableHead>
                          <TableHead className="text-center">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                              Memuat rincian penjualan per menu...
                            </TableCell>
                          </TableRow>
                        ) : filteredItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                              Tidak ada data item yang cocok.
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
                              <TableCell className="text-right font-mono font-bold text-sm text-blue-600">
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
            </TabsContent>

            {/* TAB CONTENT 2: PENJUALAN PER KATEGORI */}
            <TabsContent value="kategori" className="space-y-4">
              <Card className="border-0 bg-muted/70 dark:bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base font-bold">
                    Penjualan & Laba Kotor per Kategori
                  </CardTitle>
                  <CardDescription>
                    Perbandingan performa omset dan margin laba antar kelompok kategori makanan/minuman.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Kategori Menu</TableHead>
                          <TableHead className="text-center">Variasi Menu</TableHead>
                          <TableHead className="text-right">Total Terjual (Qty)</TableHead>
                          <TableHead className="text-right">Penjualan Bersih</TableHead>
                          <TableHead className="text-right">Total HPP</TableHead>
                          <TableHead className="text-right font-bold text-primary">Laba Kotor</TableHead>
                          <TableHead className="text-center">Margin Rata-rata</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                              Memuat data penjualan per kategori...
                            </TableCell>
                          </TableRow>
                        ) : filteredKategoris.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                              Tidak ada kategori yang cocok.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredKategoris.map((kat, idx) => (
                            <TableRow key={kat.kategoriId}>
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                {kat.nama}
                              </TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">
                                {kat.jumlahItem} menu
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                {formatNumber(kat.qty)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-sm">
                                {formatRupiah(kat.penjualanBersih)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {formatRupiah(kat.totalHpp)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-sm text-blue-600">
                                {formatRupiah(kat.labaKotor)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {kat.margin}%
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
            </TabsContent>

            {/* TAB CONTENT 3: PENJUALAN PER KASIR */}
            <TabsContent value="kasir" className="space-y-4">
              <Card className="border-0 bg-muted/70 dark:bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base font-bold">
                    Penjualan per Titik Kasir & Petugas
                  </CardTitle>
                  <CardDescription>
                    Rekap penerimaan transaksi, pembatalan void, dan omset bersih per loket POS.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Titik Kasir</TableHead>
                          <TableHead>Petugas Jaga</TableHead>
                          <TableHead className="text-right">Jumlah Transaksi</TableHead>
                          <TableHead className="text-right">Penjualan Bruto</TableHead>
                          <TableHead className="text-right text-amber-600">Nilai Void</TableHead>
                          <TableHead className="text-right font-bold text-primary">Penjualan Bersih</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                              Memuat data penjualan per titik kasir...
                            </TableCell>
                          </TableRow>
                        ) : filteredKasirs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              Tidak ada titik kasir yang cocok.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredKasirs.map((kasir, idx) => (
                            <TableRow key={kasir.titikKasirId}>
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                {kasir.namaTitikKasir}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {kasir.petugas}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                {formatNumber(kasir.jumlahTransaksi)} trx
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {formatRupiah(kasir.penjualanBruto)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-amber-600">
                                {formatRupiah(kasir.nilaiVoid)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-sm text-emerald-600">
                                {formatRupiah(kasir.penjualanBersih)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </>
  )
}
