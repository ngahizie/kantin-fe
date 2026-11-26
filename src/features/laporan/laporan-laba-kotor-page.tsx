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
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import { sanitizeFormulaCell } from '@/lib/excelExport'
import { getErrorMessage } from '@/lib/validation-error'
import { exportTableToPdf } from '@/lib/pdfExport'
import {
  LaporanDateFilter,
  getDefaultDateFilter,
  LaporanExportButton,
} from './components'
import { laporanApi } from './api/laporan-api'
import { getCategoryBadgeClass } from './laporan-utils'
import type {
  RingkasanPenjualan,
  BarisPenjualanItem,
  LaporanFilterParams,
} from './types'

// Helper normalisasi nilai agar aman menghadapi data langsung BE #291 maupun mock
const getItemId = (i: BarisPenjualanItem) => i.menuId ?? i.kunciId ?? 0
const getItemOmset = (i: BarisPenjualanItem) =>
  Math.max(0, Number(i.total ?? i.penjualanBersih) || 0)
const getItemModal = (i: BarisPenjualanItem) =>
  Math.max(0, Number(i.modal ?? i.totalHpp) || 0)
const getItemLaba = (i: BarisPenjualanItem) => {
  const rawLaba = i.laba ?? i.labaKotor
  if (rawLaba !== undefined && rawLaba !== null && Number.isFinite(Number(rawLaba))) {
    return Number(rawLaba)
  }
  return getItemOmset(i) - getItemModal(i)
}
const getItemMargin = (i: BarisPenjualanItem) => {
  const rawMargin = i.marginPersen ?? i.margin
  if (rawMargin !== undefined && rawMargin !== null && Number.isFinite(Number(rawMargin))) {
    return Number(rawMargin)
  }
  const omset = getItemOmset(i)
  return omset > 0 ? Number(((getItemLaba(i) / omset) * 100).toFixed(1)) : 0
}
const getItemHarga = (i: BarisPenjualanItem) => {
  const rawHarga = i.hargaSatuan ?? i.hargaJual
  if (rawHarga !== undefined && rawHarga !== null && Number.isFinite(Number(rawHarga))) {
    return Math.max(0, Number(rawHarga))
  }
  const qty = Number(i.qty) || 0
  return qty > 0 ? Math.max(0, Math.round(getItemOmset(i) / qty)) : 0
}
const getItemUnitModal = (i: BarisPenjualanItem) => {
  const rawHpp = i.hpp
  if (rawHpp !== undefined && rawHpp !== null && Number.isFinite(Number(rawHpp))) {
    return Math.max(0, Number(rawHpp))
  }
  const qty = Number(i.qty) || 0
  return qty > 0 ? Math.max(0, Math.round(getItemModal(i) / qty)) : 0
}

