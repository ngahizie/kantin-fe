import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import { Award, Loader2, Percent, TrendingUp, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { formatRupiah, formatNumber } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { exportTableToPdf } from '@/lib/pdfExport'
import { LaporanExportButton } from './components'
import { laporanApi } from './api/laporan-api'
import type { RingkasanPenjualan, BarisPenjualanItem } from './types'

const getCategoryBadgeClass = (kategori: string) => {
  const k = (kategori || '').toLowerCase()
  if (k.includes('berat')) {
    return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300'
  }
  if (k.includes('dingin') || k.includes('minum')) {
    return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300'
  }
  if (k.includes('snack') || k.includes('roti')) {
    return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
  }
  if (k.includes('hangat')) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
  }
  return 'border-border bg-muted text-muted-foreground'
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

  // Helper normalisasi nilai agar aman menghadapi data langsung BE #291 maupun mock
  const getItemId = (i: BarisPenjualanItem) => i.menuId ?? i.kunciId ?? 0
  const getItemOmset = (i: BarisPenjualanItem) => i.total ?? i.penjualanBersih ?? 0
  const getItemModal = (i: BarisPenjualanItem) => i.modal ?? i.totalHpp ?? 0
  const getItemLaba = (i: BarisPenjualanItem) =>
    i.laba ?? i.labaKotor ?? getItemOmset(i) - getItemModal(i)
  const getItemMargin = (i: BarisPenjualanItem) => i.marginPersen ?? i.margin ?? 0
  const getItemHarga = (i: BarisPenjualanItem) =>
    i.hargaSatuan ?? i.hargaJual ?? (i.qty > 0 ? Math.round(getItemOmset(i) / i.qty) : 0)
  const getItemUnitModal = (i: BarisPenjualanItem) =>
    i.hpp ?? (i.qty > 0 ? Math.round(getItemModal(i) / i.qty) : 0)

  const summaryTotalModal =
    ringkasan?.totalModal ??
    (ringkasan as (RingkasanPenjualan & { totalHpp?: number }) | null)?.totalHpp ??
    0
  const summaryLaba =
    ringkasan?.laba ??
    (ringkasan as (RingkasanPenjualan & { labaKotor?: number }) | null)?.labaKotor ??
    0
  const summaryMargin =
    ringkasan?.marginPersen ??
    (ringkasan as (RingkasanPenjualan & { marginLabaPersen?: number }) | null)
      ?.marginLabaPersen ??
    0

  // Filter & Urutan
  const filteredItems = useMemo(() => {
    let list = [...items]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (i) =>
          (i.nama || '').toLowerCase().includes(q) ||
          (i.kategoriNama || '').toLowerCase().includes(q)
      )
    }

    if (marginFilter === 'HIGH') {
      list = list.filter((i) => (i.marginPersen ?? i.margin ?? 0) >= 35)
    } else if (marginFilter === 'MEDIUM') {
      list = list.filter((i) => {
        const m = i.marginPersen ?? i.margin ?? 0
        return m >= 20 && m < 35
      })
    } else if (marginFilter === 'LOW') {
      list = list.filter((i) => (i.marginPersen ?? i.margin ?? 0) < 20)
    }

    if (sortBy === 'laba_desc') {
      list.sort(
        (a, b) =>
          (b.laba ?? b.labaKotor ?? 0) - (a.laba ?? a.labaKotor ?? 0)
      )
    } else if (sortBy === 'margin_desc') {
      list.sort(
        (a, b) =>
          (b.marginPersen ?? b.margin ?? 0) - (a.marginPersen ?? a.margin ?? 0)
      )
    } else if (sortBy === 'omset_desc') {
      list.sort(
        (a, b) =>
          (b.total ?? b.penjualanBersih ?? 0) -
          (a.total ?? a.penjualanBersih ?? 0)
      )
    }

    return list
  }, [items, searchQuery, marginFilter, sortBy])

  // Hitung menu kontributor laba terbesar
  const topProfitItem = useMemo(() => {
    if (items.length === 0) return null
    return [...items].sort(
      (a, b) => (b.laba ?? b.labaKotor ?? 0) - (a.laba ?? a.labaKotor ?? 0)
    )[0]
  }, [items])

  const handleExportExcel = () => {
    if (!ringkasan) {
      toast.error('Data belum siap diekspor')
      return
    }

    try {
      const exportRows = filteredItems.map((item) => ({
        menuId: getItemId(item),
        nama: item.nama || '-',
        kategoriNama: item.kategoriNama || 'Umum',
        qty: item.qty ?? 0,
        hargaSatuan: getItemHarga(item),
        hpp: getItemUnitModal(item),
        total: getItemOmset(item),
        modal: getItemModal(item),
        laba: getItemLaba(item),
        marginPersen: getItemMargin(item),
      }))

      exportTableToExcel({
        filename: `Laporan_Laba_Kotor_Kantin_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Laba Kotor',
        title: 'LAPORAN ANALISIS LABA KOTOR',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Penjualan Bersih (Omset)': formatRupiah(ringkasan.penjualanBersih ?? 0),
          'Total Modal (HPP)': formatRupiah(summaryTotalModal),
          'Total Laba': formatRupiah(summaryLaba),
          'Rata-rata Margin Kotor': `${summaryMargin}%`,
        },
        columns: [
          { header: 'No', width: 6 },
          { header: 'Nama Menu', key: 'nama', width: 28 },
          { header: 'Kategori', key: 'kategoriNama', width: 16 },
          { header: 'Qty Terjual', key: 'qty', width: 12 },
          { header: 'Harga Satuan (Rp)', key: 'hargaSatuan', width: 16 },
          { header: 'Modal Unit (Rp)', key: 'hpp', width: 14 },
          { header: 'Total Penjualan (Rp)', key: 'total', width: 18 },
          { header: 'Total Modal (Rp)', key: 'modal', width: 18 },
          { header: 'Laba (Rp)', key: 'laba', width: 18 },
          {
            header: 'Margin (%)',
            key: 'marginPersen',
            formatter: (v) => `${Number(v ?? 0)}%`,
            width: 12,
          },
        ],
        data: exportRows,
        summaryRow: {
          no: '',
          nama: '',
          kategoriNama: '',
          qty: filteredItems.reduce((acc, item) => acc + (item.qty || 0), 0),
          hargaSatuan: '',
          hpp: '',
          total: ringkasan.penjualanBersih ?? 0,
          modal: summaryTotalModal,
          laba: summaryLaba,
          marginPersen: `${summaryMargin}%`,
        },
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Laporan Laba Kotor (.xlsx) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas Excel'
      toast.error('Gagal Ekspor', { description: msg })
    }
  }

  const handleExportPdf = () => {
    if (!ringkasan) {
      toast.error('Data belum siap diekspor')
      return
    }

    try {
      const exportRows = filteredItems.map((item) => ({
        menuId: getItemId(item),
        nama: item.nama || '-',
        kategoriNama: item.kategoriNama || 'Umum',
        qty: item.qty ?? 0,
        hargaSatuan: getItemHarga(item),
        hpp: getItemUnitModal(item),
        total: getItemOmset(item),
        modal: getItemModal(item),
        laba: getItemLaba(item),
        marginPersen: getItemMargin(item),
      }))

      exportTableToPdf({
        filename: `Laporan_Laba_Kotor_Kantin_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN ANALISIS LABA KOTOR',
        subtitle: 'Analisis Margin Penjualan Menu dan Kontribusi Keuntungan',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Penjualan Bersih (Omset)': formatRupiah(ringkasan.penjualanBersih ?? 0),
          'Total Modal (HPP)': formatRupiah(summaryTotalModal),
          'Total Laba': formatRupiah(summaryLaba),
          'Rata-rata Margin Kotor': `${summaryMargin}%`,
        },
        columns: [
          { header: 'No' },
          { header: 'Nama Menu', key: 'nama' },
          { header: 'Kategori', key: 'kategoriNama' },
          { header: 'Qty Terjual', key: 'qty' },
          {
            header: 'Harga Satuan',
            key: 'hargaSatuan',
            formatter: (v) => formatRupiah(Number(v ?? 0)),
          },
          {
            header: 'Modal Unit',
            key: 'hpp',
            formatter: (v) => formatRupiah(Number(v ?? 0)),
          },
          {
            header: 'Total Penjualan',
            key: 'total',
            formatter: (v) => formatRupiah(Number(v ?? 0)),
          },
          {
            header: 'Total Modal',
            key: 'modal',
            formatter: (v) => formatRupiah(Number(v ?? 0)),
          },
          {
            header: 'Laba',
            key: 'laba',
            formatter: (v) => formatRupiah(Number(v ?? 0)),
          },
          {
            header: 'Margin',
            key: 'marginPersen',
            formatter: (v) => `${Number(v ?? 0)}%`,
          },
        ],
        data: exportRows,
        summaryRow: {
          no: '',
          nama: '',
          kategoriNama: '',
          qty: `${filteredItems.reduce((acc, item) => acc + (item.qty || 0), 0)}`,
          hargaSatuan: '',
          hpp: '',
          total: formatRupiah(ringkasan.penjualanBersih ?? 0),
          modal: formatRupiah(summaryTotalModal),
          laba: formatRupiah(summaryLaba),
          marginPersen: `${summaryMargin}%`,
        },
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Laporan Laba Kotor (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Laporan Keuangan' title='Laba Kotor' />
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Laporan Laba Kotor
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <LaporanExportButton
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                disabled={isLoading || !ringkasan}
              />
            </div>
          </div>

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Laba Kotor
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                  {ringkasan ? formatRupiah(summaryLaba) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Keuntungan murni setelah dipotong total modal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rata-rata Margin Kotor
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <Percent className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-blue-600 dark:text-blue-400">
                  {ringkasan ? `${summaryMargin}%` : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rasio laba terhadap penjualan bersih
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Modal (HPP)
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? formatRupiah(summaryTotalModal) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total modal kulakan menu terjual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Menu Juara Laba
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <Award className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold tracking-tight truncate">
                  {topProfitItem ? topProfitItem.nama : '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono tabular-nums">
                  {topProfitItem ? `Laba: ${formatRupiah(getItemLaba(topProfitItem))}` : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABEL PROFITABILITAS PER MENU */}
          <div className="space-y-4">
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
                  onSelect: (vals) => setMarginFilter((vals[0] as 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') || 'ALL'),
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
                  onSelect: (vals) => setSortBy((vals[0] as 'laba_desc' | 'margin_desc' | 'omset_desc') || 'laba_desc'),
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

            <Card className="p-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                <CardTitle className="text-base font-bold">
                  Daftar Kontribusi Laba per Menu
                </CardTitle>
                <CardDescription>
                  Evaluasi harga jual vs HPP setiap menu untuk penetapan harga dan subsidi kantin.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Menu</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Harga Satuan</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modal Unit</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Penjualan</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Modal</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Laba</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Memuat data laba kotor...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                          Tidak ada menu yang sesuai kriteria pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const itemMargin = getItemMargin(item)
                        return (
                          <TableRow key={getItemId(item) || idx} className="border-b border-border last:border-b-0">
                            <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              {item.nama}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryBadgeClass(item.kategoriNama)}`}
                              >
                                {item.kategoriNama || 'Umum'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold tabular-nums">
                              {formatNumber(item.qty ?? 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs tabular-nums">
                              {formatRupiah(getItemHarga(item))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                              {formatRupiah(getItemUnitModal(item))}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm tabular-nums">
                              {formatRupiah(getItemOmset(item))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                              {formatRupiah(getItemModal(item))}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatRupiah(getItemLaba(item))}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-medium tabular-nums ${
                                  itemMargin >= 35
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : itemMargin >= 20
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}
                              >
                                {itemMargin}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                  {filteredItems.length > 0 && (
                    <TableFooter className="bg-muted/50 font-bold border-t border-border">
                      <TableRow>
                        <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                          Total / Rata-rata:
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                          {formatNumber(filteredItems.reduce((acc, item) => acc + (item.qty || 0), 0))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">-</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">-</TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                          {formatRupiah(ringkasan?.penjualanBersih ?? 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                          {formatRupiah(summaryTotalModal)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(summaryLaba)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-semibold tabular-nums text-primary">
                          {summaryMargin}%
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </CardContent>
            </Card>
          </div>
      </Main>
    </>
  )
}
