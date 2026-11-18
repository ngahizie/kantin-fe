import { useState, useEffect, useMemo } from 'react'
import { Ban, Banknote, Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableToolbar } from '@/components/data-table'
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
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import { exportTableToExcel } from '@/lib/excelExport'
import { exportTableToPdf } from '@/lib/pdfExport'
import { LaporanDateFilter, getDefaultDateFilter, LaporanExportButton } from './components'
import { laporanApi } from './api/laporan-api'
import type { BarisPembatalanKasir, LaporanFilterParams } from './types'

export function LaporanPembatalanPage() {
  const [rows, setRows] = useState<BarisPembatalanKasir[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [dateFilterParams, setDateFilterParams] = useState<LaporanFilterParams>(
    () => getDefaultDateFilter().params
  )
  const [dateFilterLabel, setDateFilterLabel] = useState<string>(
    () => getDefaultDateFilter().label
  )

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        setIsLoading(true)
        const data = await laporanApi.getPembatalan(dateFilterParams)
        if (!isMounted) return
        setRows(data)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat data pembatalan kasir'
        toast.error('Gagal Memuat Laporan Pembatalan Kasir', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [dateFilterParams])

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        (r.siswaNama || '').toLowerCase().includes(q) ||
        (r.siswaNis || '').toLowerCase().includes(q) ||
        (r.alasanVoid || '').toLowerCase().includes(q) ||
        (r.titikKasirNama || '').toLowerCase().includes(q) ||
        String(r.transaksiId).includes(q)
    )
  }, [rows, searchQuery])

  const totalTransaksiBatal = filteredRows.length
  const totalNominalBatal = useMemo(
    () => filteredRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
    [filteredRows]
  )
  const siswaTerdampak = useMemo(
    () => new Set(filteredRows.map((r) => r.siswaId).filter((id) => id > 0)).size,
    [filteredRows]
  )

  const handleExportExcel = () => {
    if (filteredRows.length === 0) {
      toast.error('Tidak ada data pembatalan untuk diekspor')
      return
    }

    exportTableToExcel({
      filename: `Laporan_Pembatalan_Kasir_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Pembatalan Kasir',
      title: 'LAPORAN PEMBATALAN TRANSAKSI KASIR',
      metadata: {
        'Tanggal Cetak': formatDateTime(new Date()),
        Periode: dateFilterLabel,
        'Total Pembatalan': `${formatNumber(totalTransaksiBatal)} transaksi`,
        'Total Nominal Dikembalikan': formatRupiah(totalNominalBatal),
      },
      columns: [
        { header: 'No.', key: 'no', width: 6 },
        { header: 'ID Trx', key: 'transaksiId', width: 12 },
        { header: 'Waktu Transaksi', key: 'waktu', width: 22 },
        { header: 'Waktu Batal', key: 'voidAt', width: 22 },
        { header: 'Nama Siswa', key: 'siswaNama', width: 24 },
        { header: 'Kelas', key: 'siswaKelas', width: 10 },
        { header: 'Titik Kasir', key: 'titikKasirNama', width: 20 },
        { header: 'Alasan Pembatalan', key: 'alasanVoid', width: 32 },
        { header: 'Nominal (Rp)', key: 'total', width: 16 },
      ],
      data: filteredRows.map((r, idx) => ({
        no: idx + 1,
        transaksiId: `#${r.transaksiId}`,
        waktu: r.waktu ? formatDateTime(r.waktu) : '-',
        voidAt: r.voidAt ? formatDateTime(r.voidAt) : '-',
        siswaNama: r.siswaNama || `Siswa #${r.siswaId}`,
        siswaKelas: r.siswaKelas || '-',
        titikKasirNama: r.titikKasirNama || '-',
        alasanVoid: r.alasanVoid || '-',
        total: Number(r.total) || 0,
      })),
      summaryRow: {
        no: '',
        transaksiId: 'TOTAL',
        waktu: '',
        voidAt: '',
        siswaNama: `${formatNumber(totalTransaksiBatal)} Transaksi`,
        siswaKelas: '',
        titikKasirNama: '',
        alasanVoid: '',
        total: totalNominalBatal,
      },
    })
    toast.success('Laporan Pembatalan Kasir berhasil diekspor ke Excel')
  }

  const handleExportPdf = () => {
    if (filteredRows.length === 0) {
      toast.error('Tidak ada data pembatalan untuk diekspor')
      return
    }

    exportTableToPdf({
      filename: `Laporan_Pembatalan_Kasir_${new Date().toISOString().split('T')[0]}`,
      title: 'LAPORAN PEMBATALAN TRANSAKSI KASIR',
      metadata: {
        'Tanggal Cetak': formatDateTime(new Date()),
        Periode: dateFilterLabel,
        'Total Pembatalan': `${formatNumber(totalTransaksiBatal)} transaksi`,
        'Total Nominal Dikembalikan': formatRupiah(totalNominalBatal),
      },
      orientation: 'landscape',
      columns: [
        { header: 'No.', key: 'no' },
        { header: 'ID Trx', key: 'transaksiId' },
        { header: 'Waktu Batal', key: 'voidAt' },
        { header: 'Nama Siswa', key: 'siswaNama' },
        { header: 'Kelas', key: 'siswaKelas' },
        { header: 'Titik Kasir', key: 'titikKasirNama' },
        { header: 'Alasan Pembatalan', key: 'alasanVoid' },
        { header: 'Nominal (Rp)', key: 'total' },
      ],
      data: filteredRows.map((r, idx) => ({
        no: idx + 1,
        transaksiId: `#${r.transaksiId}`,
        voidAt: r.voidAt ? formatDateTime(r.voidAt) : '-',
        siswaNama: r.siswaNama || `Siswa #${r.siswaId}`,
        siswaKelas: r.siswaKelas || '-',
        titikKasirNama: r.titikKasirNama || '-',
        alasanVoid: r.alasanVoid || '-',
        total: formatRupiah(r.total),
      })),
      summaryRow: {
        no: '',
        transaksiId: 'TOTAL',
        voidAt: '',
        siswaNama: `${formatNumber(totalTransaksiBatal)} Transaksi`,
        siswaKelas: '',
        titikKasirNama: '',
        alasanVoid: '',
        total: formatRupiah(totalNominalBatal),
      },
    })
    toast.success('Laporan Pembatalan Kasir berhasil diekspor ke PDF')
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Laporan Keuangan' title='Pembatalan Kasir' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Laporan Pembatalan Transaksi Kasir
            </h1>
            <p className='text-sm text-muted-foreground'>
              Pantau transaksi yang dibatalkan di kasir (misal kartu dipakai bukan pemiliknya) beserta alasan dan siswa terdampak.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <LaporanDateFilter
              hidePresets
              initialPreset='TODAY'
              onChange={(params, label) => {
                setDateFilterParams(params)
                setDateFilterLabel(label)
              }}
            />
            <LaporanExportButton
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              disabled={isLoading || filteredRows.length === 0}
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className='grid gap-4 sm:grid-cols-3'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total Pembatalan Kasir
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'>
                <Ban className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {formatNumber(totalTransaksiBatal)}{' '}
                <span className='text-sm font-normal text-muted-foreground'>Transaksi</span>
              </div>
              <p className='text-xs text-muted-foreground mt-1'>Periode: {dateFilterLabel}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Nominal Dikembalikan
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'>
                <Banknote className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {formatRupiah(totalNominalBatal)}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Otomatis dikreditkan kembali ke saldo siswa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Siswa Terdampak
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground'>
                <ShieldAlert className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {formatNumber(siswaTerdampak)}{' '}
                <span className='text-sm font-normal text-muted-foreground'>Siswa</span>
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Periksa jika terdapat penyalahgunaan kartu
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Pencarian */}
        <TableToolbar
          searchPlaceholder='Cari nama siswa, NIS, titik kasir, atau alasan pembatalan...'
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          isFiltered={Boolean(searchQuery)}
          onReset={() => setSearchQuery('')}
        />

        {/* Tabel */}
        <Card className='overflow-hidden p-0 gap-0'>
          <CardHeader className='border-b border-border py-4'>
            <CardTitle className='text-base font-bold'>
              Daftar Transaksi Dibatalkan ({formatNumber(filteredRows.length)})
            </CardTitle>
            <CardDescription className='text-xs'>
              Menampilkan rincian transaksi yang di-refund langsung oleh kasir pada periode terpilih.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow className='border-b border-border hover:bg-transparent'>
                    <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      No.
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      ID Trx
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Waktu Batal
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Siswa
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Titik Kasir
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Alasan Pembatalan
                    </TableHead>
                    <TableHead className='text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Nominal (Rp)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-32 text-center text-xs text-muted-foreground'>
                        <div className='flex items-center justify-center gap-2'>
                          <Loader2 className='size-5 animate-spin' />
                          <span>Memuat data pembatalan kasir...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-32 text-center text-xs text-muted-foreground'>
                        Tidak ada transaksi yang dibatalkan pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <TableRow
                        key={row.transaksiId}
                        className='border-b border-border last:border-b-0 text-xs hover:bg-muted/40'
                      >
                        <TableCell className='text-center font-mono text-muted-foreground tabular-nums'>
                          {idx + 1}
                        </TableCell>
                        <TableCell className='font-mono font-semibold text-foreground tabular-nums'>
                          #{row.transaksiId}
                        </TableCell>
                        <TableCell className='tabular-nums text-muted-foreground whitespace-nowrap'>
                          {row.voidAt ? formatDateTime(row.voidAt) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className='font-semibold text-foreground'>{row.siswaNama}</div>
                          <div className='text-[11px] text-muted-foreground font-mono tabular-nums'>
                            NIS: {row.siswaNis || '-'} • {row.siswaKelas || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className='rounded-full border px-2.5 py-0.5 text-[11px] font-medium bg-muted/40'
                          >
                            {row.titikKasirNama || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className='max-w-xs text-rose-700 dark:text-rose-300 font-medium'>
                          {row.alasanVoid || '-'}
                        </TableCell>
                        <TableCell className='text-right font-mono font-bold text-foreground tabular-nums'>
                          {formatRupiah(row.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {filteredRows.length > 0 && (
                  <TableFooter className='bg-muted/60 font-semibold text-xs'>
                    <TableRow>
                      <TableCell colSpan={6} className='text-right'>
                        Total Nominal Pembatalan
                      </TableCell>
                      <TableCell className='text-right font-mono font-bold tabular-nums'>
                        {formatRupiah(totalNominalBatal)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}

export default LaporanPembatalanPage
