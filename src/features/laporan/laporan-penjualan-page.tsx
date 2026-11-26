import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  Banknote,
  Layers,
  Loader2,
  RotateCcw,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  UserCheck,
  Wallet,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { getErrorMessage } from '@/lib/validation-error'
import { exportMultiSectionPdf } from '@/lib/pdfExport'
import { useRoleStore } from '@/stores/use-role-store'
import { LaporanDateFilter, getDefaultDateFilter, LaporanExportButton } from './components'
import { laporanApi } from './api/laporan-api'
import { formatMargin, getCategoryBadgeClass } from './laporan-utils'
import type {
  RingkasanPenjualan,
  BarisPenjualanItem,
  BarisPenjualanKategori,
  BarisPenjualanDimensi,
  BarisPenjualanKasir,
  JenisLaporanEkspor,
  LaporanFilterParams,
} from './types'

export function LaporanPenjualanPage() {
  const { currentRole } = useRoleStore()
  const isAdmin = currentRole === 'admin'
  const [ringkasan, setRingkasan] = useState<RingkasanPenjualan | null>(null)
  const [items, setItems] = useState<BarisPenjualanItem[]>([])
  const [kategoris, setKategoris] = useState<BarisPenjualanKategori[]>([])
  const [titikList, setTitikList] = useState<BarisPenjualanDimensi[]>([])
  const [petugasList, setPetugasList] = useState<BarisPenjualanDimensi[]>([])
  const [kasirs, setKasirs] = useState<BarisPenjualanKasir[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isKasirError, setIsKasirError] = useState(false)
  const [isRetryingKasir, setIsRetryingKasir] = useState(false)

  const [activeTab, setActiveTab] = useState<
    'item' | 'kategori' | 'titik' | 'petugas' | 'kasir'
  >('item')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'terlaris' | 'laba' | 'margin'>('terlaris')

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
        setIsKasirError(false)
        const [resRingkasan, resItems, resKategoris, resTitik, resPetugas] = await Promise.all([
          laporanApi.getPenjualan(dateFilterParams),
          laporanApi.getPenjualanPerItem(dateFilterParams),
          laporanApi.getPenjualanPerKategori(dateFilterParams),
          laporanApi.getPenjualanPerTitik(dateFilterParams).catch(() => []),
          laporanApi.getPenjualanPerPetugas(dateFilterParams).catch(() => []),
        ])
        let kasirFailed = false
        const resKasirs = await laporanApi.getPenjualanPerKasir(dateFilterParams).catch((err) => {
          kasirFailed = true
          // eslint-disable-next-line no-console
          console.warn('Endpoint penjualan per kasir belum tersedia atau gagal:', err)
          return []
        })
        if (!isMounted) return
        setRingkasan(resRingkasan)
        setItems(resItems)
        setKategoris(resKategoris)
        setTitikList(resTitik)
        setPetugasList(resPetugas)
        setKasirs(resKasirs)
        setIsKasirError(kasirFailed)
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
  }, [dateFilterParams])

  const handleRetryKasir = async () => {
    try {
      setIsRetryingKasir(true)
      const res = await laporanApi.getPenjualanPerKasir(dateFilterParams)
      setKasirs(res)
      setIsKasirError(false)
      toast.success('Data titik kasir berhasil dimuat ulang')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat ulang data kasir'
      toast.error('Gagal Memuat Kasir', { description: msg })
    } finally {
      setIsRetryingKasir(false)
    }
  }

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

  const getKatId = (k: BarisPenjualanKategori) => k.kategoriId ?? k.kunciId ?? 0
  const getKatOmset = (k: BarisPenjualanKategori) =>
    k.total ?? k.penjualanBersih ?? 0
  const getKatModal = (k: BarisPenjualanKategori) => k.modal ?? k.totalHpp ?? 0
  const getKatLaba = (k: BarisPenjualanKategori) =>
    k.laba ?? k.labaKotor ?? getKatOmset(k) - getKatModal(k)
  const getKatMargin = (k: BarisPenjualanKategori) =>
    k.marginPersen ?? k.margin ?? 0

  const summaryPenjualanBruto = ringkasan?.penjualanBruto ?? 0
  const summaryPenjualanBersih = ringkasan?.penjualanBersih ?? 0
  const summaryJumlahRefund = ringkasan?.jumlahRefund ?? 0
  const summaryNilaiRefund = ringkasan?.nilaiRefund ?? 0
  const summaryTotalModal = ringkasan?.totalModal ?? 0
  const summaryLaba = ringkasan?.laba ?? 0
  const summaryMargin = ringkasan?.marginPersen ?? 0

  // Filter & Sort Items
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

    if (sortBy === 'terlaris') {
      list.sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0))
    } else if (sortBy === 'laba') {
      list.sort(
        (a, b) =>
          (b.laba ?? b.labaKotor ?? 0) - (a.laba ?? a.labaKotor ?? 0)
      )
    } else if (sortBy === 'margin') {
      list.sort(
        (a, b) =>
          (b.marginPersen ?? b.margin ?? 0) - (a.marginPersen ?? a.margin ?? 0)
      )
    }
    return list
  }, [items, searchQuery, sortBy])

  // Filter Kategoris
  const filteredKategoris = useMemo(() => {
    if (!searchQuery.trim()) return kategoris
    const q = searchQuery.toLowerCase()
    return kategoris.filter((k) => (k.nama || '').toLowerCase().includes(q))
  }, [kategoris, searchQuery])

  // Filter Kasirs
  const filteredKasirs = useMemo(() => {
    if (!searchQuery.trim()) return kasirs
    const q = searchQuery.toLowerCase()
    return kasirs.filter(
      (k) =>
        (k.namaTitikKasir || '').toLowerCase().includes(q) ||
        (k.petugas || '').toLowerCase().includes(q)
    )
  }, [kasirs, searchQuery])

  // Filter Titik Kasir
  const filteredTitik = useMemo(() => {
    if (!searchQuery.trim()) return titikList
    const q = searchQuery.toLowerCase()
    return titikList.filter(
      (t) =>
        (t.nama || '').toLowerCase().includes(q) ||
        String(t.kunciId).includes(q)
    )
  }, [titikList, searchQuery])

  // Filter Petugas
  const filteredPetugas = useMemo(() => {
    if (!searchQuery.trim()) return petugasList
    const q = searchQuery.toLowerCase()
    return petugasList.filter(
      (p) =>
        (p.nama || '').toLowerCase().includes(q) ||
        String(p.kunciId).includes(q)
    )
  }, [petugasList, searchQuery])

  // Handler Ekspor Excel resmi via backend (tercatat audit & konsisten RBAC)
  const handleExportExcel = async () => {
    if (!ringkasan) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    const tabToJenis: Record<typeof activeTab, JenisLaporanEkspor> = {
      item: 'PENJUALAN_ITEM',
      kategori: 'PENJUALAN_KATEGORI',
      titik: 'PENJUALAN_TITIK',
      petugas: 'PENJUALAN_PETUGAS',
      kasir: 'PENJUALAN_KASIR',
    }

    try {
      await laporanApi.eksporExcel({
        jenis: tabToJenis[activeTab],
        ...dateFilterParams,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: `Laporan ${tabToJenis[activeTab]} berhasil diunduh dari server.`,
      })
    } catch (err: unknown) {
      toast.error('Gagal Ekspor', {
        description: getErrorMessage(err, 'Gagal mengekspor berkas Excel'),
      })
    }
  }

  // Handler Ekspor PDF (Multi-Section Dokumen Resmi)
  const handleExportPdf = () => {
    if (!ringkasan) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      const exportItems = items.map((item) => ({
        menuId: getItemId(item),
        nama: item.nama || '-',
        kategoriNama: item.kategoriNama || 'Umum',
        qty: item.qty ?? 0,
        hargaSatuan: getItemHarga(item),
        total: getItemOmset(item),
        ...(!isAdmin
          ? {
              hpp: getItemUnitModal(item),
              modal: getItemModal(item),
              laba: getItemLaba(item),
              marginPersen: getItemMargin(item),
            }
          : {}),
      }))
      const exportKategoris = kategoris.map((kat) => ({
        kategoriId: getKatId(kat),
        nama: kat.nama || '-',
        jumlahItem: kat.jumlahItem ?? '-',
        qty: kat.qty ?? 0,
        total: getKatOmset(kat),
        ...(!isAdmin
          ? {
              modal: getKatModal(kat),
              laba: getKatLaba(kat),
              marginPersen: getKatMargin(kat),
            }
          : {}),
      }))

      exportMultiSectionPdf({
        filename: `Laporan_Penjualan_Kantin_${new Date().toISOString().split('T')[0]}`,
        title: isAdmin ? 'LAPORAN PENJUALAN' : 'LAPORAN PENJUALAN & KEUNTUNGAN',
        subtitle: isAdmin
          ? 'Rincian Penjualan Menu, Kategori, dan Titik Kasir'
          : 'Rincian Penjualan Menu, Kategori, dan Titik Kasir',
        metadata: isAdmin
          ? {
              'Tanggal Cetak': formatDateTime(new Date()),
              'Periode Laporan': dateFilterLabel,
              'Total Penjualan Akhir': formatRupiah(summaryPenjualanBersih),
              'Total Transaksi': `${formatNumber(ringkasan.jumlahTransaksi ?? 0)} Trx`,
            }
          : {
              'Tanggal Cetak': formatDateTime(new Date()),
              'Periode Laporan': dateFilterLabel,
              'Total Penjualan Akhir': formatRupiah(summaryPenjualanBersih),
              'Total Harga Modal': formatRupiah(summaryTotalModal),
              'Total Keuntungan': formatRupiah(summaryLaba),
              'Rata-rata Persen Untung': `${summaryMargin}%`,
            },
        sections: [
          {
            sectionTitle: '1. Rincian Penjualan per Item Menu',
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
              ...(!isAdmin
                ? [
                    {
                      header: 'Modal Satuan',
                      key: 'hpp',
                      formatter: (v: unknown) => formatRupiah(Number(v ?? 0)),
                    },
                  ]
                : []),
              {
                header: 'Total Penjualan',
                key: 'total',
                formatter: (v) => formatRupiah(Number(v ?? 0)),
              },
              ...(!isAdmin
                ? [
                    {
                      header: 'Total Modal',
                      key: 'modal',
                      formatter: (v: unknown) => formatRupiah(Number(v ?? 0)),
                    },
                    {
                      header: 'Keuntungan',
                      key: 'laba',
                      formatter: (v: unknown) => formatRupiah(Number(v ?? 0)),
                    },
                    {
                      header: 'Persen Untung',
                      key: 'marginPersen',
                      formatter: (v: unknown) => `${Number(v ?? 0)}%`,
                    },
                  ]
                : []),
            ],
            data: exportItems,
            summaryRow: {
              no: '',
              nama: '',
              kategoriNama: '',
              qty: `${items.reduce((acc, i) => acc + (i.qty || 0), 0)}`,
              hargaSatuan: '',
              ...(!isAdmin ? { hpp: '' } : {}),
              total: formatRupiah(summaryPenjualanBersih),
              ...(!isAdmin
                ? {
                    modal: formatRupiah(summaryTotalModal),
                    laba: formatRupiah(summaryLaba),
                    marginPersen: `${summaryMargin}%`,
                  }
                : {}),
            },
          },
          {
            sectionTitle: '2. Ringkasan Penjualan per Kategori',
            columns: [
              { header: 'No' },
              { header: 'Nama Kategori', key: 'nama' },
              { header: 'Jumlah Item', key: 'jumlahItem' },
              { header: 'Total Qty', key: 'qty' },
              {
                header: 'Total Penjualan',
                key: 'total',
                formatter: (v) => formatRupiah(Number(v ?? 0)),
              },
              ...(!isAdmin
                ? [
                    {
                      header: 'Total Modal',
                      key: 'modal',
                      formatter: (v: unknown) => formatRupiah(Number(v ?? 0)),
                    },
                    {
                      header: 'Keuntungan',
                      key: 'laba',
                      formatter: (v: unknown) => formatRupiah(Number(v ?? 0)),
                    },
                    {
                      header: 'Persen Untung',
                      key: 'marginPersen',
                      formatter: (v: unknown) => `${Number(v ?? 0)}%`,
                    },
                  ]
                : []),
            ],
            data: exportKategoris,
            summaryRow: {
              no: '',
              nama: '',
              jumlahItem: '',
              qty: `${kategoris.reduce((acc, k) => acc + (k.qty || 0), 0)}`,
              total: formatRupiah(summaryPenjualanBersih),
              ...(!isAdmin
                ? {
                    modal: formatRupiah(summaryTotalModal),
                    laba: formatRupiah(summaryLaba),
                    marginPersen: `${summaryMargin}%`,
                  }
                : {}),
            },
          },
          {
            sectionTitle: '3. Performa Titik Kasir POS',
            columns: [
              { header: 'No' },
              { header: 'Titik Kasir', key: 'namaTitikKasir' },
              { header: 'Petugas Jaga', key: 'petugas' },
              { header: 'Jumlah Trx', key: 'jumlahTransaksi' },
              {
                header: 'Total Penjualan (Sebelum Refund)',
                key: 'penjualanBruto',
                formatter: (v) => formatRupiah(Number(v ?? 0)),
              },
              {
                header: 'Nilai Refund',
                key: 'nilaiVoid',
                formatter: (v) => formatRupiah(Number(v ?? 0)),
              },
              {
                header: 'Total Penjualan Akhir',
                key: 'penjualanBersih',
                formatter: (v) => formatRupiah(Number(v ?? 0)),
              },
            ],
            data: kasirs,
            summaryRow: {
              no: '',
              namaTitikKasir: '',
              petugas: '',
              jumlahTransaksi: `${kasirs.reduce((acc, k) => acc + (k.jumlahTransaksi || 0), 0)}`,
              penjualanBruto: formatRupiah(kasirs.reduce((acc, k) => acc + (k.penjualanBruto || 0), 0)),
              nilaiVoid: formatRupiah(kasirs.reduce((acc, k) => acc + (k.nilaiVoid || 0), 0)),
              penjualanBersih: formatRupiah(kasirs.reduce((acc, k) => acc + (k.penjualanBersih || 0), 0)),
            },
          },
        ],
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Dokumen PDF laporan penjualan berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb
          section='Laporan Keuangan'
          title={isAdmin ? 'Laporan Penjualan' : 'Penjualan & Keuntungan'}
        />
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isAdmin ? 'Laporan Penjualan Kantin' : 'Laporan Penjualan & Keuntungan'}
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
          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
              isAdmin ? 'lg:grid-cols-2' : 'lg:grid-cols-4'
            }`}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Penjualan Akhir
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Banknote className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? formatRupiah(summaryPenjualanBersih) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between gap-2 tabular-nums">
                  <span>Sebelum Batal/Refund: {ringkasan ? formatRupiah(summaryPenjualanBruto) : '-'}</span>
                  <span className="text-amber-600 dark:text-amber-400">Refund: {ringkasan ? formatRupiah(summaryNilaiRefund) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            {!isAdmin && (
              <>
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
                      Biaya modal menu terjual
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Keuntungan Penjualan
                    </CardTitle>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tracking-tight tabular-nums text-blue-600 dark:text-blue-400">
                      {ringkasan ? formatRupiah(summaryLaba) : '...'}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant="outline" className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-medium text-blue-700 tabular-nums dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                        Persen Untung: {formatMargin(summaryMargin)}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">dari penjualan akhir</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Volume Transaksi
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? `${formatNumber(ringkasan.jumlahTransaksi ?? 0)} Trx` : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {summaryJumlahRefund} transaksi di-refund
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABS VIEW: PER ITEM, PER KATEGORI, PER TITIK, PER PETUGAS, PER KASIR */}
          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as 'item' | 'kategori' | 'titik' | 'petugas' | 'kasir')
            }
            className="space-y-4"
          >
            <TableToolbar
              extraLeft={
                <TabsList className="flex flex-wrap h-auto w-full sm:w-auto">
                  <TabsTrigger value="item" className="gap-2">
                    <Layers className="h-4 w-4" />
                    <span>Per Menu ({items.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="kategori" className="gap-2">
                    <Tag className="h-4 w-4" />
                    <span>Per Kategori ({kategoris.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="titik" className="gap-2">
                    <Store className="h-4 w-4" />
                    <span>Per Titik Kasir ({titikList.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="petugas" className="gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Per Petugas ({petugasList.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="kasir" className="gap-2">
                    <Store className="h-4 w-4" />
                    <span>Per Kasir ({kasirs.length})</span>
                  </TabsTrigger>
                </TabsList>
              }
              searchPlaceholder="Cari data laporan..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              filters={
                activeTab === 'item' && !isAdmin
                  ? [
                      {
                        title: 'Urutkan',
                        options: [
                          { label: 'Terlaris', value: 'terlaris' },
                          { label: 'Keuntungan Terbesar', value: 'laba' },
                          { label: 'Persen Untung Tertinggi', value: 'margin' },
                        ],
                        selectedValues: [sortBy],
                        onSelect: (vals) => setSortBy((vals[0] as 'terlaris' | 'laba' | 'margin') || 'terlaris'),
                        isSingleSelect: true,
                      },
                    ]
                  : []
              }
              isFiltered={Boolean(searchQuery || (activeTab === 'item' && !isAdmin && sortBy !== 'terlaris'))}
              onReset={() => {
                setSearchQuery('')
                setSortBy('terlaris')
              }}
            />

            {/* TAB CONTENT 1: PENJUALAN PER ITEM */}
            <TabsContent value="item" className="space-y-4">
              <Card className="p-0 gap-0 overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                  <CardTitle className="text-base font-bold">
                    {isAdmin ? 'Penjualan per Item Menu' : 'Penjualan & Keuntungan per Item Menu'}
                  </CardTitle>
                  <CardDescription>
                    {isAdmin
                      ? 'Peringkat menu berdasarkan jumlah terjual dan total penjualan.'
                      : 'Peringkat menu berdasarkan jumlah terjual, harga modal, dan keuntungannya.'}
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
                        {!isAdmin && (
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modal Satuan</TableHead>
                        )}
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Penjualan</TableHead>
                        {!isAdmin && (
                          <>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Modal</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-primary">Keuntungan</TableHead>
                            <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Persen Untung</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 6 : 10} className="h-32 text-center text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Memuat rincian penjualan per menu...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 6 : 10} className="h-24 text-center text-muted-foreground">
                            Tidak ada data item yang cocok.
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
                              {!isAdmin && (
                                <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                                  {formatRupiah(getItemUnitModal(item))}
                                </TableCell>
                              )}
                              <TableCell className="text-right font-mono font-bold text-sm tabular-nums">
                                {formatRupiah(getItemOmset(item))}
                              </TableCell>
                              {!isAdmin && (
                                <>
                                  <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                                    {formatRupiah(getItemModal(item))}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-bold text-sm text-blue-600 dark:text-blue-400 tabular-nums">
                                    {formatRupiah(getItemLaba(item))}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge
                                      variant="outline"
                                      className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-medium tabular-nums ${
                                        (itemMargin || 0) >= 35
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                          : (itemMargin || 0) >= 20
                                          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                                          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                                      }`}
                                    >
                                      {formatMargin(itemMargin)}
                                    </Badge>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                    {filteredItems.length > 0 && (
                      <TableFooter className="bg-muted/50 font-bold border-t border-border">
                        <TableRow>
                          <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                            {isAdmin ? 'Total:' : 'Total / Rata-rata:'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatNumber(filteredItems.reduce((acc, i) => acc + (i.qty || 0), 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">-</TableCell>
                          {!isAdmin && (
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">-</TableCell>
                          )}
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatRupiah(summaryPenjualanBersih)}
                          </TableCell>
                          {!isAdmin && (
                            <>
                              <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                                {formatRupiah(summaryTotalModal)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
                                {formatRupiah(summaryLaba)}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-semibold tabular-nums text-primary">
                                {summaryMargin}%
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB CONTENT 2: PENJUALAN PER KATEGORI */}
            <TabsContent value="kategori" className="space-y-4">
              <Card className="p-0 gap-0 overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                  <CardTitle className="text-base font-bold">
                    {isAdmin ? 'Penjualan per Kategori' : 'Penjualan & Keuntungan per Kategori'}
                  </CardTitle>
                  <CardDescription>
                    {isAdmin
                      ? 'Perbandingan jumlah penjualan antar kelompok kategori makanan/minuman.'
                      : 'Perbandingan total penjualan dan persen untung antar kelompok kategori makanan/minuman.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori Menu</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variasi Menu</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Terjual (Qty)</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Penjualan</TableHead>
                        {!isAdmin && (
                          <>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Modal</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-primary">Keuntungan</TableHead>
                            <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rata-rata Persen Untung</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 5 : 8} className="h-32 text-center text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Memuat data penjualan per kategori...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredKategoris.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 5 : 8} className="h-24 text-center text-muted-foreground">
                            Tidak ada kategori yang cocok.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredKategoris.map((kat, idx) => (
                          <TableRow key={getKatId(kat) || idx} className="border-b border-border last:border-b-0">
                            <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              {kat.nama}
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                              {kat.jumlahItem !== null && kat.jumlahItem !== undefined
                                ? `${kat.jumlahItem} menu`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold tabular-nums">
                              {formatNumber(kat.qty ?? 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm tabular-nums">
                              {formatRupiah(getKatOmset(kat))}
                            </TableCell>
                            {!isAdmin && (
                              <>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                                  {formatRupiah(getKatModal(kat))}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-sm text-blue-600 dark:text-blue-400 tabular-nums">
                                  {formatRupiah(getKatLaba(kat))}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="rounded-full border border-border bg-muted px-2.5 py-0.5 font-mono text-xs font-medium text-foreground tabular-nums">
                                    {formatMargin(getKatMargin(kat))}
                                  </Badge>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    {kategoris.length > 0 && (
                      <TableFooter className="bg-muted/50 font-bold border-t border-border">
                        <TableRow>
                          <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                            {isAdmin ? 'Total:' : 'Total / Rata-rata:'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatNumber(kategoris.reduce((acc, k) => acc + (k.qty || 0), 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatRupiah(summaryPenjualanBersih)}
                          </TableCell>
                          {!isAdmin && (
                            <>
                              <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                                {formatRupiah(summaryTotalModal)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
                                {formatRupiah(summaryLaba)}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-semibold tabular-nums text-primary">
                                {summaryMargin}%
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB CONTENT 3: PENJUALAN PER KASIR */}
            <TabsContent value="kasir" className="space-y-4">
              {isKasirError && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-xs font-semibold">Data Penjualan Titik Kasir Belum Berhasil Dimuat</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Sistem tidak dapat menghubungi server kasir. Angka transaksi yang ditampilkan mungkin tidak lengkap.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetryKasir}
                    disabled={isRetryingKasir}
                    className="h-8 shrink-0 gap-1.5 border-amber-300 bg-white text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-100 dark:hover:bg-amber-800/60"
                  >
                    {isRetryingKasir ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    <span>Muat Ulang Kasir</span>
                  </Button>
                </div>
              )}
              <Card className="p-0 gap-0 overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                  <CardTitle className="text-base font-bold">
                    Penjualan per Titik Kasir & Petugas
                  </CardTitle>
                  <CardDescription>
                    Rekap transaksi masuk, pembatalan/refund, dan penjualan akhir per titik kasir.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titik Kasir</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Petugas Jaga</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah Transaksi</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Penjualan (Sebelum Refund)</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Nilai Refund</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-primary">Total Penjualan Akhir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Memuat data penjualan per titik kasir...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredKasirs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            {isKasirError
                              ? 'Gagal memuat rincian data kasir dari server. Silakan klik Muat Ulang Kasir.'
                              : 'Tidak ada titik kasir yang cocok.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredKasirs.map((kasir, idx) => (
                          <TableRow key={kasir.titikKasirId ?? idx} className="border-b border-border last:border-b-0">
                            <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              {kasir.namaTitikKasir || `Kasir #${kasir.titikKasirId}`}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {kasir.petugas || '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold tabular-nums">
                              {formatNumber(kasir.jumlahTransaksi ?? 0)} trx
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm tabular-nums">
                              {formatRupiah(kasir.penjualanBruto ?? 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                              {formatRupiah(kasir.nilaiVoid ?? 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatRupiah(kasir.penjualanBersih ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    {filteredKasirs.length > 0 && (
                      <TableFooter className="bg-muted/50 font-bold border-t border-border">
                        <TableRow>
                          <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                            Total Penjualan Kasir:
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatNumber(filteredKasirs.reduce((acc, k) => acc + (k.jumlahTransaksi || 0), 0))} trx
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatRupiah(filteredKasirs.reduce((acc, k) => acc + (k.penjualanBruto || 0), 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatRupiah(filteredKasirs.reduce((acc, k) => acc + (k.nilaiVoid || 0), 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatRupiah(filteredKasirs.reduce((acc, k) => acc + (k.penjualanBersih || 0), 0))}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB CONTENT: PER TITIK KASIR & PER PETUGAS (GET /api/laporan/penjualan/titik & /petugas) */}
            {(
              [
                {
                  tab: 'titik',
                  title: 'Penjualan per Titik Kasir',
                  description: 'Rekap transaksi, nilai penjualan, dan laba kotor per titik pos kasir.',
                  columnLabel: 'Titik Kasir',
                  prefix: 'Titik #',
                  rows: filteredTitik,
                },
                {
                  tab: 'petugas',
                  title: 'Penjualan per Petugas',
                  description: 'Rekap transaksi, nilai penjualan, dan laba kotor per petugas kasir.',
                  columnLabel: 'Petugas',
                  prefix: 'Petugas #',
                  rows: filteredPetugas,
                },
              ] as const
            ).map(({ tab, title, description, columnLabel, prefix, rows }) => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                <Card className="p-0 gap-0 overflow-hidden">
                  <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                    <CardTitle className="text-base font-bold">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{columnLabel}</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah Transaksi</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Penjualan</TableHead>
                          {!isAdmin && (
                            <>
                              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Modal (HPP)</TableHead>
                              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-primary">Laba Kotor</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={isAdmin ? 4 : 6} className="h-32 text-center text-muted-foreground">
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Memuat data {title.toLowerCase()}...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isAdmin ? 4 : 6} className="h-24 text-center text-muted-foreground">
                              Tidak ada data yang cocok.
                            </TableCell>
                          </TableRow>
                        ) : (
                          rows.map((row, idx) => (
                            <TableRow key={row.kunciId ?? idx} className="border-b border-border last:border-b-0">
                              <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                {row.nama || `${prefix}${row.kunciId}`}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold tabular-nums">
                                {formatNumber(row.jumlahTransaksi ?? 0)} trx
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                {formatRupiah(row.nilai ?? 0)}
                              </TableCell>
                              {!isAdmin && (
                                <>
                                  <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                                    {row.hpp != null ? formatRupiah(row.hpp) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-semibold text-sm tabular-nums text-primary">
                                    {row.labaKotor != null ? formatRupiah(row.labaKotor) : '-'}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
      </Main>
    </>
  )
}
