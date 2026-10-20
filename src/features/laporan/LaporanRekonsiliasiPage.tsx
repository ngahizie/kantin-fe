import { useState, useEffect, useMemo } from 'react'
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Wallet,
  ArrowDownLeft,
  ShieldAlert,
  Coins,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { laporanApi } from './api/laporan-api'
import type { RingkasanRekonsiliasi, ArusPosRekonsiliasiItem } from './types'

export function LaporanRekonsiliasiPage() {
  const [data, setData] = useState<RingkasanRekonsiliasi | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [simulasiSelisih, setSimulasiSelisih] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = async (overrideSimulasi?: boolean) => {
    try {
      setIsLoading(true)
      const isSim = overrideSimulasi !== undefined ? overrideSimulasi : simulasiSelisih
      const res = await laporanApi.getRekonsiliasi({
        simulasiSelisih: isSim,
      })
      setData(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat rekonsiliasi'
      toast.error('Gagal Memuat Laporan', { description: msg })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const res = await laporanApi.getRekonsiliasi({ simulasiSelisih: false })
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
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  const handleToggleSimulasi = () => {
    const nextVal = !simulasiSelisih
    setSimulasiSelisih(nextVal)
    void loadData(nextVal)
    if (nextVal) {
      toast.warning('Mode Simulasi Selisih Aktif', {
        description: 'Menampilkan kondisi invariant TIDAK seimbang (selisih Rp 75.000) untuk pengujian UI.',
      })
    } else {
      toast.success('Mode Seimbang Dipulihkan', {
        description: 'Invariant akuntansi kembali seimbang (selisih Rp 0).',
      })
    }
  }

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
        pos: 'Refund Saldo Siswa & Tamu',
        kategori: 'KELUAR',
        arah: 'DEBIT',
        nominal: data.refund,
        keterangan: 'Pengembalian saldo siswa lulus/pindah & pengembalian kartu tamu',
      },
      {
        id: '4',
        pos: 'Penjualan Bersih Kantin',
        kategori: 'SALDO',
        arah: 'DEBIT',
        nominal: data.penjualanBersih,
        keterangan: `Penjualan kotor ${formatRupiah(data.penjualan)} dikurangi void ${formatRupiah(data.voidPenjualan)}`,
      },
      {
        id: '5',
        pos: 'Saldo Mengendap Siswa',
        kategori: 'SALDO',
        arah: 'STATUS',
        nominal: data.saldoSiswa,
        keterangan: 'Total saldo aktif pada kartu seluruh siswa (kewajiban sekolah)',
      },
      {
        id: '6',
        pos: 'Saldo Mengendap Kartu Tamu',
        kategori: 'SALDO',
        arah: 'STATUS',
        nominal: data.saldoKartuTamu,
        keterangan: 'Total saldo aktif pada kartu guru, staf, & tamu',
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
        pos: 'Void Penjualan Kasir',
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
          pos: 'TOTAL PENGGUNAAN & SALDO (Siswa + Tamu + Penjualan)',
          kategori: 'EVALUASI',
          arah: 'NETTO',
          nominal: data.totalPenggunaan,
          keterangan: 'Formula: Saldo Siswa + Saldo Kartu Tamu + Penjualan Bersih',
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

  return (
    <>
      <Header fixed>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Pusat Laporan Keuangan
            </span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-xs font-medium">Rekonsiliasi Harian</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main fixed>
        <div className="space-y-6 pb-12">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Laporan Rekonsiliasi Harian
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Pemeriksaan invariant akuntansi: Topup − Refund = Saldo Siswa + Saldo Kartu Tamu + Penjualan Bersih.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Tombol Simulasi Selisih untuk pengujian Banner Merah */}
              <Button
                variant={simulasiSelisih ? 'destructive' : 'outline'}
                size="sm"
                onClick={handleToggleSimulasi}
                className="gap-2 shadow-xs"
              >
                {simulasiSelisih ? (
                  <>
                    <ToggleRight className="h-4 w-4" />
                    <span>Mode Selisih Aktif (Rp 75.000)</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4" />
                    <span>Uji Banner Selisih Merah</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadData()}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleExportExcel}
                disabled={isLoading || !data}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
            </div>
          </div>

          {/* 🚨 BANNER PERINGATAN MERAH MENCOLOK BILA SELISIH != 0 */}
          {data && !data.seimbang && (
            <div
              data-testid="banner-peringatan-selisih"
              className="relative overflow-hidden rounded-xl border-2 border-red-600 bg-red-50 p-6 text-red-950 shadow-xl dark:border-red-500 dark:bg-red-950/80 dark:text-red-100"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md">
                    <ShieldAlert className="h-7 w-7 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold tracking-tight text-red-700 dark:text-red-400">
                        PERINGATAN: INVARIANT AKUNTANSI TIDAK SEIMBANG!
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
                      antara arus top-up bersih dengan akumulasi saldo mengendap dan penjualan bersih.
                      Hal ini mengindikasikan adanya inkonsistensi mutasi kas, selisih pembulatan, atau transaksi void yang belum terekonsiliasi.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-red-200/80 px-2.5 py-1 font-medium text-red-900 dark:bg-red-900/60 dark:text-red-200">
                        Topup Bersih: {formatRupiah(data.topupBersih)}
                      </span>
                      <span className="rounded-md bg-red-200/80 px-2.5 py-1 font-medium text-red-900 dark:bg-red-900/60 dark:text-red-200">
                        Total Penggunaan: {formatRupiah(data.totalPenggunaan)}
                      </span>
                      <span className="rounded-md bg-red-600 px-2.5 py-1 font-bold text-white shadow-xs">
                        Perlu Investigasi Bendahara & TU
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleToggleSimulasi()}
                    className="shadow-sm"
                  >
                    Atur Kembali ke Seimbang
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ BANNER STATUS SEIMBANG HIJAU (KETIKA SELISIH == 0) */}
          {data && data.seimbang && (
            <div
              data-testid="banner-status-seimbang"
              className="flex items-start gap-4 rounded-xl border border-emerald-500/50 bg-emerald-50/80 p-5 text-emerald-950 shadow-xs dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                    INVARIANT AKUNTANSI TEREKONSILIASI LENGKAP
                  </h2>
                  <Badge className="bg-emerald-600 text-white font-mono text-xs hover:bg-emerald-600">
                    STATUS: SEIMBANG (0 SELISIH)
                  </Badge>
                </div>
                <p className="text-sm text-emerald-800/90 dark:text-emerald-200/90">
                  Seluruh arus dana masuk dan keluar cocok 100%. Rumus invariant akuntansi terpenuhi:
                  {' '}
                  <span className="font-medium font-mono text-xs bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                    Topup ({formatRupiah(data.totalTopupSemua)}) − Refund ({formatRupiah(data.totalRefundSemua)}) = Saldo Mengendap ({formatRupiah(data.saldoMengendap)}) + Penjualan ({formatRupiah(data.penjualanBersih)})
                  </span>
                  . Pembukuan siap diaudit oleh Kepala Sekolah.
                </p>
              </div>
            </div>
          )}

          {/* INVARIANT FORMULA EVALUATION CARD */}
          {data && (
            <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-card to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center justify-between">
                  <span>Rumus Invariant Saldo</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    Audit Harian Otomatis
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center">
                  {/* Sisi Kiri */}
                  <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">
                      Sisi 1: Top-up Bersih
                    </p>
                    <p className="text-2xl font-bold font-mono tracking-tight text-primary">
                      {formatRupiah(data.topupBersih)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Topup Tunai ({formatRupiah(data.topupTunai)}) + Online ({formatRupiah(data.topupOnline)}) − Refund ({formatRupiah(data.totalRefundSemua)})
                    </p>
                  </div>

                  {/* Simbol Sama Dengan */}
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                        data.seimbang
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                      }`}
                    >
                      <span className="text-xl font-black">
                        {data.seimbang ? '=' : '≠'}
                      </span>
                    </div>
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
                  <div className="rounded-xl border bg-card p-4 shadow-2xs space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">
                      Sisi 2: Penggunaan & Saldo
                    </p>
                    <p className="text-2xl font-bold font-mono tracking-tight text-primary">
                      {formatRupiah(data.totalPenggunaan)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Saldo Mengendap ({formatRupiah(data.saldoMengendap)}) + Penjualan Bersih ({formatRupiah(data.penjualanBersih)})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* METRIC SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Top-up Masuk
                </CardTitle>
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {data ? formatRupiah(data.totalTopupSemua) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>Tunai: {data ? formatRupiah(data.topupTunai) : '-'}</span>
                  <span>Online: {data ? formatRupiah(data.topupOnline) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Penjualan Bersih
                </CardTitle>
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                  <Coins className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {data ? formatRupiah(data.penjualanBersih) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>Bruto: {data ? formatRupiah(data.penjualan) : '-'}</span>
                  <span className="text-amber-600">Void: {data ? formatRupiah(data.voidPenjualan) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Mengendap (Kewajiban)
                </CardTitle>
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {data ? formatRupiah(data.saldoMengendap) : '...'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>Siswa: {data ? formatRupiah(data.saldoSiswa) : '-'}</span>
                  <span>Tamu: {data ? formatRupiah(data.saldoKartuTamu) : '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={data && !data.seimbang ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Status Rekonsiliasi
                </CardTitle>
                <div
                  className={`rounded-lg p-2 ${
                    data?.seimbang
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-red-500/10 text-red-600'
                  }`}
                >
                  {data?.seimbang ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold tracking-tight ${
                    data?.seimbang ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {data?.seimbang ? 'SEIMBANG' : `SELISIH ${formatRupiah(data?.selisih || 0)}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data?.seimbang
                    ? '100% Invariant Akuntansi Terpenuhi'
                    : 'Periksa fisik kas & ledger'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RINCIAN TABEL POS REKONSILIASI & LEDGER */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Rincian Pos Mutasi & Ledger Akuntansi
                </CardTitle>
                <CardDescription>
                  Daftar seluruh komponen pembentuk arus kas saldo kantin periode terpilih.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                  <Input
                    placeholder="Cari pos mutasi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
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
                              variant="outline"
                              className={
                                posItem.kategori === 'MASUK'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : posItem.kategori === 'KELUAR'
                                  ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                  : 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }
                            >
                              {posItem.kategori}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {posItem.arah === 'KREDIT' ? (
                              <span className="text-emerald-600 font-bold">+ KREDIT</span>
                            ) : posItem.arah === 'DEBIT' ? (
                              <span className="text-blue-600 font-bold">− DEBIT</span>
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
