import { TableToolbar } from '@/components/data-table'
import { ExportButton } from '@/components/export-button'
import { useState, useEffect, useMemo } from 'react'
import {
  History,
  PackagePlus,
  Wallet,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatRupiah, formatNumber } from '@/lib/formatters'
import { exportTableToPdf } from '@/lib/pdfExport'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import type { KategoriItem } from '@/features/katalog/types'
import { stokApi } from './api/stok-api'
import type { InventarisItem } from './types'

export function InventarisPage() {
  const [inventarisList, setInventarisList] = useState<InventarisItem[]>([])
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategoriId, setSelectedKategoriId] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'AMAN' | 'MENIPIS' | 'HABIS'>('ALL')
  const [sortBy, setSortBy] = useState<'NILAI_DESC' | 'NILAI_ASC' | 'STOK_ASC' | 'STOK_DESC' | 'NAMA_ASC'>('NILAI_DESC')


  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [invData, kategoris] = await Promise.all([
          stokApi.getInventaris(false),
          katalogApi.getKategoriList().catch(() => []),
        ])
        if (!isMounted) return
        setInventarisList(invData)
        setKategoriList(kategoris)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg =
          err instanceof Error ? err.message : 'Gagal memuat laporan inventaris'
        toast.error('Gagal Memuat Inventaris', { description: msg })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  // Create Kategori Lookup Map
  const kategoriMap = useMemo(() => {
    const map = new Map<number, string>()
    kategoriList.forEach((k) => map.set(k.id, k.nama))
    return map
  }, [kategoriList])

  // Filter & Sort Logic
  const filteredAndSortedList = useMemo(() => {
    return inventarisList
      .filter((item) => {
        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const name = (item.namaMenu || item.nama || '').toLowerCase()
          if (!name.includes(q)) return false
        }

        // Kategori Filter
        if (selectedKategoriId !== 'ALL') {
          if (item.kategoriId !== Number(selectedKategoriId)) return false
        }

        // Status Filter
        const stok = item.stokBerjalan ?? item.stok ?? 0
        const min = item.stokMinimum ?? 0
        let status: 'AMAN' | 'MENIPIS' | 'HABIS' = 'AMAN'
        if (stok === 0) status = 'HABIS'
        else if (stok <= min) status = 'MENIPIS'

        if (selectedStatus !== 'ALL' && selectedStatus !== status) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        const valA = a.nilaiPersediaan ?? (a.stok * a.hpp)
        const valB = b.nilaiPersediaan ?? (b.stok * b.hpp)
        const stokA = a.stokBerjalan ?? a.stok ?? 0
        const stokB = b.stokBerjalan ?? b.stok ?? 0
        const nameA = a.namaMenu || a.nama || ''
        const nameB = b.namaMenu || b.nama || ''

        if (sortBy === 'NILAI_DESC') return valB - valA
        if (sortBy === 'NILAI_ASC') return valA - valB
        if (sortBy === 'STOK_DESC') return stokB - stokA
        if (sortBy === 'STOK_ASC') return stokA - stokB
        if (sortBy === 'NAMA_ASC') return nameA.localeCompare(nameB)
        return 0
      })
  }, [inventarisList, searchQuery, selectedKategoriId, selectedStatus, sortBy])

  // Top KPI Metrics (Calculated accurately across all items)
  const kpiData = useMemo(() => {
    let totalNilai = 0
    let totalUnit = 0
    let countAman = 0
    let countMenipis = 0
    let countHabis = 0

    inventarisList.forEach((item) => {
      const stok = item.stokBerjalan ?? item.stok ?? 0
      const hpp = item.hpp ?? 0
      const nilai = item.nilaiPersediaan ?? stok * hpp
      const min = item.stokMinimum ?? 0

      totalNilai += nilai
      totalUnit += stok

      if (stok === 0) {
        countHabis++
      } else if (stok <= min) {
        countMenipis++
      } else {
        countAman++
      }
    })

    return {
      totalNilai,
      totalUnit,
      totalSku: inventarisList.length,
      countAman,
      countMenipis,
      countHabis,
    }
  }, [inventarisList])

  // Summary of filtered rows
  const filteredSummary = useMemo(() => {
    let totalNilai = 0
    let totalUnit = 0

    filteredAndSortedList.forEach((item) => {
      const stok = item.stokBerjalan ?? item.stok ?? 0
      const hpp = item.hpp ?? 0
      totalNilai += item.nilaiPersediaan ?? stok * hpp
      totalUnit += stok
    })

    return { totalNilai, totalUnit }
  }, [filteredAndSortedList])

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredAndSortedList.length === 0) {
      toast.warning('Tidak ada data inventaris untuk diekspor')
      return
    }

    const headers = [
      'Menu ID',
      'Nama Menu',
      'Kategori',
      'Stok Saat Ini',
      'Stok Minimum',
      'Status Stok',
      'HPP Rata-rata (Rp)',
      'Total Nilai Persediaan (Rp)',
    ]

    const rows = filteredAndSortedList.map((item) => {
      const stok = item.stokBerjalan ?? item.stok ?? 0
      const min = item.stokMinimum ?? 0
      let status = 'AMAN'
      if (stok === 0) status = 'HABIS'
      else if (stok <= min) status = 'MENIPIS'

      const kategoriNama = item.kategoriId ? kategoriMap.get(item.kategoriId) || '-' : '-'
      const nilai = item.nilaiPersediaan ?? (stok * item.hpp)

      return [
        item.menuId,
        `"${(item.namaMenu || item.nama).replace(/"/g, '""')}"`,
        `"${kategoriNama}"`,
        stok,
        min,
        status,
        item.hpp,
        nilai,
      ]
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `laporan-inventaris-kantin-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Laporan inventaris berhasil diunduh dalam format CSV')
  }

  const handleExportPdf = () => {
    if (filteredAndSortedList.length === 0) {
      toast.warning('Tidak ada data inventaris untuk diekspor')
      return
    }

    try {
      const rows = filteredAndSortedList.map((item) => {
        const stok = item.stokBerjalan ?? item.stok ?? 0
        const min = item.stokMinimum ?? 0
        let status = 'AMAN'
        if (stok === 0) status = 'HABIS'
        else if (stok <= min) status = 'MENIPIS'

        const kategoriNama = item.kategoriId ? kategoriMap.get(item.kategoriId) || '-' : '-'
        const nilai = item.nilaiPersediaan ?? (stok * item.hpp)

        return {
          menuId: item.menuId,
          nama: item.namaMenu || item.nama,
          kategori: kategoriNama,
          stok,
          min,
          status,
          hpp: formatRupiah(item.hpp),
          nilai: formatRupiah(nilai),
        }
      })

      exportTableToPdf({
        filename: `Laporan_Inventaris_Stok_${new Date().toISOString().split('T')[0]}`,
        title: 'LAPORAN INVENTARIS & VALUASI PERSEDIAAN',
        subtitle: 'Kantin Cashless SKOOLIA - Posisi dan Nilai Aset Stok',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Total Nilai Persediaan': formatRupiah(kpiData.totalNilai),
          'Total SKU Terdaftar': `${kpiData.totalSku} SKU`,
          'Item Stok Menipis/Habis': `${kpiData.countMenipis + kpiData.countHabis} Item`,
        },
        columns: [
          { header: 'ID', key: 'menuId' },
          { header: 'Nama Menu / Barang', key: 'nama' },
          { header: 'Kategori', key: 'kategori' },
          { header: 'Stok', key: 'stok' },
          { header: 'Min', key: 'min' },
          { header: 'Status', key: 'status' },
          { header: 'HPP Satuan', key: 'hpp' },
          { header: 'Total Nilai Persediaan', key: 'nilai' },
        ],
        data: rows,
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Laporan Inventaris (.pdf) berhasil diunduh.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekspor PDF'
      toast.error('Gagal Ekspor PDF', { description: msg })
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Manajemen Stok' title='Laporan Inventaris' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Header Title & Top Navigation */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Laporan Inventaris & Valuasi Persediaan
            </h1>
            <p className='text-sm text-muted-foreground'>
              Pantau jumlah stok berjalan, batas minimum, HPP rata-rata, dan total nilai aset persediaan.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2.5'>
            <ExportButton
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              disabled={filteredAndSortedList.length === 0}
              data-testid='btn-inventaris-export'
            />

            <Button size='sm' asChild className='gap-1.5 font-semibold'>
              <Link to='/stok/kartu'>
                <History className='size-4' />
                <span>Buka Kartu Stok</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
          {/* 1. Total Nilai Persediaan (Aset) */}
          <Card className='col-span-2 md:col-span-1'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total Nilai Aset
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'>
                <Wallet className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {formatRupiah(kpiData.totalNilai)}
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Valuasi stok berjalan × HPP
              </p>
            </CardContent>
          </Card>

          {/* 2. Total SKU & Unit */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total SKU Terdaftar
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300'>
                <Package className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {formatNumber(kpiData.totalSku)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  item
                </span>
              </div>
              <p className='mt-1 text-xs text-muted-foreground tabular-nums'>
                Akumulasi: {formatNumber(kpiData.totalUnit)} unit fisik
              </p>
            </CardContent>
          </Card>

          {/* 3. Stok Aman */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Stok Aman
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'>
                <CheckCircle2 className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                {formatNumber(kpiData.countAman)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  SKU
                </span>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Di atas batas minimum
              </p>
            </CardContent>
          </Card>

          {/* 4. Stok Menipis */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Stok Menipis
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'>
                <AlertTriangle className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums'>
                {formatNumber(kpiData.countMenipis)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  SKU
                </span>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Perlu segera restock
              </p>
            </CardContent>
          </Card>

          {/* 5. Stok Habis */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Stok Habis
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'>
                <XCircle className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums'>
                {formatNumber(kpiData.countHabis)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  SKU
                </span>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                Persediaan 0 unit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <TableToolbar
          searchPlaceholder='Cari nama menu / SKU...'
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              title: 'Kategori',
              options: kategoriList.map((k) => ({
                label: k.nama,
                value: String(k.id),
              })),
              selectedValues: selectedKategoriId !== 'ALL' ? [selectedKategoriId] : [],
              onSelect: (vals) => setSelectedKategoriId(vals[0] || 'ALL'),
              isSingleSelect: true,
            },
            {
              title: 'Status Persediaan',
              options: [
                { label: 'Hanya Stok Aman', value: 'AMAN' },
                { label: 'Stok Menipis (Kritis)', value: 'MENIPIS' },
                { label: 'Stok Habis (0)', value: 'HABIS' },
              ],
              selectedValues: selectedStatus !== 'ALL' ? [selectedStatus] : [],
              onSelect: (vals) => setSelectedStatus((vals[0] as 'ALL' | 'AMAN' | 'MENIPIS' | 'HABIS') || 'ALL'),
              isSingleSelect: true,
            },
            {
              title: 'Urutkan',
              options: [
                { label: 'Nilai Tertinggi (Rp)', value: 'NILAI_DESC' },
                { label: 'Nilai Terendah (Rp)', value: 'NILAI_ASC' },
                { label: 'Stok Terbanyak', value: 'STOK_DESC' },
                { label: 'Stok Tersedikit', value: 'STOK_ASC' },
                { label: 'Nama Menu (A-Z)', value: 'NAMA_ASC' },
              ],
              selectedValues: sortBy !== 'NILAI_DESC' ? [sortBy] : [],
              onSelect: (vals) => setSortBy((vals[0] as typeof sortBy) || 'NILAI_DESC'),
              isSingleSelect: true,
            },
          ]}
          isFiltered={Boolean(searchQuery || selectedKategoriId !== 'ALL' || selectedStatus !== 'ALL' || sortBy !== 'NILAI_DESC')}
          onReset={() => {
            setSearchQuery('')
            setSelectedKategoriId('ALL')
            setSelectedStatus('ALL')
            setSortBy('NILAI_DESC')
          }}
        />

        {/* Data Table */}
        <Card className='gap-0 py-0 overflow-hidden'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50 hover:bg-muted/50 border-b border-border'>
                    <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Nama Menu / Barang</TableHead>
                    <TableHead className='w-32 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Kategori</TableHead>
                    <TableHead className='w-28 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Status</TableHead>
                    <TableHead className='text-right w-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Stok Saat Ini
                    </TableHead>
                    <TableHead className='text-right w-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Batas Min</TableHead>
                    <TableHead className='text-right w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      HPP Terakhir
                    </TableHead>
                    <TableHead className='text-right w-44 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Nilai Persediaan
                    </TableHead>
                    <TableHead className='text-center w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow className='hover:bg-transparent border-b-0'>
                      <TableCell
                        colSpan={9}
                        className='h-32 text-center text-muted-foreground'
                      >
                        <div className='flex flex-col items-center justify-center gap-2'>
                          <Loader2 className='size-6 animate-spin text-muted-foreground' />
                          <span className='text-xs'>Memuat tabel inventaris persediaan...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAndSortedList.length === 0 ? (
                    <TableRow className='hover:bg-transparent border-b-0'>
                      <TableCell
                        colSpan={9}
                        className='h-32 text-center text-xs text-muted-foreground'
                      >
                        Tidak ada barang yang cocok dengan kriteria filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedList.map((item, idx) => {
                      const stok = item.stokBerjalan ?? item.stok ?? 0
                      const min = item.stokMinimum ?? 0
                      const hpp = item.hpp ?? 0
                      const totalNilai = item.nilaiPersediaan ?? stok * hpp

                      let status: 'AMAN' | 'MENIPIS' | 'HABIS' = 'AMAN'
                      if (stok === 0) status = 'HABIS'
                      else if (stok <= min) status = 'MENIPIS'

                      const kategoriNama = item.kategoriId
                        ? kategoriMap.get(item.kategoriId) || '-'
                        : '-'

                      return (
                        <TableRow key={item.menuId} className='border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors'>
                          <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-col'>
                              <span className='font-semibold text-foreground text-sm'>
                                {item.namaMenu || item.nama}
                              </span>
                              <span className='text-[11px] text-muted-foreground tabular-nums'>
                                SKU #{item.menuId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            {kategoriNama}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Badge
                              variant='outline'
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                status === 'AMAN'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : status === 'MENIPIS'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}
                            >
                              {status === 'AMAN'
                                ? 'Aman'
                                : status === 'MENIPIS'
                                ? 'Menipis'
                                : 'Habis'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right font-mono font-bold text-sm tabular-nums'>
                            {formatNumber(stok)}{' '}
                            <span className='text-xs font-normal text-muted-foreground'>
                              unit
                            </span>
                          </TableCell>
                          <TableCell className='text-right font-mono text-xs text-muted-foreground tabular-nums'>
                            {formatNumber(min)}
                          </TableCell>
                          <TableCell className='text-right font-mono text-sm text-foreground tabular-nums'>
                            {formatRupiah(hpp)}
                          </TableCell>
                          <TableCell className='text-right font-mono font-bold text-sm text-primary tabular-nums'>
                            {formatRupiah(totalNilai)}
                          </TableCell>
                          <TableCell className='text-center'>
                            <div className='flex items-center justify-center gap-1.5'>
                              <Button
                                size='sm'
                                variant='outline'
                                className='h-7 text-xs px-2 gap-1'
                                asChild
                              >
                                <Link
                                  to='/stok/kartu'
                                  search={{ menuId: item.menuId }}
                                >
                                  <History className='h-3.5 w-3.5' />
                                  <span>Kartu</span>
                                </Link>
                              </Button>

                              <Button
                                size='sm'
                                variant='ghost'
                                className='h-7 text-xs px-2 gap-1 text-primary hover:text-primary'
                                asChild
                              >
                                <Link to='/menu'>
                                  <PackagePlus className='h-3.5 w-3.5' />
                                  <span>Restock</span>
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Bottom Accumulation Footer */}
            <div className='flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/30 border-t border-border text-xs text-muted-foreground gap-2'>
              <div className='tabular-nums'>
                Menampilkan{' '}
                <strong className='text-foreground'>
                  {filteredAndSortedList.length}
                </strong>{' '}
                dari {inventarisList.length} item menu
              </div>
              <div className='flex items-center gap-6'>
                <span>
                  Total Fisik Terfilter:{' '}
                  <strong className='text-foreground font-mono text-sm tabular-nums'>
                    {formatNumber(filteredSummary.totalUnit)} unit
                  </strong>
                </span>
                <span>
                  Total Nilai Terfilter:{' '}
                  <strong className='text-primary font-mono text-sm font-bold tabular-nums'>
                    {formatRupiah(filteredSummary.totalNilai)}
                  </strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
