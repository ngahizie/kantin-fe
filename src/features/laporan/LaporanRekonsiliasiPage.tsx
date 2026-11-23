import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  Loader2,
  RotateCcw,
  Scale,
  ShieldAlert,
  Store,
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
import { formatRupiah, formatDateTime } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { exportTableToPdf } from '@/lib/pdfExport'
import { LaporanDateFilter, getDefaultDateFilter, LaporanExportButton } from './components'
import { laporanApi } from './api/laporan-api'
import type { RingkasanRekonsiliasi, ArusPosRekonsiliasiItem, LaporanFilterParams } from './types'

export function LaporanRekonsiliasiPage() {
  const [data, setData] = useState<RingkasanRekonsiliasi | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter Tanggal / Rentang Waktu (Default: Hari Ini)
  const [dateFilterParams, setDateFilterParams] = useState<LaporanFilterParams>(
    () => getDefaultDateFilter().params
  )
  const [dateFilterLabel, setDateFilterLabel] = useState<string>(
    () => getDefaultDateFilter().label
  )

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        setIsLoading(true)
        setIsError(false)
        setErrorMessage('')
        const res = await laporanApi.getRekonsiliasi(dateFilterParams)
        if (!isMounted) return
        setData(res)
      } catch (err: unknown) {
        if (!isMounted) return
        setIsError(true)
        const msg = err instanceof Error ? err.message : 'Gagal memuat rekonsiliasi'
        setErrorMessage(msg)
        toast.error('Gagal Memuat Laporan', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadData()
    return () => {
      isMounted = false
    }
  }, [dateFilterParams, reloadTrigger])

  const handleRetry = () => {
    setReloadTrigger((prev) => prev + 1)
  }

  // Baris Rincian Pos Akuntansi
  const rincianPos: ArusPosRekonsiliasiItem[] = useMemo(() => {
    if (!data) return []

    return [
      {
        id: '1',
        pos: 'Top-up Online Siswa',
        arah: 'MASUK',
        nominal: data.topupOnline,
        keterangan: 'Pemasukan saldo via payment gateway / transfer virtual account',
      },
      {
        id: '2',
        pos: 'Top-up Tunai di TU',
        arah: 'MASUK',
        nominal: data.topupTunai,
        keterangan: 'Penerimaan fisik uang tunai di Layanan TU',
      },
      {
        id: '3',
        pos: 'Pengembalian Saldo Siswa (Refund)',
        arah: 'KELUAR',
        nominal: data.refund,
        keterangan: 'Pengembalian sisa saldo bagi siswa yang lulus atau pindah sekolah',
      },
      {
        id: '4',
        pos: 'Total Penjualan Akhir Kantin',
        arah: 'TETAP',
        nominal: data.penjualanBersih,
        keterangan: `Total penjualan ${formatRupiah(data.penjualan)} dikurangi pembatalan/refund ${formatRupiah(data.voidPenjualan)}`,
      },
      {
        id: '5',
        pos: 'Total Saldo Siswa (Titipan)',
        arah: 'TETAP',
        nominal: data.saldoSiswa,
        keterangan: 'Total uang titipan yang tersimpan di kartu seluruh siswa',
      },
      {
        id: '7',
        pos: 'Koreksi Saldo Masuk',
        arah: 'MASUK',
        nominal: data.koreksiMasuk,
        keterangan: 'Penyesuaian saldo tambah oleh bendahara dengan berita acara',
      },
      {
        id: '8',
        pos: 'Refund Transaksi Kasir',
        arah: 'MASUK',
        nominal: data.voidPenjualan,
        keterangan: 'Refund transaksi salah tap yang mengembalikan saldo',
      },
    ]
  }, [data])

  // Filter pencarian pada tabel rincian
  const filteredPos = useMemo(() => {
    if (!searchQuery.trim()) return rincianPos
    const q = searchQuery.toLowerCase()
    return rincianPos.filter(
      (p) =>
        p.pos.toLowerCase().includes(q) ||
        p.keterangan.toLowerCase().includes(q) ||
        p.arah.toLowerCase().includes(q)
    )
  }, [rincianPos, searchQuery])

  // Ekspor Excel
  const handleExportExcel = () => {
    if (!data) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      const exportRows = [
        ...rincianPos.map((item) => ({
          pos: item.pos,
          arah: item.arah,
          nominal: item.nominal,
          keterangan: item.keterangan,
        })),
        {
          pos: 'TOTAL ISI SALDO AKHIR (Top-up - Refund)',
          arah: 'EVALUASI',
          nominal: data.topupBersih,
          keterangan: 'Hitungan: (Isi Saldo Online + Isi Saldo Tunai) - Pengembalian Saldo',
        },
        {
          pos: 'TOTAL UANG TERPAKAI & SISA SALDO (Siswa + Penjualan)',
          arah: 'EVALUASI',
          nominal: data.totalPenggunaan,
          keterangan: 'Hitungan: Total Saldo Siswa + Total Penjualan Akhir',
        },
        {
          pos: 'SELISIH HITUNGAN UANG',
          arah: 'EVALUASI',
          nominal: data.selisih,
          keterangan: data.seimbang ? 'COCOK (Selisih Rp 0)' : 'ADA SELISIH - PERIKSA UANG KAS!',
        },
      ]

      exportTableToExcel({
        filename: `Laporan_Cek_Selisih_Uang_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Cek Selisih Uang',
        title: 'LAPORAN CEK SELISIH UANG HARIAN',
        metadata: {
          'Tanggal Cetak': formatDateTime(new Date()),
          'Periode Pengecekan': dateFilterLabel,
          'Status Kecocokan': data.seimbang ? 'COCOK (SEIMBANG)' : 'TIDAK COCOK (ADA SELISIH)',
          'Total Selisih': formatRupiah(data.selisih),
          'Total Saldo Siswa (Titipan)': formatRupiah(data.saldoMengendap),
          'Total Penjualan Akhir': formatRupiah(data.penjualanBersih),
        },
        columns: [
          { header: 'No', width: 6 },
          { header: 'Rincian Catatan Uang', key: 'pos', width: 35 },
          { header: 'Arah', key: 'arah', width: 14 },
          {
            header: 'Nominal (Rp)',
            key: 'nominal',
            formatter: (v) => Number(v),
            width: 18,
          },
          { header: 'Keterangan', key: 'keterangan', width: 45 },
        ],
        data: exportRows,
        summaryRow: {
          no: '',
          pos: '',
          arah: '',
          nominal: '',
          keterangan: '',
        },
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Berkas Laporan Cek Selisih Uang (.xlsx) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas Excel'
      toast.error('Gagal Ekspor', { description: msg })
    }
  }

  const handleExportPdf = () => {
    if (!data) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      const exportRows = [
        ...rincianPos.map((item) => ({
          pos: item.pos,
          arah: item.arah,
          nominal: formatRupiah(item.nominal),
          keterangan: item.keterangan,
        })),
        {
          pos: 'TOTAL ISI SALDO AKHIR (Top-up - Refund)',
          arah: 'EVALUASI',
          nominal: formatRupiah(data.topupBersih),
          keterangan: 'Hitungan: (Isi Saldo Online + Isi Saldo Tunai) - Pengembalian Saldo',
        },
        {
          pos: 'TOTAL UANG TERPAKAI & SISA SALDO (Siswa + Penjualan)',
          arah: 'EVALUASI',
          nominal: formatRupiah(data.totalPenggunaan),
          keterangan: 'Hitungan: Total Saldo Siswa + Total Penjualan Akhir',
        },
        {
          pos: 'SELISIH HITUNGAN UANG',
          arah: 'EVALUASI',
          nominal: formatRupiah(data.selisih),
          keterangan: data.seimbang ? 'COCOK (Selisih Rp 0)' : 'ADA SELISIH - PERIKSA UANG KAS!',
        },
      ]

      exportTableToPdf({
        filename: `Laporan_Cek_Selisih_Uang_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN CEK SELISIH UANG HARIAN',
        subtitle: 'Pencocokan Uang Masuk, Keluar & Saldo Siswa',
        metadata: {
          'Tanggal Cetak': formatDateTime(new Date()),
          'Periode Pengecekan': dateFilterLabel,
          'Status Kecocokan': data.seimbang ? 'COCOK (SEIMBANG)' : 'TIDAK COCOK (ADA SELISIH)',
          'Total Selisih': formatRupiah(data.selisih),
          'Total Saldo Siswa (Titipan)': formatRupiah(data.saldoMengendap),
          'Total Penjualan Akhir': formatRupiah(data.penjualanBersih),
        },
        columns: [
          { header: 'No' },
          { header: 'Rincian Catatan Uang', key: 'pos' },
          { header: 'Arah', key: 'arah' },
          { header: 'Nominal', key: 'nominal' },
          { header: 'Keterangan', key: 'keterangan' },
        ],
        data: exportRows,
        summaryRow: {
          no: '',
          pos: '',
          arah: '',
          nominal: '',
          keterangan: '',
        },
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Berkas Laporan Cek Selisih Uang (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Laporan Keuangan' title='Cek Selisih Uang' />
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Cek Selisih Uang (Pencocokan Harian)
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
                disabled={isLoading || !data || isError}
              />
            </div>
          </div>

          {/* Error Alert Banner */}
          {isError && (
            <div
              data-testid="banner-error-rekonsiliasi"
              className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Gagal Memuat Data Rekonsiliasi</p>
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

          {/* BANNER PERINGATAN MERAH MENCOLOK BILA SELISIH != 0 */}
          {data && !data.seimbang && (
            <div
              data-testid="banner-peringatan-selisih"
              className="relative overflow-hidden rounded-xl border border-destructive bg-red-50 p-6 text-red-950 dark:border-destructive/80 dark:bg-red-950/60 dark:text-red-100"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                    <ShieldAlert className="h-7 w-7 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold tracking-tight text-red-700 dark:text-red-400">
                        PERINGATAN: DITEMUKAN SELISIH HITUNGAN UANG!
                      </h2>
                      <Badge variant="destructive" className="rounded-full font-mono text-xs tabular-nums">
                        SELISIH: {formatRupiah(data.selisih)}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-red-900/90 dark:text-red-200">
                      Ditemukan selisih sebesar{' '}
                      <strong className="font-semibold underline tabular-nums">
                        {formatRupiah(data.selisih)}
                      </strong>{' '}
                      antara total uang masuk (isi saldo) dengan uang yang dibelanjakan serta sisa saldo di kartu.
                      Hal ini menandakan adanya perbedaan catatan, uang fisik kas yang belum disetor, atau transaksi yang belum tuntas.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs tabular-nums">
                      <span className="rounded-md bg-red-200/80 px-2.5 py-1 font-medium text-red-900 dark:bg-red-900/60 dark:text-red-200">
                        Total Isi Saldo Akhir: {formatRupiah(data.topupBersih)}
                      </span>
                      <span className="rounded-md bg-red-200/80 px-2.5 py-1 font-medium text-red-900 dark:bg-red-900/60 dark:text-red-200">
                        Total Pemakaian & Sisa: {formatRupiah(data.totalPenggunaan)}
                      </span>
                      <span className="rounded-md bg-red-600 px-2.5 py-1 font-bold text-white">
                        Perlu Pengecekan Bendahara & TU
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PERBANDINGAN UANG MASUK VS TERPAKAI & SISA */}
          {data && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                  Pencocokan Saldo Masuk vs Pemakaian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center">
                  {/* Sisi Kiri */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">
                      Sisi 1: Total Uang Masuk (Penambahan Saldo)
                    </p>
                    <p className="text-2xl font-bold font-mono tracking-tight text-primary tabular-nums">
                      {formatRupiah(data.totalKreditSemua || data.topupBersih)}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {data.totalKreditSemua > 0
                        ? `Total Uang Masuk & Tambah Saldo (${formatRupiah(data.totalKreditSemua)})`
                        : `Isi Saldo Tunai (${formatRupiah(data.topupTunai)}) + Online (${formatRupiah(data.topupOnline)}) − Pengembalian (${formatRupiah(data.totalRefundSemua)})`}
                    </p>
                  </div>

                  {/* Simbol Sama Dengan */}
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className={`text-2xl font-black ${
                        data.seimbang
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {data.seimbang ? '=' : '≠'}
                    </span>
                    <span
                      className={`mt-1 text-xs font-bold tabular-nums ${
                        data.seimbang ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {data.seimbang
                        ? 'Cocok (Selisih Rp 0)'
                        : `Selisih: ${formatRupiah(data.selisih)}`}
                    </span>
                  </div>

                  {/* Sisi Kanan */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">
                      Sisi 2: Total Terpakai & Sisa Saldo Siswa
                    </p>
                    <p className="text-2xl font-bold font-mono tracking-tight text-primary tabular-nums">
                      {formatRupiah(
                        data.totalKreditSemua > 0
                          ? data.totalDebitSemua + (data.saldoSiswa || data.saldoMengendap)
                          : data.totalPenggunaan
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {data.totalKreditSemua > 0
                        ? `Uang Keluar Terpakai (${formatRupiah(data.totalDebitSemua)}) + Saldo Siswa (${formatRupiah(data.saldoSiswa || data.saldoMengendap)})`
                        : `Saldo Siswa (${formatRupiah(data.saldoSiswa || data.saldoMengendap)}) + Penjualan (${formatRupiah(data.penjualanBersih)})`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* METRIC SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Top-up Masuk
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <ArrowDownToLine className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {data ? formatRupiah(data.totalTopupSemua) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between gap-2 tabular-nums">
                  <span>Tunai: {data ? formatRupiah(data.topupTunai) : '-'}</span>
                  <span>Online: {data ? formatRupiah(data.topupOnline) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Penjualan Akhir
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <Store className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {data ? formatRupiah(data.penjualanBersih) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between gap-2 tabular-nums">
                  <span>Sebelum Refund: {data ? formatRupiah(data.penjualan) : '-'}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Refund: {data ? formatRupiah(data.voidPenjualan) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Saldo Siswa (Titipan)
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {data ? formatRupiah(data.saldoSiswa) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total saldo aktif tersimpan di kartu seluruh siswa
                </div>
              </CardContent>
            </Card>

            <Card className={data && !data.seimbang ? 'border-destructive/50 bg-destructive/5' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Status Kecocokan Saldo
                </CardTitle>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    data?.seimbang
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                  }`}
                >
                  <Scale className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold tracking-tight tabular-nums ${
                    data?.seimbang ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {data?.seimbang ? 'COCOK (SEIMBANG)' : `SELISIH ${formatRupiah(data?.selisih || 0)}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data?.seimbang
                    ? 'Hitungan klop, saldo uang masuk dan keluar sesuai'
                    : 'Periksa fisik kas & catatan transaksi'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RINCIAN TABEL POS REKONSILIASI & LEDGER */}
          <div className="space-y-4">
            <TableToolbar
              searchPlaceholder="Cari pos mutasi..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              isFiltered={Boolean(searchQuery)}
              onReset={() => setSearchQuery('')}
            />

            <Card className="p-0 gap-0 overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                <CardTitle className="text-base font-bold">
                  Rincian Aliran Dana & Saldo
                </CardTitle>
                <CardDescription>
                  Daftar rincian uang masuk, uang belanja terpakai, dan sisa saldo pada periode terpilih.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rincian Catatan Uang</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Arah</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nominal (Rp)</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keterangan & Rujukan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Memuat data pengecekan selisih uang...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          {isError
                            ? 'Gagal memuat data rekonsiliasi dari server. Silakan klik Coba Lagi.'
                            : 'Tidak ditemukan pos yang sesuai dengan pencarian.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPos.map((posItem, idx) => (
                        <TableRow key={posItem.id} className="border-b border-border last:border-b-0">
                          <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {posItem.pos}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                posItem.arah === 'MASUK'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : posItem.arah === 'KELUAR'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                              }`}
                            >
                              {posItem.arah}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm tabular-nums">
                            {formatRupiah(posItem.nominal)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">
                            {posItem.keterangan}
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
    </>
  )
}
