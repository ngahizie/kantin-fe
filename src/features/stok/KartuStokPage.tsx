import { useState, useEffect, useMemo } from 'react'
import {
  FileSpreadsheet,
  Download,
  History,
  Calendar,
} from 'lucide-react'
import { Link, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import { exportTableToPdf } from '@/lib/pdfExport'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import type { MenuItem } from '@/features/katalog/types'
import { stokApi } from './api/stok-api'
import { KartuStokTimeline } from './components/KartuStokTimeline'
import type { RiwayatStokItem, StokResponse } from './types'

export function KartuStokPage() {
  // Read optional menuId from query params
  const searchParams = useSearch({ strict: false }) as { menuId?: string | number }
  const initialMenuId = searchParams?.menuId ? Number(searchParams.menuId) : undefined

  const [menuList, setMenuList] = useState<MenuItem[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState<number | undefined>(initialMenuId)
  const [stokDetail, setStokDetail] = useState<StokResponse | null>(null)
  const [riwayat, setRiwayat] = useState<RiwayatStokItem[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(false)

  // Filter States
  const [filterJenis, setFilterJenis] = useState<string>('ALL')
  const [periodePreset, setPeriodePreset] = useState<'ALL' | 'TODAY' | '7D' | '30D' | 'MONTH'>('ALL')
  const [tanggalDari, setTanggalDari] = useState<string>('')
  const [tanggalSampai, setTanggalSampai] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [activeView, setActiveView] = useState<'table' | 'timeline'>('table')

  // Load Menu List once
  useEffect(() => {
    let isMounted = true
    const fetchMenus = async () => {
      try {
        const menus = await katalogApi.getMenuList(undefined, true)
        if (!isMounted) return
        setMenuList(menus)
        const targetId =
          initialMenuId && menus.some((m) => m.id === initialMenuId)
            ? initialMenuId
            : menus[0]?.id
        if (targetId) {
          setSelectedMenuId(targetId)
        }
      } catch (_err) {
        toast.error('Gagal memuat katalog menu')
      } finally {
        if (isMounted) setIsLoadingMenu(false)
      }
    }
    void fetchMenus()
    return () => {
      isMounted = false
    }
  }, [initialMenuId])


  useEffect(() => {
    if (!selectedMenuId) return
    let isMounted = true

    const load = async () => {
      try {
        let dariIso: string | undefined
        let sampaiIso: string | undefined

        if (tanggalDari) {
          dariIso = new Date(`${tanggalDari}T00:00:00`).toISOString()
        }
        if (tanggalSampai) {
          sampaiIso = new Date(`${tanggalSampai}T23:59:59.999`).toISOString()
        }

        const [riwayatRes, detailRes] = await Promise.all([
          stokApi.getRiwayatStok({
            menuId: selectedMenuId,
            dari: dariIso,
            sampai: sampaiIso,
            ukuran: 200,
          }),
          stokApi.getStokMenu(selectedMenuId).catch(() => null),
        ])

        if (!isMounted) return
        setRiwayat(riwayatRes.items || [])
        setStokDetail(detailRes)
      } catch (err: unknown) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat kartu stok'
        toast.error('Gagal Memuat Mutasi', { description: msg })
      } finally {
        if (isMounted) setIsLoadingRiwayat(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [selectedMenuId, tanggalDari, tanggalSampai])

  // Handle Quick Date Preset Changes
  const handlePresetChange = (preset: 'ALL' | 'TODAY' | '7D' | '30D' | 'MONTH') => {
    setPeriodePreset(preset)
    const now = new Date()

    if (preset === 'ALL') {
      setTanggalDari('')
      setTanggalSampai('')
      return
    }

    const formatDateInput = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    setTanggalSampai(formatDateInput(now))

    if (preset === 'TODAY') {
      setTanggalDari(formatDateInput(now))
    } else if (preset === '7D') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setTanggalDari(formatDateInput(d))
    } else if (preset === '30D') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      setTanggalDari(formatDateInput(d))
    } else if (preset === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setTanggalDari(formatDateInput(firstDay))
    }
  }

  // Selected Menu Info
  const selectedMenu = useMemo(
    () => menuList.find((m) => m.id === selectedMenuId),
    [menuList, selectedMenuId]
  )

  // Filtered Riwayat Items
  const filteredRiwayat = useMemo(() => {
    return riwayat.filter((item) => {
      // Filter Jenis
      if (filterJenis !== 'ALL') {
        if (filterJenis === 'MASUK' && item.arah !== 'MASUK') return false
        if (filterJenis === 'KELUAR' && item.arah !== 'KELUAR') return false
        if (filterJenis === 'PENJUALAN' && !item.jenis.startsWith('PENJUALAN')) return false
        if (filterJenis === 'OPNAME' && !item.jenis.startsWith('OPNAME')) return false
        if (filterJenis === 'RUSAK' && item.jenis !== 'BARANG_RUSAK') return false
      }

      // Filter Keyword
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase()
        const matchRef = item.referensiId?.toLowerCase().includes(q)
        const matchAlasan = item.alasan?.toLowerCase().includes(q)
        const matchAktor = item.aktorNama?.toLowerCase().includes(q)
        if (!matchRef && !matchAlasan && !matchAktor) return false
      }

      return true
    })
  }, [riwayat, filterJenis, searchKeyword])

  // Calculation Metrics from Riwayat
  const kpiData = useMemo(() => {
    let totalMasuk = 0
    let totalKeluar = 0

    filteredRiwayat.forEach((r) => {
      if (r.arah === 'MASUK') {
        totalMasuk += r.qty
      } else {
        totalKeluar += r.qty
      }
    })

    const currentStok = stokDetail?.stok ?? selectedMenu?.stokBerjalan ?? 0
    const hpp =
      stokDetail?.hpp ?? Math.round((selectedMenu?.hargaJual ?? 0) * 0.7)
    const totalNilaiPersediaan = currentStok * hpp
    const stokMin = stokDetail?.stokMinimum ?? selectedMenu?.stokMinimum ?? 0

    let status: 'AMAN' | 'MENIPIS' | 'HABIS' = 'AMAN'
    if (currentStok === 0) status = 'HABIS'
    else if (currentStok <= stokMin) status = 'MENIPIS'

    return {
      currentStok,
      hpp,
      totalNilaiPersediaan,
      totalMasuk,
      totalKeluar,
      status,
      stokMin,
    }
  }, [filteredRiwayat, stokDetail, selectedMenu])

  // Verify Running Balance Consistency (DoD Requirement)
  const isBalanceConsistent = useMemo(() => {
    if (riwayat.length < 2) return true
    // Sort chronological ASC to verify transitions
    const asc = [...riwayat].sort(
      (a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime()
    )
    for (let i = 1; i < asc.length; i++) {
      const prev = asc[i - 1]
      const curr = asc[i]
      const delta = curr.arah === 'MASUK' ? curr.qty : -curr.qty
      if (prev.stokSetelah + delta !== curr.stokSetelah) {
        return false
      }
    }
    return true
  }, [riwayat])

  // Export to CSV Function
  const handleExportCsv = () => {
    if (filteredRiwayat.length === 0) {
      toast.warning('Tidak ada data mutasi untuk diekspor')
      return
    }

    const headers = [
      'ID Mutasi',
      'Waktu',
      'Nomor Referensi',
      'Jenis Mutasi',
      'Arah',
      'Qty',
      'Saldo Berjalan',
      'HPP Snapshot (Rp)',
      'Harga Beli Satuan (Rp)',
      'Total Nilai (Rp)',
      'Aktor',
      'Alasan/Catatan',
    ]

    const rows = filteredRiwayat.map((r) => [
      r.id,
      `"${r.waktu}"`,
      `"${r.referensiId}"`,
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
      `kartu-stok-${selectedMenu?.nama || 'item'}-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Kartu stok berhasil diunduh dalam format CSV')
  }

  const handleExportPdf = () => {
    if (filteredRiwayat.length === 0) {
      toast.warning('Tidak ada data mutasi untuk diekspor')
      return
    }

    try {
      const rows = filteredRiwayat.map((r) => ({
        waktu: formatDateTime(r.waktu),
        referensiId: r.referensiId,
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
        filename: `Kartu_Stok_${selectedMenu?.nama.replace(/\s+/g, '_') || 'Semua'}_${new Date().toISOString().split('T')[0]}`,
        title: 'KARTU STOK & HISTORI MUTASI PERSEDIAAN',
        subtitle: selectedMenu ? `Menu: ${selectedMenu.nama}` : 'Seluruh Mutasi Menu',
        metadata: {
          'Tanggal Cetak': new Date().toLocaleString('id-ID'),
          'Menu Terpilih': selectedMenu ? selectedMenu.nama : 'Semua Menu',
          'Stok Berjalan': stokDetail ? `${stokDetail.stok} Unit` : '-',
          'HPP Rata-rata': stokDetail ? formatRupiah(stokDetail.hpp) : '-',
          'Total Nilai Persediaan': stokDetail ? formatRupiah(stokDetail.nilaiPersediaan) : '-',
          'Konsistensi Saldo': isBalanceConsistent ? 'VALID (SEIMBANG)' : 'PERIKSA ANOMALI',
        },
        columns: [
          { header: 'Waktu Mutasi', key: 'waktu' },
          { header: 'No. Referensi', key: 'referensiId' },
          { header: 'Jenis Mutasi', key: 'jenis' },
          { header: 'Arah', key: 'arah' },
          { header: 'Qty', key: 'qty' },
          { header: 'Saldo Akhir', key: 'stokSetelah' },
          { header: 'HPP Unit', key: 'hpp' },
          { header: 'Total Nilai', key: 'totalNilai' },
          { header: 'Aktor', key: 'aktor' },
          { header: 'Alasan / Keterangan', key: 'alasan' },
        ],
        data: rows,
      })

      toast.success('Ekspor PDF Berhasil', {
        description: 'Kartu Stok (.pdf) berhasil diunduh.',
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
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      case 'PENJUALAN':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
      case 'BARANG_RUSAK':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
      case 'PENJUALAN_VOID':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
      case 'OPNAME_KELUAR':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
      case 'BARANG_MASUK_PEMBALIK':
        return 'bg-destructive/15 text-destructive'
      default:
        return arah === 'MASUK'
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-muted/80 text-muted-foreground'
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
            <span className='text-xs font-medium'>Kartu Stok Mutasi</span>
          </div>
          <div className='flex items-center gap-2'>
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main className='space-y-6'>
        {/* Top Header & Navigation Actions */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              Kartu Stok Inventaris
            </h1>

          </div>
          <div className='flex flex-wrap items-center gap-2.5'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleExportCsv}
              disabled={filteredRiwayat.length === 0}
              className='gap-1.5'
            >
              <Download className='h-4 w-4' />
              <span>Ekspor CSV</span>
            </Button>

            <Button
              variant='default'
              size='sm'
              onClick={handleExportPdf}
              disabled={filteredRiwayat.length === 0}
              className='gap-1.5 bg-rose-600 hover:bg-rose-700 text-white'
            >
              <Download className='h-4 w-4' />
              <span>Ekspor PDF (.pdf)</span>
            </Button>

            <Button size='sm' asChild className='gap-1.5'>
              <Link to='/stok/inventaris'>
                <FileSpreadsheet className='h-4 w-4' />
                <span>Tabel Ringkasan Inventaris</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter & Selector Bar */}
        <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
          <CardContent className='p-4 sm:p-5 flex flex-col gap-4 sm:gap-5'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {/* Menu Item Selector */}
              <div className='space-y-1.5 md:col-span-1'>
                <label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                  Pilih Menu / SKU
                </label>
                <Select
                  value={selectedMenuId ? String(selectedMenuId) : ''}
                  onValueChange={(val) => setSelectedMenuId(Number(val))}
                  disabled={isLoadingMenu}
                >
                  <SelectTrigger className='w-full font-medium'>
                    <SelectValue placeholder='Pilih menu kantin...' />
                  </SelectTrigger>
                  <SelectContent className='max-h-60'>
                    {menuList.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        <div className='flex items-center justify-between gap-2 w-full'>
                          <span className='font-medium'>{m.nama}</span>
                          <span className='text-xs text-muted-foreground'>
                            Stok: {m.stokBerjalan}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Jenis Mutasi Filter */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                  Jenis Mutasi
                </label>
                <Select value={filterJenis} onValueChange={setFilterJenis}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Semua Jenis' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>Semua Pergerakan</SelectItem>
                    <SelectItem value='MASUK'>Barang Masuk & Restock (+)</SelectItem>
                    <SelectItem value='KELUAR'>Seluruh Mutasi Keluar (-)</SelectItem>
                    <SelectItem value='PENJUALAN'>Penjualan Kasir POS</SelectItem>
                    <SelectItem value='OPNAME'>Hasil Opname Fisik</SelectItem>
                    <SelectItem value='RUSAK'>Barang Rusak / Basi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Keyword Search */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                  Cari Bukti / Alasan / Aktor
                </label>
                <Input
                  placeholder='Ketik nomor faktur, alasan...'
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className='w-full'
                />
              </div>
            </div>

            {/* Quick Presets & Date Filters */}
            <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
              <div className='flex flex-wrap items-center gap-1.5'>
                <span className='text-xs text-muted-foreground mr-1 flex items-center gap-1'>
                  <Calendar className='h-3.5 w-3.5' /> Periode:
                </span>
                <Button
                  type='button'
                  size='sm'
                  variant={periodePreset === 'ALL' ? 'default' : 'secondary'}
                  className='h-7 text-xs px-2.5 border-0 shadow-none'
                  onClick={() => handlePresetChange('ALL')}
                >
                  Semua
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={periodePreset === 'TODAY' ? 'default' : 'secondary'}
                  className='h-7 text-xs px-2.5 border-0 shadow-none'
                  onClick={() => handlePresetChange('TODAY')}
                >
                  Hari Ini
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={periodePreset === '7D' ? 'default' : 'secondary'}
                  className='h-7 text-xs px-2.5 border-0 shadow-none'
                  onClick={() => handlePresetChange('7D')}
                >
                  7 Hari Terakhir
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={periodePreset === '30D' ? 'default' : 'secondary'}
                  className='h-7 text-xs px-2.5 border-0 shadow-none'
                  onClick={() => handlePresetChange('30D')}
                >
                  30 Hari
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={periodePreset === 'MONTH' ? 'default' : 'secondary'}
                  className='h-7 text-xs px-2.5 border-0 shadow-none'
                  onClick={() => handlePresetChange('MONTH')}
                >
                  Bulan Ini
                </Button>
              </div>

              {/* Custom Date Pickers */}
              <div className='flex items-center gap-2 text-xs'>
                <span className='text-muted-foreground'>Rentang Kustom:</span>
                <Input
                  type='date'
                  value={tanggalDari}
                  onChange={(e) => {
                    setTanggalDari(e.target.value)
                    setPeriodePreset('ALL')
                  }}
                  className='h-7 w-36 text-xs border-0 bg-background/80 dark:bg-background/40 shadow-none'
                />
                <span className='text-muted-foreground'>s/d</span>
                <Input
                  type='date'
                  value={tanggalSampai}
                  onChange={(e) => {
                    setTanggalSampai(e.target.value)
                    setPeriodePreset('ALL')
                  }}
                  className='h-7 w-36 text-xs border-0 bg-background/80 dark:bg-background/40 shadow-none'
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Menu KPI Card Grid */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-3.5'>
          {/* 1. Saldo Berjalan Saat Ini */}
          <Card className='relative overflow-hidden border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium'>
                Stok Berjalan Saat Ini
              </CardDescription>
              <CardTitle className='text-2xl font-bold flex items-baseline gap-1.5'>
                <span>{formatNumber(kpiData.currentStok)}</span>
                <span className='text-xs font-normal text-muted-foreground'>
                  unit
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0'>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant={
                    kpiData.status === 'AMAN'
                      ? 'secondary'
                      : kpiData.status === 'MENIPIS'
                      ? 'secondary'
                      : 'destructive'
                  }
                  className={`text-[10px] font-semibold border-0 ${
                    kpiData.status === 'AMAN'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : kpiData.status === 'MENIPIS'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : ''
                  }`}
                >
                  {kpiData.status === 'AMAN'
                    ? 'Stok Aman'
                    : kpiData.status === 'MENIPIS'
                    ? `Menipis (Min: ${kpiData.stokMin})`
                    : 'Stok Habis'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 2. Total Masuk Periode */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                Total Masuk
              </CardDescription>
              <CardTitle className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                +{formatNumber(kpiData.totalMasuk)}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Restock & opname masuk
            </CardContent>
          </Card>

          {/* 3. Total Keluar Periode */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium text-rose-600 dark:text-rose-400'>
                Total Keluar
              </CardDescription>
              <CardTitle className='text-2xl font-bold text-rose-600 dark:text-rose-400'>
                -{formatNumber(kpiData.totalKeluar)}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Penjualan, rusak, audit
            </CardContent>
          </Card>

          {/* 4. Snapshot HPP */}
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium'>
                Snapshot HPP Terkini
              </CardDescription>
              <CardTitle className='text-xl font-bold font-mono'>
                {formatRupiah(kpiData.hpp)}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Rata-rata tertimbang
            </CardContent>
          </Card>

          {/* 5. Valuasi Nilai Persediaan */}
          <Card className='col-span-2 md:col-span-1 border-0 bg-muted/70 dark:bg-muted/30'>
            <CardHeader className='pb-2 pt-4 px-4'>
              <CardDescription className='text-xs font-medium'>
                Total Nilai Stok Item
              </CardDescription>
              <CardTitle className='text-xl font-bold font-mono text-foreground'>
                {formatRupiah(kpiData.totalNilaiPersediaan)}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-3 pt-0 text-xs text-muted-foreground'>
              Stok berjalan × HPP
            </CardContent>
          </Card>
        </div>

        {/* Saldo Consistency Audit Banner */}
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg border-0 text-xs ${
            isBalanceConsistent
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
          }`}
        >
          <div className='flex items-center gap-2'>
            {isBalanceConsistent ? (
              <span>
                <strong className='font-semibold text-emerald-800 dark:text-emerald-300'>
                  Integritas Saldo Terverifikasi:
                </strong>{' '}
                Saldo berjalan konsisten dari transaksi awal hingga transaksi
                terkini.
              </span>
            ) : (
              <span>
                <strong className='font-semibold text-red-700 dark:text-red-300'>
                  Pemberitahuan Audit:
                </strong>{' '}
                Ditemukan lompatan saldo di luar kalkulasi linear (kemungkinan
                ada penyesuaian manual).
              </span>
            )}
          </div>
          <Button
            size='sm'
            variant='ghost'
            asChild
            className={`h-7 text-xs ${
              isBalanceConsistent
                ? 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40'
                : 'text-red-700 hover:text-red-800 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40'
            }`}
          >
            <Link to='/stok/masuk'>
              Restock Menu Ini
            </Link>
          </Button>
        </div>

        {/* Tab Switcher: Table View vs Timeline View */}
        <Tabs
          value={activeView}
          onValueChange={(v) => setActiveView(v as 'table' | 'timeline')}
          className='w-full space-y-4'
        >
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <TabsList>
              <TabsTrigger value='table' className='gap-1.5'>
                <FileSpreadsheet className='h-4 w-4' />
                <span>Tabel Mutasi Akuntansi</span>
              </TabsTrigger>
              <TabsTrigger value='timeline' className='gap-1.5'>
                <History className='h-4 w-4' />
                <span>Linimasa Kronologis</span>
              </TabsTrigger>
            </TabsList>

            <span className='text-xs text-muted-foreground'>
              Menampilkan {filteredRiwayat.length} dari {riwayat.length} transaksi
            </span>
          </div>

          {/* TAB 1: Tabel Mutasi */}
          <TabsContent value='table' className='space-y-4 m-0'>
            <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow>
                        <TableHead className='w-40'>Waktu</TableHead>
                        <TableHead className='w-36'>No. Referensi</TableHead>
                        <TableHead>Jenis Mutasi</TableHead>
                        <TableHead className='text-right w-24 text-emerald-600'>
                          Masuk
                        </TableHead>
                        <TableHead className='text-right w-24 text-rose-600'>
                          Keluar
                        </TableHead>
                        <TableHead className='text-right w-28 font-semibold'>
                          Saldo Akhir
                        </TableHead>
                        <TableHead className='text-right w-32'>
                          HPP Snapshot
                        </TableHead>
                        <TableHead className='w-36'>Aktor</TableHead>
                        <TableHead>Alasan / Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingRiwayat ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className='h-32 text-center text-muted-foreground'
                          >
                            <div className='flex flex-col items-center justify-center gap-2'>
                              <div className='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                              <span>Memuat data riwayat mutasi...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredRiwayat.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className='h-32 text-center text-muted-foreground'
                          >
                            Tidak ada pergerakan stok pada filter yang dipilih.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRiwayat.map((item) => {
                          const isMasuk = item.arah === 'MASUK'
                          const aktorDisplay =
                            item.aktorNama ||
                            (item.aktorId ? `Aktor #${item.aktorId}` : 'Sistem')

                          return (
                            <TableRow key={item.id} className='hover:bg-muted/40'>
                              <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
                                {formatDateTime(item.waktu)}
                              </TableCell>
                              <TableCell className='font-mono text-xs font-medium'>
                                {item.referensiId}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`text-[11px] font-medium border-0 shadow-none ${getJenisBadgeClass(
                                    item.jenis,
                                    item.arah
                                  )}`}
                                >
                                  {item.jenis.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className='text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400'>
                                {isMasuk ? `+${formatNumber(item.qty)}` : '-'}
                              </TableCell>
                              <TableCell className='text-right font-mono font-semibold text-rose-600 dark:text-rose-400'>
                                {!isMasuk ? `-${formatNumber(item.qty)}` : '-'}
                              </TableCell>
                              <TableCell className='text-right font-mono font-bold text-foreground'>
                                {formatNumber(item.stokSetelah)}
                              </TableCell>
                              <TableCell className='text-right font-mono text-xs text-muted-foreground'>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Timeline View */}
          <TabsContent value='timeline' className='m-0'>
            <div className='py-1'>
              <KartuStokTimeline
                items={filteredRiwayat}
                isLoading={isLoadingRiwayat}
              />
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
