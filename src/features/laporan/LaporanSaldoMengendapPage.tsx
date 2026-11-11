import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
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
import { exportMultiSheetExcel } from '@/lib/excelExport'
import { exportMultiSectionPdf, type PdfTableSection } from '@/lib/pdfExport'
import { laporanApi } from './api/laporan-api'
import type {
  RingkasanSaldoMengendap,
  SiswaSaldoDetail,
} from './types'

export function LaporanSaldoMengendapPage() {
  const { currentRole } = useRoleStore()
  const authUser = useAuthStore((s) => s.auth.user)
  const activeRole: UserRole = currentRole || authUser?.currentRole || 'admin'

  const isTuOrBendahara = activeRole === 'tu' || activeRole === 'bendahara'
  const isAdmin = activeRole === 'admin'
  const canAccessSiswa = isTuOrBendahara || isAdmin

  const [ringkasan, setRingkasan] = useState<RingkasanSaldoMengendap | null>(null)
  const [siswaList, setSiswaList] = useState<SiswaSaldoDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'POSITIVE' | 'ZERO'>('ALL')

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

        const [resRingkasan, resSiswa] = await Promise.all([
          ringkasanPromise,
          siswaPromise,
        ])
        if (!isMounted) return
        if (resRingkasan) {
          setRingkasan({
            ...resRingkasan,
            saldoKartuTamu: 0,
            jumlahKartuTamu: 0,
            total: resRingkasan.saldoSiswa ?? resRingkasan.total ?? 0,
          })
        } else {
          setRingkasan(null)
        }
        setSiswaList(resSiswa || [])
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
  }, [canAccessSiswa])

  // Filter Siswa
  const filteredSiswa = useMemo(() => {
    if (!canAccessSiswa) return []
    let list = [...siswaList]

    if (statusFilter === 'POSITIVE') {
      list = list.filter((s) => (s.saldo || 0) > 0)
    } else if (statusFilter === 'ZERO') {
      list = list.filter((s) => (s.saldo || 0) === 0)
    }

    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q) ||
        (s.parentName && s.parentName.toLowerCase().includes(q))
    )
  }, [canAccessSiswa, siswaList, searchQuery, statusFilter])

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

      // Sheet Ringkasan untuk Kepala Sekolah (jika tidak memiliki akses rincian)
      if (sheets.length === 0) {
        sheets.push({
          sheetName: 'Ringkasan Eksekutif',
          title: 'LAPORAN RINGKASAN SALDO MENGENDAP (KEWAJIBAN SEKOLAH)',
          metadata: {
            'Tanggal Cetak': new Date().toLocaleString('id-ID'),
            'Total Dana Titipan': formatRupiah(ringkasan.saldoSiswa),
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
          ],
        })
      }

      exportMultiSheetExcel({
        filename: `Laporan_Saldo_Mengendap_${new Date().toISOString().split('T')[0]}`,
        sheets,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: `Laporan Saldo Mengendap berhasil diunduh.`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas Excel'
      toast.error('Gagal Ekspor Excel', { description: msg })
    }
  }

  // Ekspor PDF Multi-Section
  const handleExportPdf = () => {
    if (!ringkasan) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      const sections: PdfTableSection[] = []

      // Section: Saldo Siswa
      if (canAccessSiswa) {
        sections.push({
          sectionTitle: 'Rincian Saldo Mengendap Siswa (Dana Titipan Murid)',
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
          ],
        })
      }

      exportMultiSectionPdf({
        filename: `Laporan_Saldo_Mengendap_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN SALDO MENGENDAP & KEWAJIBAN DANA TITIPAN',
        subtitle: 'Audit Akuntabilitas Dana Titipan Siswa Kantin SKOOLIA',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Total Saldo Mengendap Siswa': formatRupiah(ringkasan.saldoSiswa),
          'Jumlah Siswa': `${formatNumber(ringkasan.jumlahSiswa)} Siswa`,
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
                Laporan Saldo Mengendap Siswa
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Saldo Mengendap Siswa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatRupiah(ringkasan.saldoSiswa) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Akumulasi dana titipan orang tua yang belum dibelanjakan
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/70 dark:bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Jumlah Siswa Bersaldo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? formatNumber(ringkasan.jumlahSiswa) : 0} Siswa
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total siswa yang memiliki saldo mengendap berjalan
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABLE SECTION */}
          {!canAccessSiswa ? (
            <Card className="border-0 bg-muted/70 shadow-none dark:bg-muted/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-bold">
                    Akses Ringkasan Eksekutif
                  </CardTitle>
                </div>
                <CardDescription className="mt-1">
                  Sebagai Kepala Sekolah, hak akses Anda difokuskan pada ringkasan akumulasi saldo mengendap dan kewajiban sekolah di atas. Rincian data siswa dikelola secara operasional oleh Petugas TU dan Admin Sekolah.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-4">
              <TableToolbar
                searchPlaceholder="Cari nama, NIS, kelas, wali..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                filters={[
                  {
                    title: 'Status Saldo',
                    options: [
                      { label: 'Semua Siswa', value: 'ALL' },
                      { label: 'Hanya Bersaldo (> Rp 0)', value: 'POSITIVE' },
                      { label: 'Saldo Rp 0', value: 'ZERO' },
                    ],
                    selectedValues: statusFilter !== 'ALL' ? [statusFilter] : [],
                    onSelect: (vals) =>
                      setStatusFilter((vals[0] as 'ALL' | 'POSITIVE' | 'ZERO') || 'ALL'),
                    isSingleSelect: true,
                  },
                ]}
                isFiltered={Boolean(searchQuery) || statusFilter !== 'ALL'}
                onReset={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                }}
              />

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
                          <TableHead className="w-12 text-center">No.</TableHead>
                          <TableHead>Siswa</TableHead>
                          <TableHead>Kelas</TableHead>
                          <TableHead className="text-right">Saldo Berjalan</TableHead>
                          <TableHead className="text-right">Limit Harian</TableHead>
                          <TableHead className="text-right">Belanja Hari Ini</TableHead>
                          <TableHead className="text-center">Status Kartu</TableHead>
                          <TableHead>Orang Tua / Wali</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                              Memuat data saldo siswa...
                            </TableCell>
                          </TableRow>
                        ) : filteredSiswa.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                              Tidak ada siswa yang sesuai pencarian.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSiswa.map((siswa, idx) => (
                            <TableRow key={siswa.siswaId}>
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-semibold text-sm">{siswa.nama}</div>
                                  <div className="font-mono text-xs text-muted-foreground">
                                    NIS: {siswa.nis}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {siswa.kelas}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-sm text-emerald-600">
                                {formatRupiah(siswa.saldo)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {siswa.limitHarian > 0 ? formatRupiah(siswa.limitHarian) : 'Tanpa Limit'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {formatRupiah(siswa.belanjaHariIni)}
                              </TableCell>
                              <TableCell className="text-center">
                                {siswa.isBlocked ? (
                                  <Badge variant="destructive" className="gap-1 text-xs">
                                    <Ban className="h-3 w-3" />
                                    <span>Diblokir</span>
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="gap-1 text-xs bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-0"
                                  >
                                    <UserCheck className="h-3 w-3" />
                                    <span>Aktif</span>
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-xs">
                                  <div className="font-medium">{siswa.parentName}</div>
                                  <div className="text-muted-foreground font-mono">
                                    {siswa.parentPhone}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-8 gap-1.5 text-xs font-semibold text-primary hover:text-primary"
                                >
                                  <Link
                                    to="/laporan/riwayat-siswa"
                                    search={{ siswaId: siswa.siswaId }}
                                  >
                                    <span>Riwayat</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
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
            </div>
          )}
        </div>
      </Main>
    </>
  )
}
