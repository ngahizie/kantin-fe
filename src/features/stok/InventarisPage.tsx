import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  Download,
  History,
  PackagePlus,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
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
        <div className='flex w-full items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground text-xs font-semibold uppercase tracking-wider'>
              Manajemen Stok
            </span>
            <span className='text-muted-foreground text-xs'>/</span>
            <span className='text-xs font-medium'>Laporan Inventaris</span>
          </div>
          <div className='flex items-center gap-2'>
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main className='space-y-6'>
        {/* Header Title & Top Navigation */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              Laporan Inventaris & Valuasi Persediaan
            </h1>
          </div>
          <div className='flex flex-wrap items-center gap-2.5'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportCsv}
              disabled={filteredAndSortedList.length === 0}
              className='gap-1.5'
            >
              <Download className='h-4 w-4' />
              <span>Ekspor CSV</span>
            </Button>

            <Button
              variant='default'
              size='sm'
              onClick={handleExportPdf}
              disabled={filteredAndSortedList.length === 0}
              className='gap-1.5 bg-rose-600 hover:bg-rose-700 text-white'
            >
              <Download className='h-4 w-4' />
              <span>Ekspor PDF (.pdf)</span>
            </Button>

            <Button size='sm' asChild className='gap-1.5'>
              <Link to='/stok/kartu'>
                <History className='h-4 w-4' />
                <span>Buka Kartu Stok</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-3.5'>
          {/* 1. Total Nilai Persediaan (Aset) */}
          <Card className='col-span-2 md:col-span-1 border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium'>
                Total Nilai Aset
              </CardDescription>
              <CardTitle className='text-2xl font-bold font-mono text-foreground'>
                {formatRupiah(kpiData.totalNilai)}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Valuasi stok berjalan × HPP
            </CardContent>
          </Card>

          {/* 2. Total SKU & Unit */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium'>
                Total SKU Terdaftar
              </CardDescription>
              <CardTitle className='text-2xl font-bold'>
                {formatNumber(kpiData.totalSku)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  item
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Akumulasi: {formatNumber(kpiData.totalUnit)} unit fisik
            </CardContent>
          </Card>

          {/* 3. Stok Aman */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                Stok Aman
              </CardDescription>
              <CardTitle className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                {formatNumber(kpiData.countAman)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  SKU
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Di atas batas minimum
            </CardContent>
          </Card>

          {/* 4. Stok Menipis */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium text-amber-600 dark:text-amber-400'>
                Stok Menipis
              </CardDescription>
              <CardTitle className='text-2xl font-bold text-amber-600 dark:text-amber-400'>
                {formatNumber(kpiData.countMenipis)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  SKU
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Perlu segera restock
            </CardContent>
          </Card>

          {/* 5. Stok Habis */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium text-rose-600 dark:text-rose-400'>
                Stok Habis
              </CardDescription>
              <CardTitle className='text-2xl font-bold text-rose-600 dark:text-rose-400'>
                {formatNumber(kpiData.countHabis)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  SKU
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Persediaan 0 unit
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
        >
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportCsv}
              disabled={filteredAndSortedList.length === 0}
              className='h-8 gap-1.5 text-xs'
            >
              <Download className='h-4 w-4' />
              <span>Ekspor CSV</span>
            </Button>
            <Button
              variant='default'
              size='sm'
              onClick={handleExportPdf}
              disabled={filteredAndSortedList.length === 0}
              className='h-8 gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white'
            >
              <Download className='h-4 w-4' />
              <span>Ekspor PDF</span>
            </Button>
          </div>
        </TableToolbar>

        {/* Data Table */}
        <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow>
                    <TableHead className='w-12 text-center'>#</TableHead>
                    <TableHead>Nama Menu / Barang</TableHead>
                    <TableHead className='w-32'>Kategori</TableHead>
                    <TableHead className='w-28 text-center'>Status</TableHead>
                    <TableHead className='text-right w-28'>
                      Stok Saat Ini
                    </TableHead>
                    <TableHead className='text-right w-28'>Batas Min</TableHead>
                    <TableHead className='text-right w-36'>
                      HPP Terakhir
                    </TableHead>
                    <TableHead className='text-right w-44 font-semibold'>
                      Nilai Persediaan
                    </TableHead>
                    <TableHead className='text-center w-36'>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className='h-32 text-center text-muted-foreground'
                      >
                        <div className='flex flex-col items-center justify-center gap-2'>
                          <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                          <span>Memuat tabel inventaris persediaan...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAndSortedList.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className='h-32 text-center text-muted-foreground'
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
                        <TableRow key={item.menuId} className='hover:bg-muted/40'>
                          <TableCell className='text-center text-xs text-muted-foreground'>
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-col'>
                              <span className='font-semibold text-foreground text-sm'>
                                {item.namaMenu || item.nama}
                              </span>
                              <span className='text-[11px] text-muted-foreground'>
                                SKU #{item.menuId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            {kategoriNama}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Badge
                              variant={
                                status === 'AMAN'
                                  ? 'secondary'
                                  : status === 'MENIPIS'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className={`text-[11px] font-semibold border-0 ${
                                status === 'AMAN'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : status === 'MENIPIS'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : ''
                              }`}
                            >
                              {status === 'AMAN'
                                ? 'Aman'
                                : status === 'MENIPIS'
                                ? 'Menipis'
                                : 'Habis'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right font-mono font-bold text-sm'>
                            {formatNumber(stok)}{' '}
                            <span className='text-xs font-normal text-muted-foreground'>
                              unit
                            </span>
                          </TableCell>
                          <TableCell className='text-right font-mono text-xs text-muted-foreground'>
                            {formatNumber(min)}
                          </TableCell>
                          <TableCell className='text-right font-mono text-sm text-foreground'>
                            {formatRupiah(hpp)}
                          </TableCell>
                          <TableCell className='text-right font-mono font-bold text-sm text-primary'>
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
                                <Link to='/stok/masuk'>
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
            <div className='flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/30 border-t text-xs text-muted-foreground gap-2'>
              <div>
                Menampilkan{' '}
                <strong className='text-foreground'>
                  {filteredAndSortedList.length}
                </strong>{' '}
                dari {inventarisList.length} item menu
              </div>
              <div className='flex items-center gap-6'>
                <span>
                  Total Fisik Terfilter:{' '}
                  <strong className='text-foreground font-mono text-sm'>
                    {formatNumber(filteredSummary.totalUnit)} unit
                  </strong>
                </span>
                <span>
                  Total Nilai Terfilter:{' '}
                  <strong className='text-primary font-mono text-sm font-bold'>
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
