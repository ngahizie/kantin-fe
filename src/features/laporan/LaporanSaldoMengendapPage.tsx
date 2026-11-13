import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  ArrowRight,
  Ban,
  Info,
  Loader2,
  UserCheck,
  Users,
  Wallet,
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
import { exportMultiSectionPdf, type PdfTableSection } from '@/lib/pdfExport'
import { LaporanExportButton } from './components'
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
            total: resRingkasan.saldoSiswa ?? resRingkasan.total ?? 0,
          })
        } else {
          setRingkasan(null)
        }
        setSiswaList(resSiswa || [])
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat total saldo siswa'
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
        const totalSaldo = siswaList.reduce((acc, s) => acc + (Number(s.saldo) || 0), 0)
        const totalBelanjaHariIni = siswaList.reduce((acc, s) => acc + (Number(s.belanjaHariIni) || 0), 0)

        sheets.push({
          sheetName: 'Saldo Siswa',
          title: 'Laporan Total Saldo Siswa',
          metadata: {
            'Tanggal Cetak': new Date().toLocaleString('id-ID'),
            'Total Saldo Siswa': formatRupiah(ringkasan.saldoSiswa),
            'Jumlah Siswa Bersaldo': `${ringkasan.jumlahSiswa} Siswa`,
          },
          columns: [
            { header: 'No', width: 6 },
            { header: 'NIS', key: 'nis', width: 14 },
            { header: 'Nama Siswa', key: 'nama', width: 25 },
            { header: 'Kelas', key: 'kelas', width: 10 },
            { header: 'Nama Orang Tua', key: 'parentName', width: 22 },
            { header: 'Saldo Terkini (Rp)', key: 'saldo', width: 18 },
            {
              header: 'Limit Harian (Rp)',
              key: 'limitHarian',
              formatter: (v: unknown) => (Number(v) > 0 ? Number(v) : '-'),
              width: 16,
            },
            { header: 'Belanja Hari Ini (Rp)', key: 'belanjaHariIni', width: 18 },
            {
              header: 'Status Kartu',
              key: 'isBlocked',
              formatter: (v: unknown) => (v ? 'DIBLOKIR' : 'AKTIF'),
              width: 14,
            },
          ],
          data: siswaList,
          summaryRow: {
            no: '',
            nis: '',
            nama: '',
            kelas: '',
            parentName: '',
            saldo: totalSaldo,
            limitHarian: '',
            belanjaHariIni: totalBelanjaHariIni,
            isBlocked: '',
          },
        })
      }

      // Sheet Ringkasan untuk Kepala Sekolah (jika tidak memiliki akses rincian)
      if (sheets.length === 0) {
        sheets.push({
          sheetName: 'Ringkasan Eksekutif',
          title: 'LAPORAN RINGKASAN TOTAL SALDO SISWA (KEWAJIBAN SEKOLAH)',
          metadata: {
            'Tanggal Cetak': new Date().toLocaleString('id-ID'),
            'Total Dana Titipan': formatRupiah(ringkasan.saldoSiswa),
          },
          columns: [
            { header: 'Kategori', key: 'kategori', width: 28 },
            { header: 'Jumlah', key: 'jumlah', width: 18 },
            { header: 'Total Saldo Siswa (Rp)', key: 'total', width: 25 },
          ],
          data: [
            {
              kategori: 'Total Saldo Siswa',
              jumlah: `${formatNumber(ringkasan.jumlahSiswa)} Siswa`,
              total: formatRupiah(ringkasan.saldoSiswa),
            },
          ],
        })
      }

      exportMultiSheetExcel({
        filename: `Laporan_Total_Saldo_Siswa_${new Date().toISOString().split('T')[0]}`,
        sheets,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: `Laporan Total Saldo Siswa berhasil diunduh.`,
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
        const totalSaldo = siswaList.reduce((acc, s) => acc + (Number(s.saldo) || 0), 0)
        const totalBelanjaHariIni = siswaList.reduce((acc, s) => acc + (Number(s.belanjaHariIni) || 0), 0)

        sections.push({
          sectionTitle: 'Laporan Total Saldo Siswa',
          columns: [
            { header: 'No' },
            { header: 'NIS', key: 'nis' },
            { header: 'Nama Siswa', key: 'nama' },
            { header: 'Kelas', key: 'kelas' },
            { header: 'Nama Orang Tua', key: 'parentName' },
            {
              header: 'Saldo Terkini',
              key: 'saldo',
              formatter: (v: unknown) => formatRupiah(Number(v)),
            },
            {
              header: 'Limit Harian',
              key: 'limitHarian',
              formatter: (v: unknown) => (Number(v) > 0 ? formatRupiah(Number(v)) : '-'),
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
          ],
          data: siswaList,
          summaryRow: {
            no: '',
            nis: '',
            nama: '',
            kelas: '',
            parentName: '',
            saldo: formatRupiah(totalSaldo),
            limitHarian: '',
            belanjaHariIni: formatRupiah(totalBelanjaHariIni),
            isBlocked: '',
          },
        })
      }

      // Section Ringkasan jika Kepala Sekolah atau rincian kosong
      if (sections.length === 0) {
        sections.push({
          sectionTitle: 'Ringkasan Eksekutif Total Saldo Siswa (Kewajiban Sekolah)',
          columns: [
            { header: 'Kategori Akun', key: 'kategori' },
            { header: 'Jumlah Pemegang', key: 'jumlah' },
            { header: 'Total Saldo Siswa', key: 'total' },
          ],
          data: [
            {
              kategori: 'Total Saldo Siswa',
              jumlah: `${formatNumber(ringkasan.jumlahSiswa)} Siswa`,
              total: formatRupiah(ringkasan.saldoSiswa),
            },
          ],
        })
      }

      exportMultiSectionPdf({
        filename: `Laporan_Total_Saldo_Siswa_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN TOTAL SALDO SISWA & KEWAJIBAN DANA TITIPAN',
        subtitle: 'Audit Akuntabilitas Dana Titipan Siswa',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Total Saldo Siswa': formatRupiah(ringkasan.saldoSiswa),
          'Jumlah Siswa': `${formatNumber(ringkasan.jumlahSiswa)} Siswa`,
        },
        sections,
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Laporan Total Saldo Siswa (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor berkas PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Laporan Keuangan' title='Total Saldo Siswa' />
        <HeaderActions />
      </Header>

      <Main className="space-y-6">
          {/* Header Action Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Laporan Total Saldo Siswa
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <LaporanExportButton
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                disabled={isLoading || !ringkasan}
              />
            </div>
          </div>

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Saldo Siswa
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? formatRupiah(ringkasan.saldoSiswa) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Akumulasi dana titipan orang tua yang belum dibelanjakan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Jumlah Siswa Bersaldo
                </CardTitle>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {ringkasan ? formatNumber(ringkasan.jumlahSiswa) : 0} Siswa
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total siswa yang memiliki saldo terkini
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABLE SECTION */}
          {!canAccessSiswa ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-bold">
                    Akses Ringkasan Eksekutif
                  </CardTitle>
                </div>
                <CardDescription className="mt-1">
                  Sebagai Kepala Sekolah, hak akses Anda difokuskan pada ringkasan akumulasi total saldo siswa dan kewajiban sekolah di atas. Rincian data siswa dikelola secara operasional oleh Petugas TU dan Admin Sekolah.
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

              <Card className="p-0 gap-0 overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
                  <CardTitle className="text-base font-bold">
                    Rincian Dana Titipan per Siswa
                  </CardTitle>
                  <CardDescription>
                    Saldo terkini setiap siswa yang dititipkan oleh orang tua murid dan dapat dicairkan saat lulus/keluar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">No.</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Siswa</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kelas</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo Terkini</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limit Harian</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Belanja Hari Ini</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Kartu</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orang Tua / Wali</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Memuat data saldo siswa...</span>
                            </div>
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
                          <TableRow key={siswa.siswaId} className="border-b border-border last:border-b-0">
                            <TableCell className="text-center text-xs text-muted-foreground font-mono tabular-nums">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-semibold text-sm">{siswa.nama}</div>
                                <div className="font-mono text-xs text-muted-foreground tabular-nums">
                                  NIS: {siswa.nis || '-'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                {siswa.kelas}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatRupiah(siswa.saldo)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                              {siswa.limitHarian > 0 ? formatRupiah(siswa.limitHarian) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                              {formatRupiah(siswa.belanjaHariIni)}
                            </TableCell>
                            <TableCell className="text-center">
                              {siswa.isBlocked ? (
                                <Badge variant="outline" className="gap-1 rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                  <Ban className="h-3 w-3" />
                                  <span>Diblokir</span>
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="gap-1 rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                                >
                                  <UserCheck className="h-3 w-3" />
                                  <span>Aktif</span>
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <div className="font-medium">{siswa.parentName}</div>
                                <div className="text-muted-foreground font-mono tabular-nums">
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
                    {siswaList.length > 0 && (
                      <TableFooter className="bg-muted/50 font-bold border-t border-border">
                        <TableRow>
                          <TableCell colSpan={4} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                            Total Saldo Terdaftar:
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatRupiah(siswaList.reduce((acc, s) => acc + (s.saldo || 0), 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            -
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                            {formatRupiah(siswaList.reduce((acc, s) => acc + (s.belanjaHariIni || 0), 0))}
                          </TableCell>
                          <TableCell colSpan={3} />
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
      </Main>
    </>
  )
}
