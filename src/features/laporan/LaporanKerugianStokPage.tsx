import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  PackageX,
  RotateCcw,
  Trash2,
  TrendingDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { exportTableToExcel } from '@/lib/excelExport'
import { exportTableToPdf } from '@/lib/pdfExport'
import { LaporanDateFilter, getDefaultDateFilter, LaporanExportButton } from './components'
import { laporanApi, MAX_KERUGIAN_STOK_PAGE_SIZE } from './api/laporan-api'
import type { BarisKerugianStok, RingkasanKerugianStok, LaporanFilterParams } from './types'

const DEFAULT_PAGE_SIZE = 50

export interface LaporanKerugianStokPageProps {
  /** Ukuran halaman paginasi server (default 50, dibatasi maks 200 sesuai batas BE) */
  pageSize?: number
}

function applyKerugianFilterAndSort(
  source: BarisKerugianStok[],
  searchQuery: string,
  jenisFilter: 'ALL' | 'OPNAME_KELUAR' | 'BARANG_RUSAK',
  sortBy: 'nilai_desc' | 'qty_desc' | 'waktu_desc'
): BarisKerugianStok[] {
  let list = [...source]

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    list = list.filter(
      (k) =>
        (k.namaMenu || '').toLowerCase().includes(q) ||
        (k.kategoriNama || '').toLowerCase().includes(q) ||
        (k.alasan || '').toLowerCase().includes(q) ||
        (k.beritaAcaraId || '').toLowerCase().includes(q) ||
        (k.petugas || '').toLowerCase().includes(q)
    )
  }

  if (jenisFilter !== 'ALL') {
    list = list.filter((k) => k.jenis === jenisFilter)
  }

  if (sortBy === 'nilai_desc') {
    list.sort((a, b) => b.totalNilai - a.totalNilai)
  } else if (sortBy === 'qty_desc') {
    list.sort((a, b) => b.qty - a.qty)
  } else if (sortBy === 'waktu_desc') {
    list.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
  }

  return list
}

