import { useState, useEffect, useMemo } from 'react'
import {
  FileSpreadsheet,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Link, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { ExportButton } from '@/components/export-button'
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import { exportTableToPdf } from '@/lib/pdfExport'
import { stokApi } from './api/stok-api'
import type { RiwayatStokItem } from './types'

export function KartuStokPage() {
  // Baca menuId opsional jika ada navigasi spesifik dari halaman lain
  const searchParams = useSearch({ strict: false }) as { menuId?: string | number }
  const menuIdParam = searchParams?.menuId ? Number(searchParams.menuId) : undefined

  const [riwayat, setRiwayat] = useState<RiwayatStokItem[]>([])
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(riwayat.length / PAGE_SIZE))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const paginatedRiwayat = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return riwayat.slice(start, start + PAGE_SIZE)
  }, [riwayat, safeCurrentPage])

  // Muat data mutasi stok seluruh menu
  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setIsLoadingRiwayat(true)
        const riwayatRes = await stokApi.getRiwayatStok({
          menuId: menuIdParam,
          ukuran: 200,
        })

        if (!isMounted) return
        setRiwayat(riwayatRes.items || [])
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat mutasi stok'
        toast.error('Gagal Memuat Mutasi', { description: msg })
      } finally {
        if (isMounted) setIsLoadingRiwayat(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [menuIdParam])

  // Metrik KPI dari riwayat mutasi stok
  const kpiData = useMemo(() => {
    let totalMasuk = 0
    let totalKeluar = 0

    riwayat.forEach((r) => {
      if (r.arah === 'MASUK') {
        totalMasuk += r.qty
      } else {
        totalKeluar += r.qty
      }
    })

    return {
      totalMasuk,
      totalKeluar,
      totalTransaksi: riwayat.length,
    }
  }, [riwayat])

  const handleExportCsv = () => {
    if (riwayat.length === 0) {
      toast.warning('Tidak ada data mutasi untuk diekspor')
      return
    }

    const headers = [
      'No.',
      'Waktu',
      'Nomor Referensi',
      'Menu',
      'Jenis Mutasi',
      'Arah',
      'Qty',
      'Saldo Akhir',
      'HPP Satuan (Rp)',
      'Harga Beli Satuan (Rp)',
      'Total Nilai (Rp)',
      'Aktor',
      'Alasan/Catatan',
    ]

    const rows = riwayat.map((r, idx) => [
      idx + 1,
      `"${r.waktu}"`,
      `"${r.referensiId}"`,
      `"${r.menuNama || 'Menu #' + r.menuId}"`,
      r.jenis,
      r.arah,
      r.qty,
      r.stokSetelah,
      r.hppSnapshot ?? '',
      r.hargaBeliSatuan ?? '',
      r.totalNilai ?? '',
      `"${r.aktorNama || r.aktorId || 'Sistem'}"`,
      `"${(r.alasan || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `mutasi-stok-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Data mutasi stok berhasil diunduh dalam format CSV')
  }

  const handleExportPdf = () => {
    if (riwayat.length === 0) {
      toast.warning('Tidak ada data mutasi untuk diekspor')
      return
    }

    try {
      const rows = riwayat.map((r) => ({
        waktu: formatDateTime(r.waktu),
        referensiId: r.referensiId,
        menu: r.menuNama || `Menu #${r.menuId}`,
        jenis: r.jenis,
        arah: r.arah,
        qty: `${r.arah === 'MASUK' ? '+' : '-'}${r.qty}`,
        stokSetelah: r.stokSetelah,
        hpp: r.hppSnapshot ? formatRupiah(r.hppSnapshot) : '-',
        totalNilai: r.totalNilai ? formatRupiah(r.totalNilai) : '-',
        aktor: r.aktorNama || r.aktorId || 'Sistem',
        alasan: r.alasan || '-',
      }))

      exportTableToPdf({
        filename: `Mutasi_Stok_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN HISTORI MUTASI STOK',
        subtitle: 'Seluruh Mutasi Produk & Menu Kantin',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Cakupan': 'Seluruh Menu Kantin',
          'Total Transaksi': `${riwayat.length} Transaksi`,
          'Total Masuk': `${kpiData.totalMasuk} Unit`,
          'Total Keluar': `${kpiData.totalKeluar} Unit`,
        },
        columns: [
          { header: 'Waktu Mutasi', key: 'waktu' },
          { header: 'No. Referensi', key: 'referensiId' },
          { header: 'Menu / Produk', key: 'menu' },
          { header: 'Jenis Mutasi', key: 'jenis' },
          { header: 'Arah', key: 'arah' },
          { header: 'Qty', key: 'qty' },
          { header: 'Saldo Akhir', key: 'stokSetelah' },
          { header: 'HPP Satuan', key: 'hpp' },
          { header: 'Aktor', key: 'aktor' },
          { header: 'Alasan / Keterangan', key: 'alasan' },
        ],
        data: rows,
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Mutasi Stok (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  const getJenisBadgeClass = (jenis: string, arah: string) => {
    switch (jenis) {
      case 'BARANG_MASUK':
      case 'OPNAME_MASUK':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
      case 'PENJUALAN':
        return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
      case 'BARANG_RUSAK':
        return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
      case 'PENJUALAN_VOID':
        return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
      case 'OPNAME_KELUAR':
        return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
      case 'BARANG_MASUK_PEMBALIK':
        return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
      default:
        return arah === 'MASUK'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-border bg-muted/50 text-muted-foreground'
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Manajemen Stok' title='Mutasi Stok' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Top Header & Navigation Actions */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Mutasi Stok
            </h1>
            <p className='text-sm text-muted-foreground'>
              Lacak histori pergerakan keluar-masuk, saldo berjalan, dan HPP seluruh menu.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2.5'>
            <ExportButton
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              disabled={riwayat.length === 0}
              data-testid='btn-kartu-stok-export'
            />

            <Button size='sm' asChild className='gap-1.5 font-semibold'>
              <Link to='/stok/inventaris'>
                <FileSpreadsheet className='h-4 w-4' />
                <span>Tabel Ringkasan Inventaris</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary KPI Cards Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {/* 1. Total Transaksi */}
          <Card>
            <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2 gap-2'>
              <div className='space-y-1 min-w-0'>
                <CardDescription className='text-xs font-medium text-muted-foreground'>
                  Total Transaksi Mutasi
                </CardDescription>
                <CardTitle className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                  {formatNumber(kpiData.totalTransaksi)}
                </CardTitle>
              </div>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'>
                <Boxes className='size-4' />
              </div>
            </CardHeader>
            <CardContent className='pt-0 text-xs text-muted-foreground'>
              Seluruh riwayat pergerakan stok
            </CardContent>
          </Card>

          {/* 2. Total Masuk */}
          <Card>
            <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2 gap-2'>
              <div className='space-y-1 min-w-0'>
                <CardDescription className='text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                  Total Masuk
                </CardDescription>
                <CardTitle className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                  {formatNumber(kpiData.totalMasuk)}
                </CardTitle>
              </div>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'>
                <ArrowDownLeft className='size-4' />
              </div>
            </CardHeader>
            <CardContent className='pt-0 text-xs text-muted-foreground'>
              Restock & opname masuk
            </CardContent>
          </Card>

          {/* 3. Total Keluar */}
          <Card>
            <CardHeader className='flex flex-row items-start justify-between space-y-0 pb-2 gap-2'>
              <div className='space-y-1 min-w-0'>
                <CardDescription className='text-xs font-medium text-rose-600 dark:text-rose-400'>
                  Total Keluar
                </CardDescription>
                <CardTitle className='text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums'>
                  {formatNumber(kpiData.totalKeluar)}
                </CardTitle>
              </div>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'>
                <ArrowUpRight className='size-4' />
              </div>
            </CardHeader>
            <CardContent className='pt-0 text-xs text-muted-foreground'>
              Penjualan, rusak, audit
            </CardContent>
          </Card>
        </div>

        {/* Tabel Mutasi Stok */}
        <div className='space-y-4'>
          <div>
            <h2 className='text-lg font-semibold tracking-tight'>
              Tabel Mutasi Akuntansi
            </h2>
            <p className='text-xs text-muted-foreground'>
              Daftar pergerakan keluar-masuk stok dan saldo berjalan seluruh menu
            </p>
          </div>

          <Card className='gap-0 py-0 overflow-hidden'>
            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/50 hover:bg-muted/50 border-b border-border'>
                      <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                      <TableHead className='w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Waktu</TableHead>
                      <TableHead className='w-32 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No. Referensi</TableHead>
                      <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Menu / Produk</TableHead>
                      <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Jenis Mutasi</TableHead>
                      <TableHead className='text-right w-24 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400'>
                        Masuk
                      </TableHead>
                      <TableHead className='text-right w-24 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400'>
                        Keluar
                      </TableHead>
                      <TableHead className='text-right w-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                        Saldo Akhir
                      </TableHead>
                      <TableHead className='text-right w-32 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                        HPP Satuan
                      </TableHead>
                      <TableHead className='w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Aktor</TableHead>
                      <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Alasan / Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingRiwayat ? (
                      <TableRow className='hover:bg-transparent border-b-0'>
                        <TableCell
                          colSpan={11}
                          className='h-32 text-center text-muted-foreground'
                        >
                          <div className='flex flex-col items-center justify-center gap-2'>
                            <Loader2 className='size-6 animate-spin text-muted-foreground' />
                            <span className='text-xs'>Memuat data riwayat mutasi...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : riwayat.length === 0 ? (
                      <TableRow className='hover:bg-transparent border-b-0'>
                        <TableCell
                          colSpan={11}
                          className='h-32 text-center text-xs text-muted-foreground'
                        >
                          Tidak ada pergerakan stok tercatat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRiwayat.map((item, idx) => {
                        const itemIndex = (safeCurrentPage - 1) * PAGE_SIZE + idx + 1
                        const isMasuk = item.arah === 'MASUK'
                        const aktorDisplay =
                          item.aktorNama ||
                          (item.aktorId ? `Aktor #${item.aktorId}` : 'Sistem')

                        return (
                          <TableRow key={item.id} className='border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors'>
                            <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                              {itemIndex}
                            </TableCell>
                            <TableCell className='text-xs whitespace-nowrap text-muted-foreground tabular-nums'>
                              {formatDateTime(item.waktu)}
                            </TableCell>
                            <TableCell className='font-mono text-xs font-medium'>
                              {item.referensiId}
                            </TableCell>
                            <TableCell className='text-xs font-semibold text-foreground'>
                              {item.menuNama || `Menu #${item.menuId}`}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant='outline'
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getJenisBadgeClass(
                                  item.jenis,
                                  item.arah
                                )}`}
                              >
                                {item.jenis.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums'>
                              {isMasuk ? formatNumber(item.qty) : '-'}
                            </TableCell>
                            <TableCell className='text-right font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums'>
                              {!isMasuk ? formatNumber(item.qty) : '-'}
                            </TableCell>
                            <TableCell className='text-right font-mono font-bold text-foreground tabular-nums'>
                              {formatNumber(item.stokSetelah)}
                            </TableCell>
                            <TableCell className='text-right font-mono text-xs text-muted-foreground tabular-nums'>
                              {formatRupiah(item.hppSnapshot)}
                            </TableCell>
                            <TableCell className='text-xs text-muted-foreground truncate max-w-[140px]'>
                              {aktorDisplay}
                            </TableCell>
                            <TableCell className='text-xs text-muted-foreground max-w-xs truncate'>
                              {item.alasan || '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Footer */}
              {!isLoadingRiwayat && riwayat.length > 0 && (
                <div className='p-3.5 border-t border-border flex flex-wrap items-center justify-between gap-2 bg-muted/20'>
                  <div className='text-xs font-medium text-muted-foreground tabular-nums'>
                    Menampilkan{' '}
                    <span className='font-semibold text-foreground'>
                      {(safeCurrentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(safeCurrentPage * PAGE_SIZE, riwayat.length)}
                    </span>{' '}
                    dari{' '}
                    <span className='font-semibold text-foreground'>{riwayat.length}</span>{' '}
                    transaksi mutasi
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='text-xs font-medium text-muted-foreground tabular-nums'>
                      Halaman <span className='font-semibold text-foreground'>{safeCurrentPage}</span> dari{' '}
                      <span className='font-semibold text-foreground'>{totalPages}</span>
                    </span>
                    <div className='flex items-center gap-1.5'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage === 1}
                        className='gap-1 h-8 text-xs'
                      >
                        <ChevronLeft className='size-3.5' />
                        Sebelumnya
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage === totalPages}
                        className='gap-1 h-8 text-xs'
                      >
                        Selanjutnya
                        <ChevronRight className='size-3.5' />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
