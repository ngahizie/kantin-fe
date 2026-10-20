import { useState, useEffect, useMemo } from 'react'
import {
  PackageX,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  DollarSign,
  Boxes,
  Flame,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { exportTableToExcel } from '@/lib/excelExport'
import { laporanApi } from './api/laporan-api'
import type { BarisKerugianStok, RingkasanKerugianStok } from './types'

export function LaporanKerugianStokPage() {
  const [kerugianList, setKerugianList] = useState<BarisKerugianStok[]>([])
  const [ringkasan, setRingkasan] = useState<RingkasanKerugianStok | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [jenisFilter, setJenisFilter] = useState<'ALL' | 'OPNAME_KELUAR' | 'BARANG_RUSAK'>('ALL')
  const [sortBy, setSortBy] = useState<'nilai_desc' | 'qty_desc' | 'waktu_desc'>('nilai_desc')

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [resList, resRingkasan] = await Promise.all([
        laporanApi.getKerugianStok(),
        laporanApi.getRingkasanKerugianStok(),
      ])
      setKerugianList(resList)
      setRingkasan(resRingkasan)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat kerugian stok'
      toast.error('Gagal Memuat Laporan', { description: msg })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [resList, resRingkasan] = await Promise.all([
          laporanApi.getKerugianStok(),
          laporanApi.getRingkasanKerugianStok(),
        ])
        if (!isMounted) return
        setKerugianList(resList)
        setRingkasan(resRingkasan)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat kerugian stok'
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

  // Filter & Urutan
  const filteredList = useMemo(() => {
    let list = [...kerugianList]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (k) =>
          k.namaMenu.toLowerCase().includes(q) ||
          k.kategoriNama.toLowerCase().includes(q) ||
          k.alasan.toLowerCase().includes(q) ||
          k.beritaAcaraId.toLowerCase().includes(q) ||
          k.petugas.toLowerCase().includes(q)
      )
    }

    if (jenisFilter !== 'ALL') {
      list = list.filter((k) => k.jenis === jenisFilter)
    }

    if (sortBy === 'nilai_desc') {
      list.sort((a, b) => b.totalNilai - a.totalNilai)
    } else if (sortBy === 'qty_desc') {
      list.sort((a, b) => b.qty - a.qty)
    } else if (sortBy === 'waktu_desc') {
      list.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
    }

    return list
  }, [kerugianList, searchQuery, jenisFilter, sortBy])

  // Ekspor Excel
  const handleExportExcel = () => {
    if (kerugianList.length === 0) {
      toast.error('Data belum siap untuk diekspor')
      return
    }

    try {
      exportTableToExcel({
        filename: `Laporan_Kerugian_Stok_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Kerugian Stok',
        title: 'LAPORAN KERUGIAN STOK KANTIN SKOOLIA',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Total Nilai Kerugian': formatRupiah(ringkasan?.totalKerugian || 0),
          'Total Qty Hilang/Rusak': `${ringkasan?.totalQtyHilang || 0} Unit`,
          'Kerugian Opname Keluar': formatRupiah(ringkasan?.kerugianOpname || 0),
          'Kerugian Barang Rusak': formatRupiah(ringkasan?.kerugianBarangRusak || 0),
        },
        columns: [
          { header: 'No', key: 'id', width: 8 },
          { header: 'Waktu Kejadian', key: 'waktu', formatter: (v) => formatDateTime(v as string | Date), width: 22 },
          { header: 'No. Berita Acara', key: 'beritaAcaraId', width: 22 },
          { header: 'Nama Menu / Item', key: 'namaMenu', width: 26 },
          { header: 'Kategori', key: 'kategoriNama', width: 16 },
          {
            header: 'Jenis Kerugian',
            key: 'jenis',
            formatter: (v) => (v === 'OPNAME_KELUAR' ? 'Opname Keluar (Audit)' : 'Barang Rusak / Basi'),
            width: 22,
          },
          { header: 'Qty Hilang', key: 'qty', width: 12 },
          { header: 'HPP Unit (Rp)', key: 'hppSnapshot', width: 16 },
          { header: 'Total Kerugian (Rp)', key: 'totalNilai', width: 18 },
          { header: 'Alasan / Berita Acara', key: 'alasan', width: 40 },
          { header: 'Petugas Pencatat', key: 'petugas', width: 22 },
        ],
        data: filteredList,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: 'Laporan Kerugian Stok (.xlsx) berhasil diunduh.',
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
            <span className="text-xs font-medium">Kerugian Stok</span>
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
                <div className="bg-destructive/10 text-destructive flex h-10 w-10 items-center justify-center rounded-xl">
                  <PackageX className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Laporan Kerugian Stok
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Pencatatan penyesuaian opname keluar (selisih fisik minus) dan barang rusak beserta nilai kerugiannya (Qty × HPP snapshot).
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
                disabled={isLoading || kerugianList.length === 0}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
            </div>
          </div>

          {/* SUMMARY CARDS GRID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-destructive">
                  Total Nilai Kerugian
                </CardTitle>
                <div className="rounded-lg bg-destructive/20 p-2 text-destructive">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-destructive">
                  {ringkasan ? formatRupiah(ringkasan.totalKerugian) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Akumulasi Qty × HPP unit saat kejadian
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Qty Hilang / Rusak
                </CardTitle>
                <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
                  <Boxes className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {ringkasan ? `${formatNumber(ringkasan.totalQtyHilang)} Unit` : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dari {ringkasan?.jumlahKejadian || 0} berita acara pencatatan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Barang Rusak / Basi
                </CardTitle>
                <div className="rounded-lg bg-red-500/10 p-2 text-red-600">
                  <Flame className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-red-600">
                  {ringkasan ? formatRupiah(ringkasan.kerugianBarangRusak) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ringkasan ? `${ringkasan.qtyBarangRusak} unit rusak/kadaluarsa` : '-'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Selisih Audit Opname
                </CardTitle>
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-amber-600">
                  {ringkasan ? formatRupiah(ringkasan.kerugianOpname) : '...'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ringkasan ? `${ringkasan.qtyOpname} unit selisih fisik minus` : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TABEL RINCIAN MUTASI KERUGIAN */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Daftar Mutasi Kerugian & Selisih Stok
                </CardTitle>
                <CardDescription>
                  Rincian setiap kejadian barang rusak atau selisih stok opname lengkap dengan berita acara.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-56">
                  <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                  <Input
                    placeholder="Cari menu, alasan, BA..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>

                <Select
                  value={jenisFilter}
                  onValueChange={(v) => setJenisFilter(v as 'ALL' | 'OPNAME_KELUAR' | 'BARANG_RUSAK')}
                >
                  <SelectTrigger className="w-[170px] text-xs">
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Jenis</SelectItem>
                    <SelectItem value="BARANG_RUSAK">Barang Rusak / Basi</SelectItem>
                    <SelectItem value="OPNAME_KELUAR">Opname Keluar (Audit)</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as 'nilai_desc' | 'qty_desc' | 'waktu_desc')}
                >
                  <SelectTrigger className="w-[160px] text-xs">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nilai_desc">Kerugian Terbesar</SelectItem>
                    <SelectItem value="qty_desc">Qty Terbanyak</SelectItem>
                    <SelectItem value="waktu_desc">Waktu Terbaru</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Waktu & Tanggal</TableHead>
                      <TableHead>No. Berita Acara</TableHead>
                      <TableHead>Nama Menu</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-center">Jenis</TableHead>
                      <TableHead className="text-right">Qty Hilang</TableHead>
                      <TableHead className="text-right">HPP Unit</TableHead>
                      <TableHead className="text-right font-bold text-destructive">Total Kerugian</TableHead>
                      <TableHead>Alasan / Keterangan</TableHead>
                      <TableHead>Petugas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                          Memuat data kerugian stok...
                        </TableCell>
                      </TableRow>
                    ) : filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                          Tidak ditemukan data kerugian yang cocok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {formatDateTime(item.waktu)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                            {item.beritaAcaraId}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {item.namaMenu}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.kategoriNama}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                item.jenis === 'BARANG_RUSAK'
                                  ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                  : 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }
                            >
                              {item.jenis === 'BARANG_RUSAK' ? 'Barang Rusak' : 'Opname Keluar'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm">
                            {formatNumber(item.qty)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {formatRupiah(item.hppSnapshot)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-destructive">
                            {formatRupiah(item.totalNilai)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">
                            {item.alasan}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.petugas}
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
