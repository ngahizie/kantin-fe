import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  Banknote,
  Layers,
  Loader2,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { formatRupiah, formatNumber } from '@/lib/formatters'
import { exportMultiSheetExcel } from '@/lib/excelExport'
import { exportMultiSectionPdf } from '@/lib/pdfExport'
import { LaporanDateFilter, getDefaultDateFilter, LaporanExportButton } from './components'
import { laporanApi } from './api/laporan-api'
import { formatMargin } from './laporan-utils'
import type {
  RingkasanPenjualan,
  BarisPenjualanItem,
  BarisPenjualanKategori,
  BarisPenjualanKasir,
  LaporanFilterParams,
} from './types'

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

export function LaporanPenjualanPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanPenjualan | null>(null)
  const [items, setItems] = useState<BarisPenjualanItem[]>([])
  const [kategoris, setKategoris] = useState<BarisPenjualanKategori[]>([])
  const [kasirs, setKasirs] = useState<BarisPenjualanKasir[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'item' | 'kategori' | 'kasir'>('item')
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
        const [resRingkasan, resItems, resKategoris] = await Promise.all([
          laporanApi.getPenjualan(dateFilterParams),
          laporanApi.getPenjualanPerItem(dateFilterParams),
          laporanApi.getPenjualanPerKategori(dateFilterParams),
        ])
        const resKasirs = await laporanApi.getPenjualanPerKasir(dateFilterParams).catch((err) => {
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
  }, [dateFilterParams])

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

  // Handler Ekspor Excel (Multi-Sheet Lengkap)
  const handleExportExcel = () => {
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
        hpp: getItemUnitModal(item),
        total: getItemOmset(item),
        modal: getItemModal(item),
        laba: getItemLaba(item),
        marginPersen: getItemMargin(item),
      }))
      const exportKategoris = kategoris.map((kat) => ({
        kategoriId: getKatId(kat),
        nama: kat.nama || '-',
        jumlahItem: kat.jumlahItem ?? '-',
        qty: kat.qty ?? 0,
        total: getKatOmset(kat),
        modal: getKatModal(kat),
        laba: getKatLaba(kat),
        marginPersen: getKatMargin(kat),
      }))

      exportMultiSheetExcel({
        filename: `Laporan_Penjualan_Kantin_${new Date().toISOString().split('T')[0]}`,
        sheets: [
          {
            sheetName: 'Penjualan per Item',
            title: 'LAPORAN PENJUALAN PER ITEM MENU',
            metadata: {
              'Tanggal Cetak': new Date().toLocaleString('id-ID'),
              'Periode Laporan': dateFilterLabel,
              'Penjualan Bersih Total': formatRupiah(summaryPenjualanBersih),
              'Total Modal (HPP)': formatRupiah(summaryTotalModal),
              'Laba Total': formatRupiah(summaryLaba),
              'Rata-rata Margin': `${summaryMargin}%`,
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
            data: exportItems,
            summaryRow: {
              no: '',
              nama: '',
              kategoriNama: '',
              qty: items.reduce((acc, i) => acc + (i.qty || 0), 0),
              hargaSatuan: '',
              hpp: '',
              total: summaryPenjualanBersih,
              modal: summaryTotalModal,
              laba: summaryLaba,
              marginPersen: `${summaryMargin}%`,
            },
          },
          {
            sheetName: 'Penjualan per Kategori',
            title: 'LAPORAN PENJUALAN PER KATEGORI MENU',
            columns: [
              { header: 'No', width: 6 },
              { header: 'Nama Kategori', key: 'nama', width: 25 },
              { header: 'Jumlah Variasi Menu', key: 'jumlahItem', width: 18 },
              { header: 'Total Qty Terjual', key: 'qty', width: 16 },
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
            data: exportKategoris,
            summaryRow: {
              no: '',
              nama: '',
              jumlahItem: '',
              qty: kategoris.reduce((acc, k) => acc + (k.qty || 0), 0),
              total: summaryPenjualanBersih,
              modal: summaryTotalModal,
              laba: summaryLaba,
              marginPersen: `${summaryMargin}%`,
            },
          },
          {
            sheetName: 'Penjualan per Kasir',
            title: 'LAPORAN PENJUALAN PER TITIK KASIR',
            columns: [
              { header: 'No', width: 6 },
              { header: 'Titik Kasir', key: 'namaTitikKasir', width: 25 },
              { header: 'Petugas Jaga', key: 'petugas', width: 20 },
              { header: 'Jumlah Transaksi', key: 'jumlahTransaksi', width: 16 },
              { header: 'Penjualan Bruto (Rp)', key: 'penjualanBruto', width: 20 },
              { header: 'Nilai Void (Rp)', key: 'nilaiVoid', width: 16 },
              { header: 'Penjualan Bersih (Rp)', key: 'penjualanBersih', width: 20 },
            ],
            data: kasirs,
            summaryRow: {
              no: '',
              namaTitikKasir: '',
              petugas: '',
              jumlahTransaksi: kasirs.reduce((acc, k) => acc + (k.jumlahTransaksi || 0), 0),
              penjualanBruto: kasirs.reduce((acc, k) => acc + (k.penjualanBruto || 0), 0),
              nilaiVoid: kasirs.reduce((acc, k) => acc + (k.nilaiVoid || 0), 0),
              penjualanBersih: kasirs.reduce((acc, k) => acc + (k.penjualanBersih || 0), 0),
            },
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
        hpp: getItemUnitModal(item),
        total: getItemOmset(item),
        modal: getItemModal(item),
        laba: getItemLaba(item),
        marginPersen: getItemMargin(item),
      }))
      const exportKategoris = kategoris.map((kat) => ({
        kategoriId: getKatId(kat),
        nama: kat.nama || '-',
        jumlahItem: kat.jumlahItem ?? '-',
        qty: kat.qty ?? 0,
        total: getKatOmset(kat),
        modal: getKatModal(kat),
        laba: getKatLaba(kat),
        marginPersen: getKatMargin(kat),
      }))

      exportMultiSectionPdf({
        filename: `Laporan_Penjualan_Kantin_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN PENJUALAN & LABA KOTOR',
        subtitle: 'Analisis Penjualan Menu, Kategori, dan Titik Kasir',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Periode Laporan': dateFilterLabel,
          'Penjualan Bersih Total': formatRupiah(summaryPenjualanBersih),
          'Total Modal (HPP)': formatRupiah(summaryTotalModal),
          'Laba Total': formatRupiah(summaryLaba),
          'Rata-rata Margin Kotor': `${summaryMargin}%`,
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
            data: exportItems,
            summaryRow: {
              no: '',
              nama: '',
              kategoriNama: '',
              qty: `${items.reduce((acc, i) => acc + (i.qty || 0), 0)}`,
              hargaSatuan: '',
              hpp: '',
              total: formatRupiah(summaryPenjualanBersih),
              modal: formatRupiah(summaryTotalModal),
              laba: formatRupiah(summaryLaba),
              marginPersen: `${summaryMargin}%`,
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
            data: exportKategoris,
            summaryRow: {
              no: '',
              nama: '',
              jumlahItem: '',
              qty: `${kategoris.reduce((acc, k) => acc + (k.qty || 0), 0)}`,
              total: formatRupiah(summaryPenjualanBersih),
              modal: formatRupiah(summaryTotalModal),
              laba: formatRupiah(summaryLaba),
              marginPersen: `${summaryMargin}%`,
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
                header: 'Penjualan Bruto',
                key: 'penjualanBruto',
                formatter: (v) => formatRupiah(Number(v ?? 0)),
              },
              {
                header: 'Nilai Void',
                key: 'nilaiVoid',
                formatter: (v) => formatRupiah(Number(v ?? 0)),
              },
              {
                header: 'Penjualan Bersih',
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
        <HeaderBreadcrumb section='Laporan Keuangan' title='Penjualan & Laba Kotor' />
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Laporan Penjualan & Laba Kotor
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Periode: <strong className="text-foreground">{dateFilterLabel}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <LaporanDateFilter
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
                  Penjualan Bersih
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
                  <span>Bruto: {ringkasan ? formatRupiah(summaryPenjualanBruto) : '-'}</span>
                  <span className="text-amber-600 dark:text-amber-400">Refund: {ringkasan ? formatRupiah(summaryNilaiRefund) : '-'}</span>
                </div>
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
                  Biaya modal menu terjual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Laba Kotor
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
                    Margin: {formatMargin(summaryMargin)}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">dari omset bersih</span>
                </div>
              </CardContent>
            </Card>

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
                          { label: 'Margin Tertinggi', value: 'margin' },
                        ],
                        selectedValues: [sortBy],
                        onSelect: (vals) => setSortBy((vals[0] as 'terlaris' | 'laba' | 'margin') || 'terlaris'),
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
              <Card className="p-0 gap-0 overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                  <CardTitle className="text-base font-bold">
                    Penjualan & Laba Kotor per Item Menu
                  </CardTitle>
                  <CardDescription>
                    Peringkat menu berdasarkan volume terjual, modal (HPP), dan kontribusi laba.
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
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-primary">Laba</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Memuat rincian penjualan per menu...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
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
                              <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                                {formatRupiah(getItemUnitModal(item))}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-sm tabular-nums">
                                {formatRupiah(getItemOmset(item))}
                              </TableCell>
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
                            {formatNumber(filteredItems.reduce((acc, i) => acc + (i.qty || 0), 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">-</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">-</TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatRupiah(summaryPenjualanBersih)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatRupiah(summaryTotalModal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
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
            </TabsContent>

            {/* TAB CONTENT 2: PENJUALAN PER KATEGORI */}
            <TabsContent value="kategori" className="space-y-4">
              <Card className="p-0 gap-0 overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                  <CardTitle className="text-base font-bold">
                    Penjualan & Laba Kotor per Kategori
                  </CardTitle>
                  <CardDescription>
                    Perbandingan performa omset dan margin laba antar kelompok kategori makanan/minuman.
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
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Modal</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-primary">Laba</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Margin Rata-rata</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Memuat data penjualan per kategori...</span>
                            </div>
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
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    {kategoris.length > 0 && (
                      <TableFooter className="bg-muted/50 font-bold border-t border-border">
                        <TableRow>
                          <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                            Total / Rata-rata:
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatNumber(kategoris.reduce((acc, k) => acc + (k.qty || 0), 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatRupiah(summaryPenjualanBersih)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatRupiah(summaryTotalModal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
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
            </TabsContent>

            {/* TAB CONTENT 3: PENJUALAN PER KASIR */}
            <TabsContent value="kasir" className="space-y-4">
              <Card className="p-0 gap-0 overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                  <CardTitle className="text-base font-bold">
                    Penjualan per Titik Kasir & Petugas
                  </CardTitle>
                  <CardDescription>
                    Rekap penerimaan transaksi, pembatalan void, dan omset bersih per loket POS.
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
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penjualan Bruto</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Nilai Void</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-primary">Penjualan Bersih</TableHead>
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
                            Tidak ada titik kasir yang cocok.
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
          </Tabs>
      </Main>
    </>
  )
}
