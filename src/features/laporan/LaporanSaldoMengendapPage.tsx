import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  CreditCard,
  Download,
  ArrowRight,
  UserCheck,
  Ban,
  Info,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useRoleStore, type UserRole } from '@/stores/useRoleStore'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
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
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import { exportMultiSheetExcel } from '@/lib/excelExport'
import { exportMultiSectionPdf, type PdfTableSection } from '@/lib/pdfExport'
import { laporanApi } from './api/laporan-api'
import type {
  RingkasanSaldoMengendap,
  SiswaSaldoDetail,
  KartuTamuSaldoDetail,
} from './types'

export function LaporanSaldoMengendapPage() {
  const { currentRole } = useRoleStore()
  const authUser = useAuthStore((s) => s.auth.user)
  const activeRole: UserRole = currentRole || authUser?.currentRole || 'admin'

  const isTuOrBendahara = activeRole === 'tu' || activeRole === 'bendahara'
  const isAdmin = activeRole === 'admin'

  // Izin akses rincian sesuai aturan BE:
  // - Siswa: TU/Bendahara dan Admin Sekolah
  // - Kartu Tamu: hanya TU/Bendahara
  // - Kepala Sekolah: hanya ringkasan (tidak meminta rincian siswa maupun kartu tamu)
  const canAccessSiswa = isTuOrBendahara || isAdmin
  const canAccessKartuTamu = isTuOrBendahara

  const [ringkasan, setRingkasan] = useState<RingkasanSaldoMengendap | null>(null)
  const [siswaList, setSiswaList] = useState<SiswaSaldoDetail[]>([])
  const [kartuTamuList, setKartuTamuList] = useState<KartuTamuSaldoDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const defaultTab: 'siswa' | 'kartu-tamu' = canAccessSiswa ? 'siswa' : 'kartu-tamu'
  const [selectedTab, setSelectedTab] = useState<'siswa' | 'kartu-tamu' | null>(null)
  const activeTab =
    selectedTab &&
    ((selectedTab === 'siswa' && canAccessSiswa) ||
      (selectedTab === 'kartu-tamu' && canAccessKartuTamu))
      ? selectedTab
      : defaultTab
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        setIsLoading(true)
        // 1. Ringkasan selalu dipanggil (TU/Bendahara, Admin Sekolah, Kepala Sekolah)
        const ringkasanPromise = laporanApi.getSaldoMengendap()

        // 2. Rincian siswa: hanya dipanggil untuk TU/Bendahara dan Admin Sekolah
        const siswaPromise = canAccessSiswa
          ? laporanApi.getSiswaSaldoList()
          : Promise.resolve([] as SiswaSaldoDetail[])

        // 3. Rincian kartu tamu: hanya dipanggil untuk TU/Bendahara
        const kartuTamuPromise = canAccessKartuTamu
          ? laporanApi.getKartuTamuSaldoList()
          : Promise.resolve([] as KartuTamuSaldoDetail[])

        const [resRingkasan, resSiswa, resKartuTamu] = await Promise.all([
          ringkasanPromise,
          siswaPromise,
          kartuTamuPromise,
        ])
        if (!isMounted) return
        if (
          resRingkasan &&
          resRingkasan.jumlahSiswa === 0 &&
          resSiswa &&
          resSiswa.length > 0
        ) {
          const totalSiswa = resSiswa.reduce((sum, s) => sum + (s.saldo || 0), 0)
          setRingkasan({
            ...resRingkasan,
            saldoSiswa: totalSiswa,
            jumlahSiswa: resSiswa.length,
            total: totalSiswa + (resRingkasan.saldoKartuTamu || 0),
          })
        } else {
          setRingkasan(resRingkasan)
        }
        setSiswaList(resSiswa || [])
        setKartuTamuList(resKartuTamu || [])
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
  }, [canAccessSiswa, canAccessKartuTamu])

  // Filter Siswa
  const filteredSiswa = useMemo(() => {
    if (!canAccessSiswa) return []
    if (!searchQuery.trim()) return siswaList
    const q = searchQuery.toLowerCase()
    return siswaList.filter(
      (s) =>
        s.nama?.toLowerCase().includes(q) ||
        s.nis?.toLowerCase().includes(q) ||
        s.kelas?.toLowerCase().includes(q) ||
        (s.parentName && s.parentName.toLowerCase().includes(q))
    )
  }, [canAccessSiswa, siswaList, searchQuery])

  // Filter Kartu Tamu
  const filteredKartuTamu = useMemo(() => {
    if (!canAccessKartuTamu) return []
    if (!searchQuery.trim()) return kartuTamuList
    const q = searchQuery.toLowerCase()
    return kartuTamuList.filter(
      (k) =>
        k.nomorKartu?.toLowerCase().includes(q) ||
        k.labelPemegang?.toLowerCase().includes(q) ||
        k.uid?.toLowerCase().includes(q)
    )
  }, [canAccessKartuTamu, kartuTamuList, searchQuery])

  // Ekspor Excel Multi-Sheet disesuaikan dengan role
  const handleExportExcel = () => {
    if (!ringkasan) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      const sheets = []

      // Sheet 1: Saldo Siswa (TU/Bendahara & Admin)
      if (canAccessSiswa) {
        sheets.push({
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
              formatter: (v: unknown) => (v ? 'DIBLOKIR' : 'AKTIF'),
              width: 14,
            },
            { header: 'Nama Orang Tua', key: 'parentName', width: 22 },
            { header: 'Kontak Orang Tua', key: 'parentPhone', width: 18 },
          ],
          data: siswaList,
        })
      }

      // Sheet 2: Saldo Kartu Tamu (TU/Bendahara)
      if (canAccessKartuTamu) {
        sheets.push({
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
        })
      }

      // Sheet Ringkasan untuk Kepala Sekolah (jika tidak memiliki akses rincian)
      if (sheets.length === 0) {
        sheets.push({
          sheetName: 'Ringkasan Eksekutif',
          title: 'LAPORAN RINGKASAN SALDO MENGENDAP (KEWAJIBAN SEKOLAH)',
          metadata: {
            'Tanggal Cetak': new Date().toLocaleString('id-ID'),
            'Total Dana Titipan': formatRupiah(ringkasan.total),
          },
          columns: [
            { header: 'Kategori', key: 'kategori', width: 28 },
            { header: 'Jumlah', key: 'jumlah', width: 18 },
            { header: 'Total Saldo Mengendap (Rp)', key: 'total', width: 25 },
          ],
          data: [
            {
              kategori: 'Saldo Mengendap Siswa',
              jumlah: `${formatNumber(ringkasan.jumlahSiswa)} Siswa`,
              total: formatRupiah(ringkasan.saldoSiswa),
            },
            {
              kategori: 'Saldo Mengendap Kartu Tamu',
              jumlah: `${formatNumber(ringkasan.jumlahKartuTamu)} Kartu`,
              total: formatRupiah(ringkasan.saldoKartuTamu),
            },
            {
              kategori: 'Total Kewajiban Sekolah',
              jumlah: `${formatNumber(ringkasan.jumlahSiswa + ringkasan.jumlahKartuTamu)} Akun`,
              total: formatRupiah(ringkasan.total),
            },
          ],
        })
      }

      exportMultiSheetExcel({
        filename: `Laporan_Saldo_Mengendap_${new Date().toISOString().split('T')[0]}`,
        sheets,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: `Laporan Saldo Mengendap (${sheets.length} sheet) berhasil diunduh.`,
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
      const sections: PdfTableSection[] = []

      // Section 1: Saldo Siswa
      if (canAccessSiswa) {
        sections.push({
          sectionTitle: '1. Rincian Saldo Mengendap Siswa (Dana Titipan Wali Murid)',
          columns: [
            { header: 'NIS', key: 'nis' },
            { header: 'Nama Siswa', key: 'nama' },
            { header: 'Kelas', key: 'kelas' },
            {
              header: 'Saldo Berjalan',
              key: 'saldo',
              formatter: (v: unknown) => formatRupiah(Number(v)),
            },
            {
              header: 'Limit Harian',
              key: 'limitHarian',
              formatter: (v: unknown) => formatRupiah(Number(v)),
            },
            {
              header: 'Belanja Hari Ini',
              key: 'belanjaHariIni',
              formatter: (v: unknown) => formatRupiah(Number(v)),
            },
            {
              header: 'Status',
              key: 'isBlocked',
              formatter: (v: unknown) => (v ? 'DIBLOKIR' : 'AKTIF'),
            },
            { header: 'Orang Tua', key: 'parentName' },
          ],
          data: siswaList,
        })
      }

      // Section 2: Saldo Kartu Tamu
      if (canAccessKartuTamu) {
        sections.push({
          sectionTitle: '2. Rincian Saldo Mengendap Kartu Tamu (Staf/Guru/Tamu)',
          columns: [
            { header: 'No. Kartu', key: 'nomorKartu' },
            { header: 'UID RFID', key: 'uid' },
            { header: 'Label Pemegang', key: 'labelPemegang' },
            {
              header: 'Saldo Berjalan',
              key: 'saldo',
              formatter: (v: unknown) => formatRupiah(Number(v)),
            },
            { header: 'Status', key: 'status' },
          ],
          data: kartuTamuList,
        })
      }

      // Section Ringkasan jika Kepala Sekolah atau rincian kosong
      if (sections.length === 0) {
        sections.push({
          sectionTitle: 'Ringkasan Eksekutif Saldo Mengendap (Kewajiban Sekolah)',
          columns: [
            { header: 'Kategori Akun', key: 'kategori' },
            { header: 'Jumlah Pemegang', key: 'jumlah' },
            { header: 'Total Saldo Mengendap', key: 'total' },
          ],
          data: [
            {
              kategori: 'Saldo Mengendap Siswa',
              jumlah: `${formatNumber(ringkasan.jumlahSiswa)} Siswa`,
              total: formatRupiah(ringkasan.saldoSiswa),
            },
            {
              kategori: 'Saldo Mengendap Kartu Tamu',
              jumlah: `${formatNumber(ringkasan.jumlahKartuTamu)} Kartu`,
              total: formatRupiah(ringkasan.saldoKartuTamu),
            },
            {
              kategori: 'Total Kewajiban Sekolah',
              jumlah: `${formatNumber(ringkasan.jumlahSiswa + ringkasan.jumlahKartuTamu)} Akun`,
              total: formatRupiah(ringkasan.total),
            },
          ],
        })
      }

      exportMultiSectionPdf({
        filename: `Laporan_Saldo_Mengendap_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN SALDO MENGENDAP & KEWAJIBAN DANA TITIPAN',
        subtitle: 'Audit Akuntabilitas Dana Siswa & Kartu Tamu Kantin SKOOLIA',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Total Kewajiban Sekolah': formatRupiah(ringkasan.total),
          'Saldo Mengendap Siswa': formatRupiah(ringkasan.saldoSiswa),
          'Saldo Mengendap Tamu': formatRupiah(ringkasan.saldoKartuTamu),
        },
        sections,
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Laporan Saldo Mengendap (.pdf) berhasil diunduh.',
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
            <span className="text-xs font-medium">Saldo Mengendap</span>
          </div>
          <div className="flex items-center gap-2">
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
                Laporan Saldo Mengendap
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="default"
                size="sm"
                onClick={handleExportExcel}
                disabled={isLoading || !ringkasan}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportPdf}
                disabled={isLoading || !ringkasan}
                className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor PDF (.pdf)</span>
              </Button>
            </div>
          </div>

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Dana Titipan (Kewajiban Sekolah)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatRupiah(ringkasan.total) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Akumulasi dana titipan yang belum dibelanjakan
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Mengendap Siswa
                </CardTitle>
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

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Mengendap Kartu Tamu
                </CardTitle>
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
          {!canAccessSiswa && !canAccessKartuTamu ? (
            <Card className="border-0 bg-muted/70 shadow-none dark:bg-muted/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-bold">
                    Akses Ringkasan Eksekutif
                  </CardTitle>
                </div>
                <CardDescription className="mt-1">
                  Sebagai Kepala Sekolah, hak akses Anda difokuskan pada ringkasan akumulasi saldo mengendap dan kewajiban sekolah di atas. Rincian data siswa dan kartu tamu dikelola secara operasional oleh Petugas TU dan Admin Sekolah.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setSelectedTab(v as 'siswa' | 'kartu-tamu')}
              className="space-y-4"
            >
              <TableToolbar
                extraLeft={
                  <TabsList
                    className={`grid w-full ${
                      canAccessSiswa && canAccessKartuTamu
                        ? 'grid-cols-2'
                        : 'grid-cols-1'
                    } sm:w-auto`}
                  >
                    {canAccessSiswa && (
                      <TabsTrigger value="siswa" className="gap-2">
                        <Users className="h-4 w-4" />
                        <span>Saldo Siswa ({siswaList.length})</span>
                      </TabsTrigger>
                    )}
                    {canAccessKartuTamu && (
                      <TabsTrigger value="kartu-tamu" className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Saldo Kartu Tamu ({kartuTamuList.length})</span>
                      </TabsTrigger>
                    )}
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
              {canAccessSiswa && (
                <TabsContent value="siswa" className="space-y-4">
                  <Card className="border-0 bg-muted/70 dark:bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">
                        Rincian Dana Titipan per Siswa
                      </CardTitle>
                      <CardDescription>
                        Saldo berjalan setiap siswa yang dititipkan oleh orang tua murid dan dapat dicairkan saat lulus/keluar.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-hidden rounded-lg">
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
                                      <Badge
                                        variant="secondary"
                                        className="border-0 bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 text-xs gap-1 font-medium"
                                      >
                                        <Ban className="h-3 w-3" />
                                        <span>Diblokir</span>
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="border-0 bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs gap-1 font-medium"
                                      >
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
              )}

              {/* TAB CONTENT: SALDO KARTU TAMU */}
              {canAccessKartuTamu && (
                <TabsContent value="kartu-tamu" className="space-y-4">
                  <Card className="border-0 bg-muted/70 dark:bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">
                        Rincian Dana Titipan per Kartu Tamu
                      </CardTitle>
                      <CardDescription>
                        Saldo aktif pada kartu tamu non-siswa (guru, staf, atau pengunjung) yang dapat di-refund saat kartu dikembalikan ke TU.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-hidden rounded-lg">
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
                                      variant="secondary"
                                      className={`border-0 text-xs font-medium ${
                                        kt.status === 'ACTIVE'
                                          ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                          : kt.status === 'BLOCKED'
                                          ? 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
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
              )}
            </Tabs>
          )}
        </div>
      </Main>
    </>
  )
}