export function LaporanLabaKotorPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanPenjualan | null>(null)
  const [items, setItems] = useState<BarisPenjualanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [marginFilter, setMarginFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')
  const [sortBy, setSortBy] = useState<'laba_desc' | 'margin_desc' | 'omset_desc'>('laba_desc')

  // Filter Tanggal / Rentang Waktu (Default: Hari Ini)
  const [dateFilterParams, setDateFilterParams] = useState<LaporanFilterParams>(
    () => getDefaultDateFilter().params
  )
  const [dateFilterLabel, setDateFilterLabel] = useState<string>(
    () => getDefaultDateFilter().label
  )

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        setIsLoading(true)
        const [resRingkasan, resItems] = await Promise.all([
          laporanApi.getPenjualan(dateFilterParams),
          laporanApi.getPenjualanPerItem(dateFilterParams),
        ])
        if (!isMounted) return
        setRingkasan(resRingkasan)
        setItems(resItems)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat laporan keuntungan'
        toast.error('Gagal Memuat Laporan Keuntungan', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [dateFilterParams])

  const summaryTotalModal = Math.max(
    0,
    Number(
      ringkasan?.totalModal ??
      (ringkasan as (RingkasanPenjualan & { totalHpp?: number }) | null)?.totalHpp
    ) || 0
  )
  const summaryLaba = Number(
    ringkasan?.laba ??
    (ringkasan as (RingkasanPenjualan & { labaKotor?: number }) | null)?.labaKotor
  ) || 0
  const summaryMargin = Number(
    ringkasan?.marginPersen ??
    (ringkasan as (RingkasanPenjualan & { marginLabaPersen?: number }) | null)?.marginLabaPersen
  ) || 0

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
      list = list.filter((i) => getItemMargin(i) >= 35)
    } else if (marginFilter === 'MEDIUM') {
      list = list.filter((i) => {
        const m = getItemMargin(i)
        return m >= 20 && m < 35
      })
    } else if (marginFilter === 'LOW') {
      list = list.filter((i) => getItemMargin(i) < 20)
    }

    if (sortBy === 'laba_desc') {
      list.sort((a, b) => getItemLaba(b) - getItemLaba(a))
    } else if (sortBy === 'margin_desc') {
      list.sort((a, b) => getItemMargin(b) - getItemMargin(a))
    } else if (sortBy === 'omset_desc') {
      list.sort((a, b) => getItemOmset(b) - getItemOmset(a))
    }

    return list
  }, [items, searchQuery, marginFilter, sortBy])

  // Hitung menu kontributor laba terbesar
  const topProfitItem = useMemo(() => {
    if (items.length === 0) return null
    return [...items].sort((a, b) => getItemLaba(b) - getItemLaba(a))[0]
  }, [items])

  const handleExportExcel = async () => {
    if (!ringkasan) {
      toast.error('Data belum siap diekspor')
      return
    }

    try {
      await laporanApi.eksporExcel({
        jenis: 'PENJUALAN_ITEM',
        ...dateFilterParams,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Laporan Keuntungan Penjualan (.xlsx) berhasil diunduh.',
      })
    } catch (err: unknown) {
      toast.error('Gagal Ekspor', {
        description: getErrorMessage(err, 'Gagal mengekspor berkas Excel'),
      })
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
        nama: sanitizeFormulaCell(item.nama),
        kategoriNama: sanitizeFormulaCell(item.kategoriNama || 'Umum'),
        qty: Math.max(0, Number(item.qty) || 0),
        hargaSatuan: getItemHarga(item),
        hpp: getItemUnitModal(item),
        total: getItemOmset(item),
        modal: getItemModal(item),
        laba: getItemLaba(item),
        marginPersen: getItemMargin(item),
      }))

      exportTableToPdf({
        filename: `Laporan_Keuntungan_Kantin_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN KEUNTUNGAN PENJUALAN',
        subtitle: 'Rincian Persen Untung Penjualan Menu dan Kontribusi Keuntungan',
        metadata: {
          'Periode': dateFilterLabel,
          'Tanggal Cetak': formatDateTime(new Date()),
          'Total Penjualan Akhir': formatRupiah(ringkasan.penjualanBersih ?? 0),
          'Total Harga Modal': formatRupiah(summaryTotalModal),
          'Total Keuntungan': formatRupiah(summaryLaba),
          'Rata-rata Persen Untung': `${summaryMargin}%`,
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
            header: 'Modal Satuan',
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
            header: 'Keuntungan',
            key: 'laba',
            formatter: (v) => formatRupiah(Number(v ?? 0)),
          },
          {
            header: 'Persen Untung',
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
        description: 'Laporan Keuntungan Penjualan (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Laporan Keuangan' title='Laporan Keuntungan' />
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Laporan Keuntungan Penjualan
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <LaporanDateFilter
                hidePresets
                initialPreset="TODAY"
                onChange={(params, label) => {
                  setDateFilterParams(params)
                  setDateFilterLabel(label)
                }}
              />
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
                  Total Keuntungan Penjualan
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
                  Keuntungan murni setelah dikurangi total harga modal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rata-rata Persen Untung
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
                  Persentase untung dari total penjualan akhir
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Harga Modal
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
                  Total modal belanja menu terjual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Menu Paling Untung
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
                  {topProfitItem ? `Untung: ${formatRupiah(getItemLaba(topProfitItem))}` : '-'}
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
                  title: 'Persen Untung',
                  options: [
                    { label: 'Untung Tinggi (≥ 35%)', value: 'HIGH' },
                    { label: 'Untung Sedang (20-34%)', value: 'MEDIUM' },
                    { label: 'Untung Tipis (< 20%)', value: 'LOW' },
                  ],
                  selectedValues: marginFilter !== 'ALL' ? [marginFilter] : [],
                  onSelect: (vals) => setMarginFilter((vals[0] as 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') || 'ALL'),
                  isSingleSelect: true,
                },
                {
                  title: 'Urutkan',
                  options: [
                    { label: 'Keuntungan Terbesar', value: 'laba_desc' },
                    { label: 'Persen Untung Tertinggi', value: 'margin_desc' },
                    { label: 'Penjualan Tertinggi', value: 'omset_desc' },
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
                  Daftar Keuntungan per Menu
                </CardTitle>
                <CardDescription>
                  Perbandingan harga jual dan harga modal setiap menu di kantin.
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
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modal Satuan</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Penjualan</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Modal</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Keuntungan</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Persen Untung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Memuat data keuntungan penjualan...</span>
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
