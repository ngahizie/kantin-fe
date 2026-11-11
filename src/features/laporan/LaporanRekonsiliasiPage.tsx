import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { formatRupiah } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { exportTableToPdf } from '@/lib/pdfExport'
import { LaporanDateFilter, getDefaultDateFilter, LaporanExportButton } from './components'
import { laporanApi } from './api/laporan-api'
import type { RingkasanRekonsiliasi, ArusPosRekonsiliasiItem, LaporanFilterParams } from './types'

export function LaporanRekonsiliasiPage() {
  const [data, setData] = useState<RingkasanRekonsiliasi | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
        const res = await laporanApi.getRekonsiliasi(dateFilterParams)
        if (!isMounted) return
        setData(res)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat rekonsiliasi'
        toast.error('Gagal Memuat Laporan', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadData()
    return () => {
      isMounted = false
    }
  }, [dateFilterParams])

  // Baris Rincian Pos Akuntansi
  const rincianPos: ArusPosRekonsiliasiItem[] = useMemo(() => {
    if (!data) return []

    return [
      {
        id: '1',
        pos: 'Top-up Online Siswa',
        kategori: 'MASUK',
        arah: 'KREDIT',
        nominal: data.topupOnline,
        keterangan: 'Pemasukan saldo via payment gateway / transfer virtual account',
      },
      {
        id: '2',
        pos: 'Top-up Tunai di TU',
        kategori: 'MASUK',
        arah: 'KREDIT',
        nominal: data.topupTunai,
        keterangan: 'Penerimaan fisik uang tunai di loket Tata Usaha',
      },
      {
        id: '3',
        pos: 'Pengembalian Saldo Siswa (Refund)',
        kategori: 'KELUAR',
        arah: 'DEBIT',
        nominal: data.refund,
        keterangan: 'Pengembalian sisa saldo bagi siswa yang lulus atau pindah sekolah',
      },
      {
        id: '4',
        pos: 'Penjualan Bersih Kantin',
        kategori: 'SALDO',
        arah: 'DEBIT',
        nominal: data.penjualanBersih,
        keterangan: `Penjualan kotor ${formatRupiah(data.penjualan)} dikurangi pembatalan ${formatRupiah(data.voidPenjualan)}`,
      },
      {
        id: '5',
        pos: 'Saldo Mengendap Siswa',
        kategori: 'SALDO',
        arah: 'STATUS',
        nominal: data.saldoSiswa,
        keterangan: 'Total dana titipan tersimpan di kartu seluruh siswa (kewajiban sekolah)',
      },
      {
        id: '7',
        pos: 'Koreksi Saldo Masuk',
        kategori: 'MASUK',
        arah: 'KREDIT',
        nominal: data.koreksiMasuk,
        keterangan: 'Penyesuaian saldo tambah oleh bendahara dengan berita acara',
      },
      {
        id: '8',
        pos: 'Pembatalan Transaksi Kasir',
        kategori: 'MASUK',
        arah: 'KREDIT',
        nominal: data.voidPenjualan,
        keterangan: 'Pembatalan transaksi salah tap yang mengembalikan saldo',
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
        p.kategori.toLowerCase().includes(q)
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
          kategori: item.kategori,
          arah: item.arah,
          nominal: item.nominal,
          keterangan: item.keterangan,
        })),
        {
          pos: 'TOTAL TOP-UP BERSIH (Topup - Refund)',
          kategori: 'EVALUASI',
          arah: 'NETTO',
          nominal: data.topupBersih,
          keterangan: 'Formula: (Topup Online + Topup Tunai) - Refund',
        },
        {
          pos: 'TOTAL PENGGUNAAN & SALDO (Siswa + Penjualan)',
          kategori: 'EVALUASI',
          arah: 'NETTO',
          nominal: data.totalPenggunaan,
          keterangan: 'Formula: Saldo Siswa + Penjualan Bersih',
        },
        {
          pos: 'SELISIH INVARIANT AKUNTANSI',
          kategori: 'EVALUASI',
          arah: 'STATUS',
          nominal: data.selisih,
          keterangan: data.seimbang ? 'SEIMBANG (Rp 0)' : 'SELISIH - PERIKSA KAS!',
        },
      ]

      exportTableToExcel({
        filename: `Laporan_Rekonsiliasi_Harian_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Rekonsiliasi Harian',
        title: 'LAPORAN REKONSILIASI HARIAN & INVARIANT SALDO KANTIN SKOOLIA',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Periode Rekonsiliasi': dateFilterLabel,
          'Status Rekonsiliasi': data.seimbang ? 'SEIMBANG (VALID)' : 'TIDAK SEIMBANG (SELISIH)',
          'Total Selisih': formatRupiah(data.selisih),
          'Saldo Mengendap Sekolah': formatRupiah(data.saldoMengendap),
          'Penjualan Bersih': formatRupiah(data.penjualanBersih),
        },
        columns: [
          { header: 'Pos Akuntansi / Ledger', key: 'pos', width: 35 },
          { header: 'Kategori', key: 'kategori', width: 14 },
          { header: 'Arah Mutasi', key: 'arah', width: 14 },
          {
            header: 'Nominal (Rp)',
            key: 'nominal',
            formatter: (v) => Number(v),
            width: 18,
          },
          { header: 'Keterangan Akuntansi', key: 'keterangan', width: 45 },
        ],
        data: exportRows,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Berkas Laporan Rekonsiliasi (.xlsx) berhasil diunduh.',
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
          kategori: item.kategori,
          arah: item.arah,
          nominal: formatRupiah(item.nominal),
          keterangan: item.keterangan,
        })),
        {
          pos: 'TOTAL TOP-UP BERSIH (Topup - Refund)',
          kategori: 'EVALUASI',
          arah: 'NETTO',
          nominal: formatRupiah(data.topupBersih),
          keterangan: 'Formula: (Topup Online + Topup Tunai) - Refund',
        },
        {
          pos: 'TOTAL PENGGUNAAN & SALDO (Siswa + Penjualan)',
          kategori: 'EVALUASI',
          arah: 'NETTO',
          nominal: formatRupiah(data.totalPenggunaan),
          keterangan: 'Formula: Saldo Siswa + Penjualan Bersih',
        },
        {
          pos: 'SELISIH INVARIANT AKUNTANSI',
          kategori: 'EVALUASI',
          arah: 'STATUS',
          nominal: formatRupiah(data.selisih),
          keterangan: data.seimbang ? 'SEIMBANG (Rp 0)' : 'SELISIH - PERIKSA KAS!',
        },
      ]

      exportTableToPdf({
        filename: `Laporan_Rekonsiliasi_Harian_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN REKONSILIASI HARIAN & INVARIANT SALDO',
        subtitle: 'Sistem Kasir & Pembukuan Kantin SKOOLIA',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Periode Rekonsiliasi': dateFilterLabel,
          'Status Rekonsiliasi': data.seimbang ? 'SEIMBANG (VALID)' : 'TIDAK SEIMBANG (SELISIH)',
          'Total Selisih': formatRupiah(data.selisih),
          'Saldo Mengendap Sekolah': formatRupiah(data.saldoMengendap),
          'Penjualan Bersih': formatRupiah(data.penjualanBersih),
        },
        columns: [
          { header: 'Pos Akuntansi / Ledger', key: 'pos' },
          { header: 'Kategori', key: 'kategori' },
          { header: 'Arah', key: 'arah' },
          { header: 'Nominal', key: 'nominal' },
          { header: 'Keterangan Akuntansi', key: 'keterangan' },
        ],
        data: exportRows,
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Berkas Laporan Rekonsiliasi (.pdf) berhasil diunduh.',
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
            <span className="text-xs font-medium">Cek Selisih Uang</span>
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
                Cek Selisih Uang (Pencocokan Harian)
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
                disabled={isLoading || !data}
              />
            </div>
          </div>

          {/* BANNER PERINGATAN MERAH MENCOLOK BILA SELISIH != 0 */}
          {data && !data.seimbang && (
            <div
              data-testid="banner-peringatan-selisih"
              className="relative overflow-hidden rounded-xl border-2 border-red-600 bg-red-50 p-6 text-red-950 dark:border-red-500 dark:bg-red-950/80 dark:text-red-100"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white">
                    <ShieldAlert className="h-7 w-7 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold tracking-tight text-red-700 dark:text-red-400">
                        PERINGATAN: DITEMUKAN SELISIH HITUNGAN UANG!
                      </h2>
                      <Badge variant="destructive" className="font-mono text-xs">
                        SELISIH: {formatRupiah(data.selisih)}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-red-900/90 dark:text-red-200">
                      Ditemukan selisih sebesar{' '}
                      <strong className="font-semibold underline">
                        {formatRupiah(data.selisih)}
                      </strong>{' '}
                      antara total uang masuk (isi saldo) dengan uang yang dibelanjakan serta sisa saldo di kartu.
                      Hal ini menandakan adanya perbedaan catatan, uang fisik kas yang belum disetor, atau transaksi yang belum tuntas.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-red-200/80 px-2.5 py-1 font-medium text-red-900 dark:bg-red-900/60 dark:text-red-200">
                        Topup Bersih: {formatRupiah(data.topupBersih)}
                      </span>
                      <span className="rounded-md bg-red-200/80 px-2.5 py-1 font-medium text-red-900 dark:bg-red-900/60 dark:text-red-200">
                        Total Penggunaan: {formatRupiah(data.totalPenggunaan)}
                      </span>
                      <span className="rounded-md bg-red-600 px-2.5 py-1 font-bold text-white">
                        Perlu Investigasi Bendahara & TU
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INVARIANT FORMULA EVALUATION CARD */}
          {data && (
            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                  Invariant Saldo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center">
                  {/* Sisi Kiri */}
                  <div className="rounded-xl border-0 bg-card p-4 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">
                      Sisi 1: Total Kredit Sistem
                    </p>
                    <p className="text-2xl font-bold font-mono tracking-tight text-primary">
                      {formatRupiah(data.totalKreditSemua || data.topupBersih)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {data.totalKreditSemua > 0
                        ? `Akumulasi Uang Masuk & Kredit (${formatRupiah(data.totalKreditSemua)})`
                        : `Topup Tunai (${formatRupiah(data.topupTunai)}) + Online (${formatRupiah(data.topupOnline)}) − Refund (${formatRupiah(data.totalRefundSemua)})`}
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
                      className={`mt-1 text-xs font-bold ${
                        data.seimbang ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {data.seimbang
                        ? 'Seimbang (Selisih Rp 0)'
                        : `Selisih: ${formatRupiah(data.selisih)}`}
                    </span>
                  </div>

                  {/* Sisi Kanan */}
                  <div className="rounded-xl border-0 bg-card p-4 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">
                      Sisi 2: Penggunaan & Saldo Siswa
                    </p>
                    <p className="text-2xl font-bold font-mono tracking-tight text-primary">
                      {formatRupiah(
                        data.totalKreditSemua > 0
                          ? data.totalDebitSemua + (data.saldoSiswa || data.saldoMengendap)
                          : data.totalPenggunaan
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {data.totalKreditSemua > 0
                        ? `Debit Terpakai (${formatRupiah(data.totalDebitSemua)}) + Saldo Siswa (${formatRupiah(data.saldoSiswa || data.saldoMengendap)})`
                        : `Saldo Siswa (${formatRupiah(data.saldoSiswa || data.saldoMengendap)}) + Penjualan (${formatRupiah(data.penjualanBersih)})`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* METRIC SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Top-up Masuk
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold tracking-tight">
                  {data ? formatRupiah(data.totalTopupSemua) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 flex justify-between">
                  <span>Tunai: {data ? formatRupiah(data.topupTunai) : '-'}</span>
                  <span>Online: {data ? formatRupiah(data.topupOnline) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Penjualan Bersih
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold tracking-tight">
                  {data ? formatRupiah(data.penjualanBersih) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5 flex justify-between">
                  <span>Kotor: {data ? formatRupiah(data.penjualan) : '-'}</span>
                  <span className="text-amber-600 font-medium">Batal: {data ? formatRupiah(data.voidPenjualan) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Saldo Mengendap (Kewajiban)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold tracking-tight">
                  {data ? formatRupiah(data.saldoSiswa) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  Total saldo aktif tersimpan di kartu seluruh siswa
                </div>
              </CardContent>
            </Card>

            <Card className={data && !data.seimbang ? 'border-0 bg-red-500/10 dark:bg-red-950/30' : 'border-0 bg-muted/70 dark:bg-muted/30'}>
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Status Kecocokan Saldo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div
                  className={`text-2xl font-bold tracking-tight ${
                    data?.seimbang ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {data?.seimbang ? 'COCOK (SEIMBANG)' : `SELISIH ${formatRupiah(data?.selisih || 0)}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {data?.seimbang
                    ? 'Hitungan klop, saldo uang masuk dan keluar sesuai'
                    : 'Periksa fisik kas & catatan transaksi'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RINCIAN TABEL POS REKONSILIASI & LEDGER */}
          <Card className="border-0 bg-muted/70 dark:bg-muted/30">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Rincian Aliran Dana & Saldo
                </CardTitle>
                <CardDescription>
                  Daftar rincian uang masuk, uang belanja terpakai, dan sisa saldo pada periode terpilih.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                  <Input
                    placeholder="Cari pos mutasi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm bg-background"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border-0 overflow-hidden bg-card/60 dark:bg-card/30">
                <Table>
                  <TableHeader className="bg-muted/80 dark:bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">No.</TableHead>
                      <TableHead>Pos Akuntansi / Ledger</TableHead>
                      <TableHead className="text-center">Kategori</TableHead>
                      <TableHead className="text-center">Arah</TableHead>
                      <TableHead className="text-right">Nominal (Rp)</TableHead>
                      <TableHead>Keterangan & Rujukan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          Memuat data rekonsiliasi harian...
                        </TableCell>
                      </TableRow>
                    ) : filteredPos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Tidak ditemukan pos yang sesuai dengan pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPos.map((posItem, idx) => (
                        <TableRow key={posItem.id}>
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {posItem.pos}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                posItem.kategori === 'MASUK'
                                  ? 'border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : posItem.kategori === 'KELUAR'
                                  ? 'border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                  : 'border-0 bg-blue-500/15 text-blue-700 dark:text-blue-400'
                              }
                            >
                              {posItem.kategori}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {posItem.arah === 'KREDIT' ? (
                              <span className="text-emerald-600 font-bold">KREDIT</span>
                            ) : posItem.arah === 'DEBIT' ? (
                              <span className="text-blue-600 font-bold">DEBIT</span>
                            ) : (
                              <span className="text-muted-foreground">STATUS</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm">
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
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
