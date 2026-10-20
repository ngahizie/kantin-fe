import { useState, useEffect, useMemo } from 'react'
import {
  History,
  Search,
  Download,
  RefreshCw,
  User,
  Phone,
  Receipt,
  Printer,
  AlertCircle,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { formatRupiah, formatDateTime } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { laporanApi } from './api/laporan-api'
import type {
  ProfilSiswaRiwayat,
  RiwayatBelanjaSiswaItem,
  SiswaSaldoDetail,
} from './types'

export function LaporanRiwayatSiswaPage() {
  const [siswaList, setSiswaList] = useState<SiswaSaldoDetail[]>([])
  const [selectedSiswaId, setSelectedSiswaId] = useState<number>(101)
  const [profil, setProfil] = useState<ProfilSiswaRiwayat | null>(null)
  const [riwayat, setRiwayat] = useState<RiwayatBelanjaSiswaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchFilter, setSearchFilter] = useState('')
  const [jenisFilter, setJenisFilter] = useState<string>('ALL')

  // Modal Struk Digital
  const [selectedTrxForReceipt, setSelectedTrxForReceipt] =
    useState<RiwayatBelanjaSiswaItem | null>(null)

  // Load daftar siswa terlebih dahulu
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const list = await laporanApi.getSiswaSaldoList()
        if (!isMounted) return
        setSiswaList(list)
        if (list.length > 0 && !selectedSiswaId) {
          setSelectedSiswaId(list[0].siswaId)
        }
      } catch (_err: unknown) {
        if (!isMounted) return
        toast.error('Gagal Memuat Daftar Siswa')
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [selectedSiswaId])

  // Load riwayat ketika selectedSiswaId berubah atau tombol refresh ditekan
  const loadRiwayat = async (id: number) => {
    try {
      setIsLoading(true)
      const res = await laporanApi.getRiwayatBelanjaSiswa(id)
      setProfil(res.profil)
      setRiwayat(res.riwayat)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat siswa'
      toast.error('Gagal Memuat Riwayat', { description: msg })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const fetchRiwayat = async (id: number) => {
      try {
        const res = await laporanApi.getRiwayatBelanjaSiswa(id)
        if (!isMounted) return
        setProfil(res.profil)
        setRiwayat(res.riwayat)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat siswa'
        toast.error('Gagal Memuat Riwayat', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    if (selectedSiswaId) {
      void fetchRiwayat(selectedSiswaId)
    }
    return () => {
      isMounted = false
    }
  }, [selectedSiswaId])

  // Filter riwayat
  const filteredRiwayat = useMemo(() => {
    return riwayat.filter((trx) => {
      if (jenisFilter !== 'ALL' && trx.jenis !== jenisFilter) {
        return false
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase()
        const matchKeterangan = trx.keterangan.toLowerCase().includes(q)
        const matchRef = trx.referensiId.toLowerCase().includes(q)
        const matchKasir = trx.titikKasir.toLowerCase().includes(q)
        const matchItems =
          trx.items?.some((i) => i.nama.toLowerCase().includes(q)) || false
        return matchKeterangan || matchRef || matchKasir || matchItems
      }
      return true
    })
  }, [riwayat, jenisFilter, searchFilter])

  // Ekspor Excel Rekening Koran Siswa
  const handleExportExcel = () => {
    if (!profil) {
      toast.error('Data profil siswa belum siap')
      return
    }

    try {
      const exportRows = filteredRiwayat.map((trx) => {
        const itemStr =
          trx.items && trx.items.length > 0
            ? trx.items.map((i) => `${i.qty}x ${i.nama}`).join(', ')
            : '-'

        return {
          waktu: formatDateTime(trx.waktu),
          referensiId: trx.referensiId,
          jenis: trx.jenis,
          titikKasir: trx.titikKasir,
          petugas: trx.petugas,
          daftarItem: itemStr,
          keterangan: trx.keterangan,
          arah: trx.arah,
          nominal: trx.arah === 'DEBIT' ? -trx.nominal : trx.nominal,
          saldoSetelah: trx.saldoSetelah,
        }
      })

      exportTableToExcel({
        filename: `Rekening_Koran_${profil.nis}_${profil.nama.replace(/\s+/g, '_')}`,
        sheetName: 'Riwayat Transaksi',
        title: `REKENING KORAN & HISTORI TRANSAKSI SISWA - ${profil.nama.toUpperCase()}`,
        metadata: {
          'NIS': profil.nis,
          'Kelas': profil.kelas,
          'Nama Wali Murid': profil.parentName,
          'Kontak Wali': profil.parentPhone,
          'Saldo Berjalan Saat Ini': formatRupiah(profil.saldo),
          'Limit Harian': formatRupiah(profil.limitHarian),
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
        },
        columns: [
          { header: 'Waktu Transaksi', key: 'waktu', width: 22 },
          { header: 'No. Bukti / Referensi', key: 'referensiId', width: 22 },
          { header: 'Jenis Mutasi', key: 'jenis', width: 14 },
          { header: 'Titik Kasir / Loket', key: 'titikKasir', width: 22 },
          { header: 'Petugas', key: 'petugas', width: 18 },
          { header: 'Menu / Item yang Dibeli', key: 'daftarItem', width: 35 },
          { header: 'Keterangan', key: 'keterangan', width: 30 },
          { header: 'Arah', key: 'arah', width: 10 },
          { header: 'Nominal (Rp)', key: 'nominal', width: 16 },
          { header: 'Saldo Akhir (Rp)', key: 'saldoSetelah', width: 16 },
        ],
        data: exportRows,
      })

      toast.success('Ekspor Excel Berhasil', {
        description: `Rekening koran siswa ${profil.nama} (.xlsx) berhasil diunduh.`,
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
            <span className="text-xs font-medium">Riwayat Belanja per Siswa</span>
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
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Riwayat Belanja per Siswa
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Histori transaksi lengkap dengan item & waktu untuk membantu klarifikasi komplain orang tua murid.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Pilih Siswa Selector */}
              <div className="w-64">
                <Select
                  value={String(selectedSiswaId)}
                  onValueChange={(val) => setSelectedSiswaId(Number(val))}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Pilih Siswa" />
                  </SelectTrigger>
                  <SelectContent>
                    {siswaList.map((s) => (
                      <SelectItem key={s.siswaId} value={String(s.siswaId)}>
                        {s.nis} - {s.nama} ({s.kelas})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadRiwayat(selectedSiswaId)}
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
                disabled={isLoading || !profil}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </Button>
            </div>
          </div>

          {/* STUDENT PROFILE CARD */}
          {profil && (
            <Card className="border-primary/20 bg-linear-to-r from-card to-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-bold border">
                      {profil.nama
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight">
                          {profil.nama}
                        </h2>
                        <Badge variant="outline" className="font-mono text-xs">
                          NIS: {profil.nis}
                        </Badge>
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-xs">
                          {profil.kelas}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Wali: <strong className="text-foreground">{profil.parentName}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {profil.parentPhone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 border-t pt-4 md:border-t-0 md:pt-0">
                    <div className="rounded-xl border bg-card px-4 py-2.5 text-center shadow-2xs">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        Saldo Berjalan
                      </p>
                      <p className="text-lg font-bold font-mono text-primary">
                        {formatRupiah(profil.saldo)}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-card px-4 py-2.5 text-center shadow-2xs">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        Belanja Hari Ini
                      </p>
                      <p className="text-lg font-bold font-mono">
                        {formatRupiah(profil.belanjaHariIni)}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-card px-4 py-2.5 text-center shadow-2xs">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        Limit Harian
                      </p>
                      <p className="text-lg font-bold font-mono text-muted-foreground">
                        {formatRupiah(profil.limitHarian)}
                      </p>
                    </div>
                  </div>
                </div>

                {profil.catatanKontrol && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      <strong>Catatan Ortu:</strong> {profil.catatanKontrol}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TABLE RIWAYAT TRANSAKSI SISWA */}
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Histori Transaksi Lengkap Siswa
                </CardTitle>
                <CardDescription>
                  Daftar transaksi kasir, top-up, pembatalan void, dan mutasi saldo untuk menjawab pertanyaan orang tua.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-56">
                  <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
                  <Input
                    placeholder="Cari transaksi / menu..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>

                <Select
                  value={jenisFilter}
                  onValueChange={(v) => setJenisFilter(v)}
                >
                  <SelectTrigger className="w-[160px] text-xs">
                    <SelectValue placeholder="Semua Mutasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Mutasi</SelectItem>
                    <SelectItem value="BELANJA">Belanja Kasir</SelectItem>
                    <SelectItem value="TOPUP_TUNAI">Top-up Tunai TU</SelectItem>
                    <SelectItem value="KOREKSI">Koreksi Bendahara</SelectItem>
                    <SelectItem value="VOID">Void Pembatalan</SelectItem>
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
                      <TableHead>No. Referensi</TableHead>
                      <TableHead className="text-center">Jenis</TableHead>
                      <TableHead>Titik Kasir & Petugas</TableHead>
                      <TableHead>Rincian Menu / Deskripsi</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-right">Saldo Sisa</TableHead>
                      <TableHead className="text-center">Struk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          Memuat histori transaksi siswa...
                        </TableCell>
                      </TableRow>
                    ) : filteredRiwayat.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                          Tidak ditemukan transaksi untuk kriteria pencarian ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRiwayat.map((trx, idx) => (
                        <TableRow key={trx.id}>
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {formatDateTime(trx.waktu)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {trx.referensiId}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                trx.jenis === 'BELANJA'
                                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : trx.jenis.startsWith('TOPUP')
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : trx.jenis === 'VOID'
                                  ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                  : 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              }
                            >
                              {trx.jenis}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">{trx.titikKasir}</div>
                            <div className="text-[11px] text-muted-foreground">{trx.petugas}</div>
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">
                            {trx.items && trx.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {trx.items.map((it, iIdx) => (
                                  <div key={iIdx} className="flex justify-between gap-2">
                                    <span className="font-medium">
                                      {it.qty}x {it.nama}
                                    </span>
                                    <span className="text-muted-foreground font-mono">
                                      {formatRupiah(it.subtotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">{trx.keterangan}</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-bold text-sm ${
                              trx.arah === 'DEBIT' ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {trx.arah === 'DEBIT' ? `− ${formatRupiah(trx.nominal)}` : `+ ${formatRupiah(trx.nominal)}`}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-primary">
                            {formatRupiah(trx.saldoSetelah)}
                          </TableCell>
                          <TableCell className="text-center">
                            {trx.items && trx.items.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTrxForReceipt(trx)}
                                className="h-8 text-xs gap-1"
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                <span>Lihat</span>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* DIALOG STRUK DIGITAL KASIR (UNTUK JAWAB KOMPLAIN ORTU) */}
          <Dialog
            open={!!selectedTrxForReceipt}
            onOpenChange={(open) => !open && setSelectedTrxForReceipt(null)}
          >
            <DialogContent className="sm:max-w-md font-sans">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-center justify-center font-bold">
                  <Receipt className="h-5 w-5 text-primary" />
                  <span>Struk Transaksi Digital Kantin</span>
                </DialogTitle>
                <DialogDescription className="text-center text-xs">
                  SKOOLIA Kantin Cashless • Bukti Transaksi Resmi
                </DialogDescription>
              </DialogHeader>

              {selectedTrxForReceipt && profil && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-lg border p-4 bg-muted/30 font-mono text-xs space-y-2">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Waktu:</span>
                      <span className="font-semibold">{formatDateTime(selectedTrxForReceipt.waktu)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">No. Transaksi:</span>
                      <span className="font-semibold">{selectedTrxForReceipt.referensiId}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Titik Kasir:</span>
                      <span>{selectedTrxForReceipt.titikKasir}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Petugas:</span>
                      <span>{selectedTrxForReceipt.petugas}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Siswa:</span>
                      <span className="font-semibold">{profil.nama} ({profil.nis})</span>
                    </div>

                    <div className="py-2 space-y-1.5 border-b">
                      <p className="font-sans font-semibold text-muted-foreground text-[11px] uppercase">
                        Daftar Pesanan:
                      </p>
                      {selectedTrxForReceipt.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.qty}x {it.nama}</span>
                          <span className="font-semibold">{formatRupiah(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between text-sm font-bold pt-1">
                      <span>TOTAL POTONG SALDO:</span>
                      <span className="text-primary">{formatRupiah(selectedTrxForReceipt.nominal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Sisa Saldo Kartu:</span>
                      <span>{formatRupiah(selectedTrxForReceipt.saldoSetelah)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTrxForReceipt(null)}
                    >
                      Tutup
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        window.print()
                      }}
                      className="gap-1.5"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Cetak Struk</span>
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  )
}
