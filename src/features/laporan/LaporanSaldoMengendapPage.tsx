import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  Wallet,
  Users,
  CreditCard,
  Download,
  RefreshCw,
  Search,
  ArrowRight,
  UserCheck,
  Ban,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import { exportMultiSheetExcel } from '@/lib/excelExport'
import { laporanApi } from './api/laporan-api'
import type {
  RingkasanSaldoMengendap,
  SiswaSaldoDetail,
  KartuTamuSaldoDetail,
} from './types'

export function LaporanSaldoMengendapPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanSaldoMengendap | null>(null)
  const [siswaList, setSiswaList] = useState<SiswaSaldoDetail[]>([])
  const [kartuTamuList, setKartuTamuList] = useState<KartuTamuSaldoDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'siswa' | 'kartu-tamu'>('siswa')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [resRingkasan, resSiswa, resKartuTamu] = await Promise.all([
        laporanApi.getSaldoMengendap(),
        laporanApi.getSiswaSaldoList(),
        laporanApi.getKartuTamuSaldoList(),
      ])

      setRingkasan(resRingkasan)
      setSiswaList(resSiswa)
      setKartuTamuList(resKartuTamu)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat saldo mengendap'
      toast.error('Gagal Memuat Laporan', { description: msg })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [resRingkasan, resSiswa, resKartuTamu] = await Promise.all([
          laporanApi.getSaldoMengendap(),
          laporanApi.getSiswaSaldoList(),
          laporanApi.getKartuTamuSaldoList(),
        ])
        if (!isMounted) return
        setRingkasan(resRingkasan)
        setSiswaList(resSiswa)
        setKartuTamuList(resKartuTamu)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat saldo mengendap'
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

  // Filter Siswa
  const filteredSiswa = useMemo(() => {
    if (!searchQuery.trim()) return siswaList
    const q = searchQuery.toLowerCase()
    return siswaList.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q)
    )
  }, [siswaList, searchQuery])

  // Filter Kartu Tamu
  const filteredKartuTamu = useMemo(() => {
    if (!searchQuery.trim()) return kartuTamuList
    const q = searchQuery.toLowerCase()
    return kartuTamuList.filter(
      (k) =>
        k.nomorKartu.toLowerCase().includes(q) ||
        k.labelPemegang.toLowerCase().includes(q) ||
        k.uid.toLowerCase().includes(q)
    )
  }, [kartuTamuList, searchQuery])

  // Ekspor Excel Multi-Sheet
  const handleExportExcel = () => {
    if (!ringkasan) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      exportMultiSheetExcel({
        filename: `Laporan_Saldo_Mengendap_${new Date().toISOString().split('T')[0]}`,
        sheets: [
          {
            sheetName: 'Saldo Siswa',
            title: 'LAPORAN SALDO MENGENDAP SISWA (DANA TITIPAN ORTU)',
            metadata: {
              'Tanggal Cetak': new Date().toLocaleString('id-ID'),
              'Total Saldo Mengendap Siswa': formatRupiah(ringkasan.saldoSiswa),
              'Jumlah Siswa Bersaldo': `${ringkasan.jumlahSiswa} Siswa`,
            },
            columns: [
              { header: 'NIS', key: 'nis', width: 14 },
              { header: 'Nama Siswa', key: 'nama', width: 25 },
              { header: 'Kelas', key: 'kelas', width: 12 },
              { header: 'Saldo Berjalan (Rp)', key: 'saldo', width: 18 },
              { header: 'Limit Harian (Rp)', key: 'limitHarian', width: 16 },
              { header: 'Belanja Hari Ini (Rp)', key: 'belanjaHariIni', width: 18 },
              {
                header: 'Status Kartu',
                key: 'isBlocked',
                formatter: (v) => (v ? 'DIBLOKIR' : 'AKTIF'),
                width: 14,
              },
              { header: 'Nama Orang Tua', key: 'parentName', width: 22 },
              { header: 'Kontak Orang Tua', key: 'parentPhone', width: 18 },
            ],
            data: siswaList,
          },
          {
            sheetName: 'Saldo Kartu Tamu',
            title: 'LAPORAN SALDO MENGENDAP KARTU TAMU (GURU / STAF / TAMU)',
            metadata: {
              'Tanggal Cetak': new Date().toLocaleString('id-ID'),
              'Total Saldo Mengendap Tamu': formatRupiah(ringkasan.saldoKartuTamu),
              'Jumlah Kartu Tamu': `${ringkasan.jumlahKartuTamu} Kartu`,
            },
            columns: [
              { header: 'Nomor Kartu', key: 'nomorKartu', width: 16 },
              { header: 'UID RFID', key: 'uid', width: 16 },
              { header: 'Label Pemegang', key: 'labelPemegang', width: 25 },
              { header: 'Saldo Berjalan (Rp)', key: 'saldo', width: 18 },
              { header: 'Status', key: 'status', width: 14 },
            ],
            data: kartuTamuList,
          },
        ],
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Laporan Saldo Mengendap (.xlsx) dengan 2 sheet berhasil diunduh.',
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
            <span className="text-xs font-medium">Saldo Mengendap</span>
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
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Laporan Saldo Mengendap
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Total dana titipan siswa & kartu tamu yang menjadi kewajiban sekolah.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
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
                disabled={isLoading || !ringkasan}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
            </div>
          </div>

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-primary">
                  Total Dana Titipan (Kewajiban Sekolah)
                </CardTitle>
                <div className="rounded-lg bg-primary/20 p-2 text-primary">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-primary">
                  {ringkasan ? formatRupiah(ringkasan.total) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Akumulasi dana titipan yang belum dibelanjakan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Mengendap Siswa
                </CardTitle>
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatRupiah(ringkasan.saldoSiswa) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dari {ringkasan ? formatNumber(ringkasan.jumlahSiswa) : 0} siswa terdaftar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Mengendap Kartu Tamu
                </CardTitle>
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
                  <CreditCard className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatRupiah(ringkasan.saldoKartuTamu) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dari {ringkasan ? formatNumber(ringkasan.jumlahKartuTamu) : 0} kartu tamu/guru
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABS VIEW: SALDO SISWA vs SALDO KARTU TAMU */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'siswa' | 'kartu-tamu')}
            className="space-y-4"
          >
            <TableToolbar
              extraLeft={
                <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                  <TabsTrigger value="siswa" className="gap-2">
                    <Users className="h-4 w-4" />
                    <span>Saldo Siswa ({siswaList.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="kartu-tamu" className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Saldo Kartu Tamu ({kartuTamuList.length})</span>
                  </TabsTrigger>
                </TabsList>
              }
              searchPlaceholder={
                activeTab === 'siswa'
                  ? 'Cari nama, NIS, kelas, wali...'
                  : 'Cari nomor kartu, pemegang, UID...'
              }
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              isFiltered={Boolean(searchQuery)}
              onReset={() => setSearchQuery('')}
            />
{/* TAB CONTENT: SALDO SISWA */}
            <TabsContent value="siswa" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">
                    Rincian Dana Titipan per Siswa
                  </CardTitle>
                  <CardDescription>
                    Saldo berjalan setiap siswa yang dititipkan oleh orang tua murid dan dapat dicairkan saat lulus/keluar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>NIS</TableHead>
                          <TableHead>Nama Siswa</TableHead>
                          <TableHead>Kelas</TableHead>
                          <TableHead className="text-right">Saldo Berjalan</TableHead>
                          <TableHead className="text-right">Limit Harian</TableHead>
                          <TableHead className="text-right">Belanja Hari Ini</TableHead>
                          <TableHead className="text-center">Status Kartu</TableHead>
                          <TableHead>Wali Murid</TableHead>
                          <TableHead className="text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                              Memuat data saldo siswa...
                            </TableCell>
                          </TableRow>
                        ) : filteredSiswa.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                              Tidak ada siswa yang sesuai pencarian.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSiswa.map((siswa, idx) => (
                            <TableRow key={siswa.siswaId}>
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-semibold">
                                {siswa.nis}
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                {siswa.nama}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {siswa.kelas}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-sm text-primary">
                                {formatRupiah(siswa.saldo)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {formatRupiah(siswa.limitHarian)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {formatRupiah(siswa.belanjaHariIni)}
                              </TableCell>
                              <TableCell className="text-center">
                                {siswa.isBlocked ? (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <Ban className="h-3 w-3" />
                                    <span>Diblokir</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500 gap-1">
                                    <UserCheck className="h-3 w-3" />
                                    <span>Aktif</span>
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                <div className="font-medium text-foreground">{siswa.parentName}</div>
                                <div className="text-[11px]">{siswa.parentPhone}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-8 text-xs text-primary gap-1"
                                >
                                  <Link
                                    to="/laporan/riwayat-siswa"
                                    search={{ siswaId: siswa.siswaId }}
                                  >
                                    <span>Riwayat</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB CONTENT: SALDO KARTU TAMU */}
            <TabsContent value="kartu-tamu" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">
                    Rincian Dana Titipan per Kartu Tamu
                  </CardTitle>
                  <CardDescription>
                    Saldo aktif pada kartu tamu non-siswa (guru, staf, atau pengunjung) yang dapat di-refund saat kartu dikembalikan ke TU.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Nomor Kartu</TableHead>
                          <TableHead>UID RFID</TableHead>
                          <TableHead>Label Pemegang</TableHead>
                          <TableHead className="text-right">Saldo Berjalan</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Tanggal Terbit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                              Memuat data kartu tamu...
                            </TableCell>
                          </TableRow>
                        ) : filteredKartuTamu.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              Tidak ada kartu tamu yang sesuai pencarian.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredKartuTamu.map((kt, idx) => (
                            <TableRow key={kt.id}>
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-semibold">
                                {kt.nomorKartu}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {kt.uid}
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                {kt.labelPemegang}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-sm text-purple-600">
                                {formatRupiah(kt.saldo)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={kt.status === 'ACTIVE' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {kt.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDateTime(kt.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </>
  )
}