export function LaporanKerugianStokPage({ pageSize = DEFAULT_PAGE_SIZE }: LaporanKerugianStokPageProps = {}) {
  const safePageSize = Math.min(
    MAX_KERUGIAN_STOK_PAGE_SIZE,
    Math.max(1, Math.floor(pageSize))
  )

  const [kerugianList, setKerugianList] = useState<BarisKerugianStok[]>([])
  const [allPeriodItems, setAllPeriodItems] = useState<BarisKerugianStok[] | null>(null)
  const [ringkasan, setRingkasan] = useState<RingkasanKerugianStok | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    showing: 0,
    totalPages: 0,
    currentPage: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAllForFilter, setIsLoadingAllForFilter] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [jenisFilter, setJenisFilter] = useState<'ALL' | 'OPNAME_KELUAR' | 'BARANG_RUSAK'>('ALL')
  const [sortBy, setSortBy] = useState<'nilai_desc' | 'qty_desc' | 'waktu_desc'>('nilai_desc')

  // Filter Tanggal / Rentang Waktu (Default: Hari Ini)
  const [dateFilterParams, setDateFilterParams] = useState<LaporanFilterParams>(
    () => getDefaultDateFilter().params
  )
  const [dateFilterLabel, setDateFilterLabel] = useState<string>(
    () => getDefaultDateFilter().label
  )

  const isClientFilterActive = Boolean(searchQuery.trim() || jenisFilter !== 'ALL')

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        setIsLoading(true)
        setIsError(false)
        setErrorMessage('')
        const [resHalaman, resRingkasan] = await Promise.all([
          laporanApi.getKerugianStokHalaman({
            ...dateFilterParams,
            halaman: Math.max(0, currentPage - 1),
            ukuran: safePageSize,
          }),
          laporanApi.getRingkasanKerugianStok(dateFilterParams),
        ])
        if (!isMounted) return
        setKerugianList(resHalaman.items)
        setPaginationMeta({
          total: resHalaman.total,
          showing: resHalaman.showing,
          totalPages: resHalaman.totalPages,
          currentPage: resHalaman.currentPage,
        })
        setRingkasan(resRingkasan)
      } catch (err: unknown) {
        if (!isMounted) return
        setIsError(true)
        const msg = err instanceof Error ? err.message : 'Gagal memuat kerugian stok'
        setErrorMessage(msg)
        toast.error('Gagal Memuat Laporan', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [dateFilterParams, currentPage, safePageSize, reloadTrigger])

  // Bila filter/pencarian diaktifkan pada dataset berhalaman (>1 halaman), muat semua halaman agar tidak terpotong
  useEffect(() => {
    if (!isClientFilterActive || paginationMeta.totalPages <= 1 || allPeriodItems !== null) {
      return
    }
    let isMounted = true
    const loadAll = async () => {
      try {
        setIsLoadingAllForFilter(true)
        const allRows = await laporanApi.getSemuaKerugianStok(dateFilterParams)
        if (!isMounted) return
        setAllPeriodItems(allRows)
      } catch {
        // Fallback aman ke halaman aktif bila muat semua gagal
      } finally {
        if (isMounted) setIsLoadingAllForFilter(false)
      }
    }
    void loadAll()
    return () => {
      isMounted = false
    }
  }, [isClientFilterActive, paginationMeta.totalPages, allPeriodItems, dateFilterParams])

  const handleRetry = () => {
    setAllPeriodItems(null)
    setReloadTrigger((prev) => prev + 1)
  }

  const activeSourceList =
    isClientFilterActive && paginationMeta.totalPages > 1 && allPeriodItems !== null
      ? allPeriodItems
      : kerugianList

  // Filter & Urutan
  const filteredList = useMemo(
    () => applyKerugianFilterAndSort(activeSourceList, searchQuery, jenisFilter, sortBy),
    [activeSourceList, searchQuery, jenisFilter, sortBy]
  )

  const totalItems = isClientFilterActive
    ? filteredList.length
    : ringkasan?.jumlahKejadian || paginationMeta.total || filteredList.length

  const totalDisplayPages = isClientFilterActive
    ? Math.max(1, Math.ceil(filteredList.length / safePageSize))
    : Math.max(1, paginationMeta.totalPages || (totalItems > 0 ? Math.ceil(totalItems / safePageSize) : 1))

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalDisplayPages)

  const displayedList = useMemo(() => {
    if (!isClientFilterActive) {
      return filteredList
    }
    const start = (safeCurrentPage - 1) * safePageSize
    return filteredList.slice(start, start + safePageSize)
  }, [filteredList, isClientFilterActive, safeCurrentPage, safePageSize])

  const footerTotalQty =
    !isClientFilterActive && ringkasan
      ? ringkasan.totalQtyHilang
      : filteredList.reduce((acc, k) => acc + (k.qty || 0), 0)

  const footerTotalNilai =
    !isClientFilterActive && ringkasan
      ? ringkasan.totalKerugian
      : filteredList.reduce((acc, k) => acc + (k.totalNilai || 0), 0)

  const resolveExportPayload = async () => {
    let sourceRows =
      paginationMeta.totalPages > 1 && allPeriodItems !== null
        ? allPeriodItems
        : activeSourceList
    if (paginationMeta.totalPages > 1 && allPeriodItems === null) {
      sourceRows = await laporanApi.getSemuaKerugianStok(dateFilterParams)
      setAllPeriodItems(sourceRows)
    }
    const rows = applyKerugianFilterAndSort(sourceRows, searchQuery, jenisFilter, sortBy)
    const totalQty =
      !isClientFilterActive && ringkasan
        ? ringkasan.totalQtyHilang
        : rows.reduce((acc, k) => acc + (k.qty || 0), 0)
    const totalNilai =
      !isClientFilterActive && ringkasan
        ? ringkasan.totalKerugian
        : rows.reduce((acc, k) => acc + (k.totalNilai || 0), 0)
    return { rows, totalQty, totalNilai }
  }

  // Ekspor Excel
  const handleExportExcel = async () => {
    if (kerugianList.length === 0) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      setIsExporting(true)
      const { rows, totalQty, totalNilai } = await resolveExportPayload()

      exportTableToExcel({
        filename: `Laporan_Kerugian_Stok_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Kerugian Stok',
        title: 'LAPORAN KERUGIAN STOK',
        metadata: {
          'Tanggal Cetak': formatDateTime(new Date()),
          'Periode': dateFilterLabel,
          'Total Nilai Kerugian': formatRupiah(ringkasan?.totalKerugian || 0),
          'Total Qty Hilang/Rusak': `${ringkasan?.totalQtyHilang || 0} Unit`,
          'Kerugian Opname Keluar': formatRupiah(ringkasan?.kerugianOpname || 0),
          'Kerugian Barang Rusak': formatRupiah(ringkasan?.kerugianBarangRusak || 0),
        },
        columns: [
          { header: 'No', width: 6 },
          { header: 'Waktu Kejadian', key: 'waktu', formatter: (v) => formatDateTime(v as string | Date), width: 20 },
          { header: 'No. Berita Acara', key: 'beritaAcaraId', width: 22 },
          { header: 'Nama Menu / Item', key: 'namaMenu', width: 26 },
          { header: 'Kategori', key: 'kategoriNama', width: 16 },
          {
            header: 'Jenis Kerugian',
            key: 'jenis',
            formatter: (v) => (v === 'OPNAME_KELUAR' ? 'Stok Berkurang (Cek Fisik)' : 'Barang Rusak / Basi'),
            width: 20,
          },
          { header: 'Qty Hilang', key: 'qty', width: 12 },
          { header: 'Modal Satuan (Rp)', key: 'hppSnapshot', width: 16 },
          { header: 'Total Kerugian (Rp)', key: 'totalNilai', width: 18 },
          { header: 'Alasan / Berita Acara', key: 'alasan', width: 35 },
          { header: 'Petugas Pencatat', key: 'petugas', width: 20 },
        ],
        data: rows,
        summaryRow: {
          no: '',
          waktu: '',
          beritaAcaraId: '',
          namaMenu: '',
          kategoriNama: '',
          jenis: '',
          qty: totalQty,
          hppSnapshot: '',
          totalNilai,
          alasan: '',
          petugas: '',
        },
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Laporan Kerugian Stok (.xlsx) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas Excel'
      toast.error('Gagal Ekspor', { description: msg })
    } finally {
      setIsExporting(false)
    }
  }

  // Ekspor PDF
  const handleExportPdf = async () => {
    if (kerugianList.length === 0) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      setIsExporting(true)
      const { rows, totalQty, totalNilai } = await resolveExportPayload()

      exportTableToPdf({
        filename: `Laporan_Kerugian_Stok_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN KERUGIAN STOK',
        subtitle: 'Daftar Selisih Stok Opname dan Barang Rusak/Kadaluarsa',
        metadata: {
          'Tanggal Cetak': formatDateTime(new Date()),
          'Periode': dateFilterLabel,
          'Total Nilai Kerugian': formatRupiah(ringkasan?.totalKerugian || 0),
          'Total Qty Hilang/Rusak': `${ringkasan?.totalQtyHilang || 0} Unit`,
          'Kerugian Opname Keluar': formatRupiah(ringkasan?.kerugianOpname || 0),
          'Kerugian Barang Rusak': formatRupiah(ringkasan?.kerugianBarangRusak || 0),
        },
        columns: [
          { header: 'No' },
          {
            header: 'Waktu Kejadian',
            key: 'waktu',
            formatter: (v) => formatDateTime(v as string | Date),
          },
          { header: 'No. Berita Acara', key: 'beritaAcaraId' },
          { header: 'Nama Menu / Item', key: 'namaMenu' },
          { header: 'Kategori', key: 'kategoriNama' },
          {
            header: 'Jenis Kerugian',
            key: 'jenis',
            formatter: (v) => (v === 'OPNAME_KELUAR' ? 'Stok Berkurang (Cek Fisik)' : 'Barang Rusak / Basi'),
          },
          { header: 'Qty Hilang', key: 'qty' },
          {
            header: 'Modal Satuan',
            key: 'hppSnapshot',
            formatter: (v) => formatRupiah(Number(v)),
          },
          {
            header: 'Total Kerugian',
            key: 'totalNilai',
            formatter: (v) => formatRupiah(Number(v)),
          },
          { header: 'Alasan / Berita Acara', key: 'alasan' },
          { header: 'Petugas Pencatat', key: 'petugas' },
        ],
        data: rows,
        summaryRow: {
          no: '',
          waktu: '',
          beritaAcaraId: '',
          namaMenu: '',
          kategoriNama: '',
          jenis: '',
          qty: `${totalQty} Unit`,
          hppSnapshot: '',
          totalNilai: formatRupiah(totalNilai),
          alasan: '',
          petugas: '',
        },
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Laporan Kerugian Stok (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Laporan Keuangan' title='Kerugian Stok' />
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Laporan Kerugian Stok
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Periode: <strong className="text-foreground">{dateFilterLabel}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <LaporanDateFilter
                hidePresets
                initialPreset="TODAY"
                onChange={(params, label) => {
                  setDateFilterParams(params)
                  setDateFilterLabel(label)
                  setCurrentPage(1)
                  setAllPeriodItems(null)
                }}
              />
              <LaporanExportButton
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                disabled={isLoading || isExporting || kerugianList.length === 0}
              />
            </div>
          </div>

          {/* Error Alert Banner */}
          {isError && (
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Gagal Memuat Data Kerugian Stok</p>
                  <p className="text-[11px] opacity-90">
                    {errorMessage || 'Terjadi kesalahan saat menghubungi server. Data yang ditampilkan mungkin tidak mutakhir.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="h-8 shrink-0 gap-1.5 border-destructive/40 bg-background text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Coba Lagi</span>
              </Button>
            </div>
          )}

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Nilai Kerugian
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? formatRupiah(ringkasan.totalKerugian) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Qty × Modal satuan saat kejadian
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Qty Hilang / Rusak
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <PackageX className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? `${formatNumber(ringkasan.totalQtyHilang)} Unit` : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  Dari {ringkasan?.jumlahKejadian || 0} berita acara pencatatan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Barang Rusak / Basi
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                  <Trash2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? formatRupiah(ringkasan.kerugianBarangRusak) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {ringkasan ? `${ringkasan.qtyBarangRusak} unit rusak/kadaluarsa` : '-'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Selisih Cek Stok Fisik
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <ClipboardList className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? formatRupiah(ringkasan.kerugianOpname) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {ringkasan ? `${ringkasan.qtyOpname} unit selisih fisik minus` : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABEL RINCIAN MUTASI KERUGIAN */}
          <div className="space-y-4">
            <TableToolbar
              searchPlaceholder="Cari menu, alasan, BA..."
              searchValue={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val)
                setCurrentPage(1)
              }}
              filters={[
                {
                  title: 'Jenis Kerugian',
                  options: [
                    { label: 'Barang Rusak / Basi', value: 'BARANG_RUSAK' },
                    { label: 'Stok Berkurang (Cek Fisik)', value: 'OPNAME_KELUAR' },
                  ],
                  selectedValues: jenisFilter !== 'ALL' ? [jenisFilter] : [],
                  onSelect: (vals) => {
                    setJenisFilter((vals[0] as 'ALL' | 'OPNAME_KELUAR' | 'BARANG_RUSAK') || 'ALL')
                    setCurrentPage(1)
                  },
                  isSingleSelect: true,
                },
                {
                  title: 'Urutkan',
                  options: [
                    { label: 'Kerugian Terbesar', value: 'nilai_desc' },
                    { label: 'Qty Terbanyak', value: 'qty_desc' },
                    { label: 'Waktu Terbaru', value: 'waktu_desc' },
                  ],
                  selectedValues: sortBy !== 'nilai_desc' ? [sortBy] : [],
                  onSelect: (vals) => setSortBy((vals[0] as 'nilai_desc' | 'qty_desc' | 'waktu_desc') || 'nilai_desc'),
                  isSingleSelect: true,
                },
              ]}
              isFiltered={Boolean(searchQuery || jenisFilter !== 'ALL' || sortBy !== 'nilai_desc')}
              onReset={() => {
                setSearchQuery('')
                setJenisFilter('ALL')
                setSortBy('nilai_desc')
                setCurrentPage(1)
              }}
            />

            <Card className="p-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                <CardTitle className="text-base font-bold">
                  Daftar Mutasi Kerugian & Selisih Stok
                </CardTitle>
                <CardDescription>
                  Rincian setiap kejadian barang rusak atau selisih stok opname lengkap dengan berita acara.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu & Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">No. Berita Acara</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nama Menu</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty Hilang</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modal Satuan</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-destructive">Total Kerugian</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alasan / Keterangan</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Petugas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading || isLoadingAllForFilter ? (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Memuat data kerugian stok...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : displayedList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                          {isError
                            ? 'Gagal memuat data kerugian stok dari server. Silakan klik Coba Lagi.'
                            : 'Tidak ditemukan data kerugian yang cocok.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedList.map((item, idx) => (
                        <TableRow key={item.id} className="border-b border-border last:border-b-0">
                          <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                            {(safeCurrentPage - 1) * safePageSize + idx + 1}
                          </TableCell>
                          <TableCell className="text-xs font-medium whitespace-nowrap tabular-nums">
                            {item.waktu ? formatDateTime(item.waktu) : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                            {item.beritaAcaraId || '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {item.namaMenu || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {item.kategoriNama || 'Umum'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                item.jenis === 'BARANG_RUSAK'
                                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {item.jenis === 'BARANG_RUSAK' ? 'Barang Rusak' : 'Opname Keluar'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm tabular-nums">
                            {formatNumber(item.qty)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                            {formatRupiah(item.hppSnapshot)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-destructive tabular-nums">
                            {formatRupiah(item.totalNilai)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">
                            {item.alasan || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.petugas || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {!isLoading && !isLoadingAllForFilter && displayedList.length > 0 && (
                    <TableFooter className="bg-muted/50 font-bold border-t border-border">
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                          Total ({formatNumber(totalItems)} Item)
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm tabular-nums text-foreground">
                          {formatNumber(footerTotalQty)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">-</TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-destructive tabular-nums">
                          {formatRupiah(footerTotalNilai)}
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>

                {/* Kontrol Paginasi */}
                {!isLoading && !isLoadingAllForFilter && totalItems > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-3">
                    <div className="text-xs font-medium text-muted-foreground tabular-nums">
                      Menampilkan{' '}
                      <span className="font-semibold text-foreground">
                        {(safeCurrentPage - 1) * safePageSize + 1}–
                        {Math.min(
                          (safeCurrentPage - 1) * safePageSize + displayedList.length,
                          totalItems
                        )}
                      </span>{' '}
                      dari <span className="font-semibold text-foreground">{formatNumber(totalItems)}</span> kejadian
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        Halaman <span className="font-semibold text-foreground">{safeCurrentPage}</span> dari{' '}
                        <span className="font-semibold text-foreground">{totalDisplayPages}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safeCurrentPage <= 1 || isLoading}
                          className="h-8 gap-1 text-xs"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Sebelumnya
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalDisplayPages, p + 1))}
                          disabled={safeCurrentPage >= totalDisplayPages || isLoading}
                          className="h-8 gap-1 text-xs"
                        >
                          Selanjutnya
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      </Main>
    </>
  )
}
