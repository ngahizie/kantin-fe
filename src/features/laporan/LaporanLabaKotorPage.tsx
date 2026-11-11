import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
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
import { exportTableToPdf } from '@/lib/pdfExport'
import { LaporanExportButton } from './components'
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
        title: 'LAPORAN ANALISIS LABA KOTOR KANTIN SKOOLIA (PRD §9.5)',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Penjualan Bersih (Omset)': formatRupiah(ringkasan.penjualanBersih ?? 0),
          'Total Modal (HPP)': formatRupiah(summaryTotalModal),
          'Total Laba': formatRupiah(summaryLaba),
          'Rata-rata Gross Margin': `${summaryMargin}%`,
        },
        columns: [
          { header: 'No', key: 'menuId', width: 8 },
          { header: 'Nama Menu', key: 'nama', width: 28 },
          { header: 'Kategori', key: 'kategoriNama', width: 18 },
          { header: 'Qty Terjual', key: 'qty', width: 12 },
          { header: 'Harga Satuan (Rp)', key: 'hargaSatuan', width: 16 },
          { header: 'Modal Unit (Rp)', key: 'hpp', width: 14 },
          { header: 'Total Penjualan (Rp)', key: 'total', width: 20 },
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
        title: 'LAPORAN ANALISIS LABA KOTOR KANTIN SKOOLIA',
        subtitle: 'Analisis Margin Penjualan Menu dan Kontribusi Keuntungan',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Penjualan Bersih (Omset)': formatRupiah(ringkasan.penjualanBersih ?? 0),
          'Total Modal (HPP)': formatRupiah(summaryTotalModal),
          'Total Laba': formatRupiah(summaryLaba),
          'Rata-rata Gross Margin': `${summaryMargin}%`,
        },
        columns: [
          { header: 'No', key: 'menuId' },
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
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Laporan Keuangan
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

      <Main>
        <div className="space-y-6 pb-12">
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
            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Laba Kotor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-emerald-600">
                  {ringkasan ? formatRupiah(summaryLaba) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Keuntungan murni setelah dipotong total modal
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
                  {ringkasan ? `${summaryMargin}%` : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rasio laba terhadap penjualan bersih
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Modal (HPP)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatRupiah(summaryTotalModal) : '...'}
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
                  {topProfitItem ? `Laba: ${formatRupiah(getItemLaba(topProfitItem))}` : '-'}
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
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="text-right">Modal Unit</TableHead>
                      <TableHead className="text-right">Total Penjualan</TableHead>
                      <TableHead className="text-right">Total Modal</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600">Laba</TableHead>
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
                      filteredItems.map((item, idx) => {
                        const itemMargin = getItemMargin(item)
                        return (
                          <TableRow key={getItemId(item) || idx}>
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
                                {item.kategoriNama || 'Umum'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {formatNumber(item.qty ?? 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatRupiah(getItemHarga(item))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {formatRupiah(getItemUnitModal(item))}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm">
                              {formatRupiah(getItemOmset(item))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {formatRupiah(getItemModal(item))}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm text-emerald-600">
                              {formatRupiah(getItemLaba(item))}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="secondary"
                                className={`font-mono text-xs ${
                                  itemMargin >= 35
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : itemMargin >= 20
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
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
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
