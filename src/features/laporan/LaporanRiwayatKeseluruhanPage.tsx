import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ArrowRight,
  Calculator,
  CreditCard,
  FileText,
  Loader2,
  Printer,
  Receipt,
  ShoppingBag,
  User,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { formatRupiah, formatDateTime, formatNumber } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { exportTableToPdf } from '@/lib/pdfExport'
import { LaporanDateFilter, getDefaultDateFilter, LaporanExportButton } from './components'
import { laporanApi } from './api/laporan-api'
import {
  type RiwayatTransaksiKeseluruhanItem,
  type LaporanFilterParams,
  resolveTitikDanPetugas,
} from './types'

export function LaporanRiwayatKeseluruhanPage() {
  const [transaksiList, setTransaksiList] = useState<RiwayatTransaksiKeseluruhanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchFilter, setSearchFilter] = useState('')
  const [jenisFilter, setJenisFilter] = useState<string>('ALL')

  // Filter Tanggal / Rentang Waktu (Default: Hari Ini)
  const [dateFilterParams, setDateFilterParams] = useState<LaporanFilterParams>(
    () => getDefaultDateFilter().params
  )
  const [dateFilterLabel, setDateFilterLabel] = useState<string>(
    () => getDefaultDateFilter().label
  )

  // Modal Struk Digital
  const [selectedTrxForReceipt, setSelectedTrxForReceipt] =
    useState<RiwayatTransaksiKeseluruhanItem | null>(null)
  const printAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        setIsLoading(true)
        const list = await laporanApi.getRiwayatTransaksiKeseluruhan(dateFilterParams)
        if (!isMounted) return
        setTransaksiList(list)
      } catch (_err: unknown) {
        if (!isMounted) return
        toast.error('Gagal Memuat Riwayat Transaksi')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [dateFilterParams])

  // Filter transaksi
  const filteredTransaksi = useMemo(() => {
    return transaksiList.filter((trx) => {
      if (jenisFilter !== 'ALL' && trx.jenis !== jenisFilter) {
        return false
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase()
        const matchKeterangan = trx.keterangan.toLowerCase().includes(q)
        const matchRef = trx.referensiId.toLowerCase().includes(q)
        const matchKasir = trx.titikKasir.toLowerCase().includes(q)
        const matchPetugas = trx.petugas.toLowerCase().includes(q)
        const matchSiswa = trx.siswaNama.toLowerCase().includes(q)
        const matchNis = trx.siswaNis.toLowerCase().includes(q)
        const matchKelas = trx.siswaKelas.toLowerCase().includes(q)
        const matchItem = trx.items?.some((i) =>
          i.nama.toLowerCase().includes(q)
        )
        return (
          matchKeterangan ||
          matchRef ||
          matchKasir ||
          matchPetugas ||
          matchSiswa ||
          matchNis ||
          matchKelas ||
          Boolean(matchItem)
        )
      }
      return true
    })
  }, [transaksiList, jenisFilter, searchFilter])

  // Ringkasan Statistik
  const ringkasan = useMemo(() => {
    const belanjaTrx = transaksiList.filter((t) => t.jenis === 'BELANJA')
    const totalBelanja = belanjaTrx.reduce((sum, t) => sum + t.nominal, 0)
    const jumlahBelanja = belanjaTrx.length
    const rataRataBelanja = jumlahBelanja > 0 ? Math.round(totalBelanja / jumlahBelanja) : 0
    return {
      totalBelanja,
      totalSemuaTrx: transaksiList.length,
      rataRataBelanja,
    }
  }, [transaksiList])

  // Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredTransaksi.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }

    try {
      exportTableToExcel({
        filename: `Riwayat_Transaksi_Keseluruhan_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Riwayat Transaksi',
        title: 'LAPORAN RIWAYAT TRANSAKSI BELANJA KESELURUHAN SISWA',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Periode': dateFilterLabel,
          'Total Transaksi Belanja': formatRupiah(ringkasan.totalBelanja),
          'Jumlah Transaksi Terfilter': `${filteredTransaksi.length} Data`,
        },
        columns: [
          {
            header: 'Waktu Transaksi',
            key: 'waktu',
            formatter: (v: unknown) => formatDateTime(String(v)),
            width: 20,
          },
          { header: 'No. Referensi', key: 'referensiId', width: 22 },
          { header: 'NIS', key: 'siswaNis', width: 14 },
          { header: 'Nama Siswa', key: 'siswaNama', width: 25 },
          { header: 'Kelas', key: 'siswaKelas', width: 12 },
          { header: 'Jenis', key: 'jenis', width: 15 },
          {
            header: 'Nominal (Rp)',
            key: 'nominal',
            formatter: (v: unknown) => Number(v) || 0,
            width: 16,
          },
          {
            header: 'Sisa Saldo (Rp)',
            key: 'saldoSetelah',
            formatter: (v: unknown) => Number(v) || 0,
            width: 16,
          },
          { header: 'Titik Kasir', key: 'titikKasir', width: 22 },
          { header: 'Petugas', key: 'petugas', width: 20 },
          {
            header: 'Rincian Menu',
            key: 'items',
            formatter: (_v: unknown, row: RiwayatTransaksiKeseluruhanItem) =>
              row.items && row.items.length > 0
                ? row.items.map((i) => `${i.nama} (${i.qty}x)`).join(', ')
                : row.keterangan,
            width: 35,
          },
        ],
        data: filteredTransaksi,
      })
      toast.success('Ekspor Excel Berhasil', {
        description: 'Berkas riwayat transaksi keseluruhan (.xlsx) berhasil diunduh.',
      })
    } catch (_err: unknown) {
      toast.error('Gagal mengekspor berkas Excel')
    }
  }

  // Ekspor PDF (.pdf)
  const handleExportPdf = () => {
    if (filteredTransaksi.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }

    try {
      exportTableToPdf({
        filename: `Riwayat_Transaksi_Keseluruhan_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN RIWAYAT TRANSAKSI BELANJA KESELURUHAN',
        subtitle: 'Sistem Kasir & Pembukuan Kantin SKOOLIA',
        orientation: 'landscape',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Periode': dateFilterLabel,
          'Total Transaksi Belanja': formatRupiah(ringkasan.totalBelanja),
          'Jumlah Transaksi Terfilter': `${filteredTransaksi.length} Catatan`,
        },
        columns: [
          {
            header: 'Waktu',
            key: 'waktu',
            formatter: (v: unknown) => formatDateTime(String(v)),
            align: 'left',
          },
          { header: 'No. Ref', key: 'referensiId', align: 'left' },
          { header: 'NIS', key: 'siswaNis', align: 'left' },
          { header: 'Nama Siswa', key: 'siswaNama', align: 'left' },
          { header: 'Kelas', key: 'siswaKelas', align: 'center' },
          { header: 'Jenis', key: 'jenis', align: 'center' },
          {
            header: 'Nominal',
            key: 'nominal',
            formatter: (v: unknown) => formatRupiah(Number(v)),
            align: 'right',
          },
          {
            header: 'Sisa Saldo',
            key: 'saldoSetelah',
            formatter: (v: unknown) => formatRupiah(Number(v)),
            align: 'right',
          },
          { header: 'Titik Kasir', key: 'titikKasir', align: 'left' },
          {
            header: 'Rincian Belanja',
            key: 'items',
            formatter: (_v: unknown, row: RiwayatTransaksiKeseluruhanItem) =>
              row.items && row.items.length > 0
                ? row.items.map((i) => `${i.nama} (${i.qty})`).join(', ')
                : row.keterangan,
            align: 'left',
          },
        ],
        data: filteredTransaksi,
      })
      toast.success('Ekspor PDF Berhasil', {
        description: 'Berkas riwayat transaksi keseluruhan (.pdf) berhasil diunduh.',
      })
    } catch (_err: unknown) {
      toast.error('Gagal mengekspor berkas PDF')
    }
  }

  // Cetak Struk Langsung
  const handlePrintReceipt = () => {
    if (!selectedTrxForReceipt) return

    const { titik, petugas } = resolveTitikDanPetugas(selectedTrxForReceipt)
    const isTopup = selectedTrxForReceipt.jenis?.startsWith('TOPUP')
    const isRefund = selectedTrxForReceipt.jenis === 'REFUND'
    const isKoreksi = selectedTrxForReceipt.jenis === 'KOREKSI'

    const receiptTitle = isTopup
      ? 'BUKTI ISI SALDO (TOP-UP)'
      : isRefund
      ? 'BUKTI PENGEMBALIAN SALDO'
      : isKoreksi
      ? 'BUKTI PENYESUAIAN SALDO'
      : 'STRUK TRANSAKSI DIGITAL KASIR'

    const totalLabel = isTopup
      ? 'TOTAL SALDO MASUK:'
      : isRefund
      ? 'TOTAL PENGEMBALIAN:'
      : isKoreksi
      ? 'NOMINAL PENYESUAIAN:'
      : 'TOTAL POTONG SALDO:'

    const totalSign = selectedTrxForReceipt.arah === 'KREDIT' ? '+' : '-'

    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk Transaksi - ${selectedTrxForReceipt.referensiId}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      @page { margin: 0; size: 80mm auto; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      padding: 12px;
      max-width: 300px;
      margin: 0 auto;
    }
    .header { text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #000; }
    .store-name { font-size: 14px; font-weight: bold; }
    .sub-title { font-size: 10px; color: #444; margin-top: 2px; }
    .ref-badge { font-family: monospace; font-size: 11px; font-weight: bold; margin-top: 4px; }
    .info-section { margin-bottom: 10px; font-size: 11px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
    .items-table th { text-align: left; border-bottom: 1px dashed #000; padding: 4px 0; }
    .items-table td { padding: 4px 0; vertical-align: top; }
    .text-right { text-align: right; }
    .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
    .double-divider { border-bottom: 2px solid #000; margin: 8px 0; }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin: 6px 0; }
    .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/logo.png" style="height: 28px; width: auto; margin-bottom: 4px;" alt="Logo Skoolia" />
    <div class="store-name">KANTIN SKOOLIA</div>
    <div class="sub-title">${receiptTitle}</div>
    <div class="ref-badge">${selectedTrxForReceipt.referensiId}</div>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span>Waktu:</span>
      <span>${formatDateTime(selectedTrxForReceipt.waktu)}</span>
    </div>
    <div class="info-row">
      <span>Siswa:</span>
      <span>${selectedTrxForReceipt.siswaNama} (${selectedTrxForReceipt.siswaKelas})</span>
    </div>
    <div class="info-row">
      <span>Lokasi / Titik:</span>
      <span>${titik}</span>
    </div>
    <div class="info-row">
      <span>Petugas:</span>
      <span>${petugas}</span>
    </div>
  </div>

  <div class="divider"></div>

  ${
    selectedTrxForReceipt.items && selectedTrxForReceipt.items.length > 0
      ? `
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${selectedTrxForReceipt.items
          .map(
            (i) => `
          <tr>
            <td>${i.nama}</td>
            <td class="text-right">${i.qty}x</td>
            <td class="text-right">${formatRupiah(i.subtotal)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
      : `
    <div style="padding: 8px 0; text-align: center; font-style: italic;">
      ${selectedTrxForReceipt.keterangan || 'Transaksi Kantin'}
    </div>
  `
  }

  <div class="double-divider"></div>

  <div class="total-row">
    <span>${totalLabel}</span>
    <span>${totalSign} ${formatRupiah(selectedTrxForReceipt.nominal)}</span>
  </div>

  <div class="info-row" style="margin-top: 4px;">
    <span>Sisa Saldo Siswa:</span>
    <span style="font-weight: bold;">${formatRupiah(selectedTrxForReceipt.saldoSetelah)}</span>
  </div>

  <div class="footer">
    <p>Simpan struk ini sebagai bukti transaksi resmi kantin sekolah.</p>
    <p>*** KANTIN SKOOLIA ***</p>
  </div>
</body>
</html>`

    const existingFrame = document.getElementById('receipt-print-iframe')
    if (existingFrame) {
      existingFrame.remove()
    }

    const iframe = document.createElement('iframe')
    iframe.id = 'receipt-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(receiptHtml)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        iframe.remove()
      }, 3000)
    }, 250)
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Laporan Keuangan' title='Riwayat Transaksi' />
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Riwayat Transaksi
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
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2 border-border/80 hover:bg-accent"
              >
                <Link to="/laporan/riwayat-siswa">
                  <User className="h-4 w-4 text-primary" />
                  <span>Lihat Riwayat per Siswa</span>
                </Link>
              </Button>
              <LaporanExportButton
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                disabled={isLoading || filteredTransaksi.length === 0}
              />
            </div>
          </div>

          {/* RINGKASAN STATISTIK KESELURUHAN */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Nilai Belanja Kantin
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(ringkasan.totalBelanja)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Akumulasi omzet transaksi belanja dari seluruh siswa
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Jumlah Transaksi Tercatat
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {formatNumber(ringkasan.totalSemuaTrx)} Transaksi
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Seluruh mutasi belanja, top-up, refund, dan koreksi
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rata-rata Nilai per Transaksi
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <Calculator className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {formatRupiah(ringkasan.rataRataBelanja)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rata-rata nominal per struk belanja siswa
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABEL LOG TRANSAKSI KESELURUHAN */}
          <div className="space-y-4">
            <TableToolbar
              searchPlaceholder="Cari siswa, NIS, kelas, referensi, menu..."
              searchValue={searchFilter}
              onSearchChange={setSearchFilter}
              filters={[
                {
                  title: 'Jenis Transaksi',
                  options: [
                    { label: 'Belanja Kasir', value: 'BELANJA' },
                    { label: 'Top-up Saldo Tunai', value: 'TOPUP_TUNAI' },
                    { label: 'Top-up Online', value: 'TOPUP_ONLINE' },
                    { label: 'Refund Saldo', value: 'REFUND' },
                    { label: 'Penyesuaian Saldo', value: 'KOREKSI' },
                  ],
                  selectedValues: jenisFilter !== 'ALL' ? [jenisFilter] : [],
                  onSelect: (vals) => setJenisFilter(vals[0] || 'ALL'),
                  isSingleSelect: true,
                },
              ]}
              isFiltered={Boolean(searchFilter || jenisFilter !== 'ALL')}
              onReset={() => {
                setSearchFilter('')
                setJenisFilter('ALL')
              }}
            />

            <Card className="p-0 gap-0 overflow-hidden">
              <CardHeader className="flex flex-col gap-1 border-b border-border bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    Log Lengkap Transaksi Belanja Siswa
                  </CardTitle>
                </div>
                <div className="text-xs text-muted-foreground font-mono tabular-nums">
                  Menampilkan {formatNumber(filteredTransaksi.length)} transaksi
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Waktu</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">No. Referensi</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Siswa</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jenis</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nominal</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sisa Saldo</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titik Kasir</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rincian Menu / Info</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Memuat riwayat transaksi keseluruhan...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredTransaksi.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-28 text-center text-muted-foreground">
                          Tidak ada transaksi yang sesuai filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransaksi.map((trx, idx) => (
                        <TableRow key={trx.id} className="border-b border-border last:border-b-0">
                          <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap tabular-nums">
                            {formatDateTime(trx.waktu)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold tabular-nums">
                            {trx.referensiId}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-xs text-foreground">
                                {trx.siswaNama}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span className="font-mono tabular-nums">{trx.siswaNis}</span>
                                <span>•</span>
                                <Badge variant="outline" className="rounded-full border border-border bg-muted px-2 py-0 text-[10px] font-medium text-muted-foreground">
                                  {trx.siswaKelas}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                trx.jenis === 'BELANJA'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : trx.jenis === 'TOPUP_TUNAI' || trx.jenis === 'TOPUP_ONLINE'
                                  ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                                  : trx.jenis === 'REFUND'
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
                              }`}
                            >
                              {trx.jenis === 'BELANJA'
                                ? 'Belanja'
                                : trx.jenis === 'TOPUP_TUNAI'
                                ? 'Top-up Tunai'
                                : trx.jenis === 'TOPUP_ONLINE'
                                ? 'Top-up Online'
                                : trx.jenis === 'REFUND'
                                ? 'Refund'
                                : 'Koreksi'}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-bold text-xs tabular-nums ${
                              trx.arah === 'KREDIT'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-foreground'
                            }`}
                          >
                            {trx.arah === 'KREDIT' ? '+' : '-'} {formatRupiah(trx.nominal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                            {formatRupiah(trx.saldoSetelah)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>{resolveTitikDanPetugas(trx).titik}</div>
                            <div className="text-[10px] text-muted-foreground">{resolveTitikDanPetugas(trx).petugas}</div>
                          </TableCell>
                          <TableCell className="text-xs max-w-xs truncate">
                            {trx.items && trx.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {trx.items.map((item, i) => (
                                  <div key={i} className="text-xs flex items-center gap-1">
                                    <ShoppingBag className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="font-medium">{item.nama}</span>
                                    <span className="text-muted-foreground tabular-nums">({item.qty}x)</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">
                                {trx.keterangan}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTrxForReceipt(trx)}
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                title="Lihat Struk Transaksi"
                              >
                                <Receipt className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Struk</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary font-medium"
                                title="Lihat Detail Riwayat Siswa"
                              >
                                <Link
                                  to="/laporan/riwayat-siswa"
                                  search={{ siswaId: trx.siswaId }}
                                >
                                  <span>Detail</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
      </Main>

      {/* DIALOG MODAL STRUK DIGITAL THERMAL */}
      <Dialog
        open={Boolean(selectedTrxForReceipt)}
        onOpenChange={(open) => !open && setSelectedTrxForReceipt(null)}
      >
        <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
          <DialogHeader className="border-b border-border bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <DialogTitle className="text-sm font-bold">
                Struk Transaksi Digital
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Tanda terima resmi transaksi belanja kantin sekolah
            </DialogDescription>
          </DialogHeader>

          {selectedTrxForReceipt && (() => {
            const { titik, petugas } = resolveTitikDanPetugas(selectedTrxForReceipt)
            const isTopup = selectedTrxForReceipt.jenis?.startsWith('TOPUP')
            const isRefund = selectedTrxForReceipt.jenis === 'REFUND'
            const isKoreksi = selectedTrxForReceipt.jenis === 'KOREKSI'

            const receiptTitle = isTopup
              ? 'BUKTI ISI SALDO (TOP-UP)'
              : isRefund
              ? 'BUKTI PENGEMBALIAN SALDO'
              : isKoreksi
              ? 'BUKTI PENYESUAIAN SALDO'
              : 'STRUK TRANSAKSI DIGITAL KASIR'

            const totalLabel = isTopup
              ? 'TOTAL SALDO MASUK:'
              : isRefund
              ? 'TOTAL PENGEMBALIAN:'
              : isKoreksi
              ? 'NOMINAL PENYESUAIAN:'
              : 'TOTAL BAYAR:'

            const totalSign = selectedTrxForReceipt.arah === 'KREDIT' ? '+' : '-'

            return (
              <div className="p-5 bg-muted/30 space-y-4">
                <div
                  ref={printAreaRef}
                  className="printable-slip w-full rounded-xl border border-border bg-white p-5 font-mono text-xs text-slate-900 shadow-none"
                >
                  {/* Header Nota */}
                  <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm font-bold tracking-tight text-slate-900 uppercase">
                      <img
                        src="/logo.png"
                        alt="Logo Skoolia"
                        className="h-5 w-5 object-contain"
                      />
                      <span>KANTIN SKOOLIA</span>
                    </div>
                    <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                      {receiptTitle}
                    </p>

                    <div className="pt-1.5">
                      <span className="block font-sans text-[9px] text-slate-400 uppercase tracking-wide">
                        No. Referensi Transaksi
                      </span>
                      <span className="mt-0.5 inline-block rounded border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wide text-slate-900">
                        {selectedTrxForReceipt.referensiId}
                      </span>
                    </div>
                  </div>

                  {/* Informasi Transaksi */}
                  <div className="space-y-1.5 pt-2.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Waktu:</span>
                      <span className="font-semibold text-slate-800">
                        {formatDateTime(selectedTrxForReceipt.waktu)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Siswa:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedTrxForReceipt.siswaNama} ({selectedTrxForReceipt.siswaKelas})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Lokasi / Titik:</span>
                      <span className="font-semibold text-slate-800">
                        {titik}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Petugas:</span>
                      <span className="font-semibold text-slate-800">
                        {petugas}
                      </span>
                    </div>
                  </div>

                  <div className="my-2.5 border-b border-dashed border-slate-300" />

                  {/* Items Transaksi */}
                  {selectedTrxForReceipt.items && selectedTrxForReceipt.items.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                        <span>Menu</span>
                        <span>Subtotal</span>
                      </div>
                      {selectedTrxForReceipt.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs">
                          <div>
                            <div className="font-bold text-slate-800">{item.nama}</div>
                            <div className="text-[10px] text-slate-500">
                              {item.qty} x {formatRupiah(item.harga)}
                            </div>
                          </div>
                          <div className="font-bold text-slate-900 font-mono">
                            {formatRupiah(item.subtotal)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-slate-600 italic">
                      {selectedTrxForReceipt.keterangan || 'Transaksi Kantin'}
                    </div>
                  )}

                  <div className="my-2.5 border-b-2 border-slate-900" />

                  {/* Total & Saldo */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{totalLabel}</span>
                      <span className="text-sm font-mono text-emerald-700">
                        {totalSign} {formatRupiah(selectedTrxForReceipt.nominal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-slate-400" />
                        Sisa Saldo Siswa:
                      </span>
                      <span className="font-bold font-mono text-slate-800">
                        {formatRupiah(selectedTrxForReceipt.saldoSetelah)}
                      </span>
                    </div>
                  </div>

                  {/* Footer Struk */}
                  <div className="mt-3.5 space-y-1 border-t border-dashed border-slate-300 pt-3 text-center">
                    <p className="font-sans text-[10px] text-slate-500 leading-tight">
                      Simpan bukti ini sebagai bukti transaksi resmi kantin sekolah.
                    </p>
                    <p className="font-mono text-[9px] font-bold tracking-widest text-slate-400 uppercase pt-0.5">
                      *** KANTIN SKOOLIA ***
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Link
                      to="/laporan/riwayat-siswa"
                      search={{ siswaId: selectedTrxForReceipt.siswaId }}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Lihat Profil Siswa</span>
                    </Link>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePrintReceipt}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Cetak Struk</span>
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
