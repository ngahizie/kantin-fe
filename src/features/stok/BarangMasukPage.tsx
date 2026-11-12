import { useState, useEffect } from 'react'
import {
  PlusCircle,
  History,
  UtensilsCrossed,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatNumber } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { katalogApi } from '@/features/katalog/api/katalog-api'
import type { MenuItem } from '@/features/katalog/types'
import { stokApi } from './api/stok-api'
import { BarangMasukForm } from './components/BarangMasukForm'
import { RiwayatStokTable } from './components/RiwayatStokTable'
import type { RiwayatStokItem, StokResponse, JenisMutasiStok } from './types'

export function BarangMasukPage() {
  const [activeTab, setActiveTab] = useState('form')
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [stokMenipis, setStokMenipis] = useState<StokResponse[]>([])
  const [riwayatItems, setRiwayatItems] = useState<RiwayatStokItem[]>([])
  const [totalRiwayat, setTotalRiwayat] = useState(0)
  const [loadingMenus, setLoadingMenus] = useState(true)
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)

  // Filter riwayat
  const [selectedJenis, setSelectedJenis] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 20

  // Load menu katalog untuk dropdown
  const loadMenus = async () => {
    try {
      setLoadingMenus(true)
      const [menuData, menipisData] = await Promise.all([
        katalogApi.getMenuList(undefined, true),
        stokApi.getStokMenipis().catch(() => []),
      ])
      setMenus(menuData)
      setStokMenipis(menipisData)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || 'Gagal memuat katalog menu')
    } finally {
      setLoadingMenus(false)
    }
  }

  // Load riwayat mutasi stok
  const loadRiwayat = async (page = currentPage, jenis = selectedJenis) => {
    try {
      setLoadingRiwayat(true)
      const res = await stokApi.getRiwayatStok({
        halaman: page,
        ukuran: pageSize,
        jenis: jenis === 'all' ? undefined : (jenis as JenisMutasiStok),
      })
      setRiwayatItems(res.items || [])
      setTotalRiwayat(res.total || 0)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || 'Gagal memuat riwayat mutasi stok')
    } finally {
      setLoadingRiwayat(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [menuData, menipisData, riwayatData] = await Promise.all([
          katalogApi.getMenuList(undefined, true),
          stokApi.getStokMenipis().catch(() => []),
          stokApi
            .getRiwayatStok({ halaman: 0, ukuran: pageSize })
            .catch(() => ({
              items: [],
              total: 0,
              halaman: 0,
              ukuran: pageSize,
              totalHalaman: 0,
            })),
        ])
        if (isMounted) {
          setMenus(menuData)
          setStokMenipis(menipisData)
          setRiwayatItems(riwayatData.items || [])
          setTotalRiwayat(riwayatData.total || 0)
          setLoadingMenus(false)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err as { message?: string }
          toast.error(error.message || 'Gagal memuat data stok awal')
          setLoadingMenus(false)
        }
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  const handleJenisFilterChange = (jenis: string) => {
    setSelectedJenis(jenis)
    setCurrentPage(0)
    void loadRiwayat(0, jenis)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    void loadRiwayat(newPage, selectedJenis)
  }

  const handleRestockSuccess = () => {
    // Refresh menus (untuk stok terbaru) dan riwayat
    void loadMenus()
    void loadRiwayat(0, selectedJenis)
    setActiveTab('riwayat')
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Manajemen Stok' title='Barang Masuk' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Page Title */}
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
            Pencatatan Barang Masuk
          </h1>
          <p className='text-sm text-muted-foreground'>
            Catat penerimaan stok dan harga beli dari pemasok serta pantau riwayat mutasi.
          </p>
        </div>

        {/* Ringkasan Status Header Cards */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Menu Aktif di Katalog
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'>
                <UtensilsCrossed className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {loadingMenus ? '...' : formatNumber(menus.length)} Menu
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total Riwayat Mutasi
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300'>
                <History className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {formatNumber(totalRiwayat)} Transaksi
              </h3>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Peringatan Stok Menipis
              </CardTitle>
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${
                  loadingMenus
                    ? 'border-border bg-muted/50 text-muted-foreground'
                    : stokMenipis.length === 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : stokMenipis.some((item) => item.stok === 0)
                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                <AlertTriangle className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <h3
                className={`text-2xl font-bold tracking-tight tabular-nums ${
                  loadingMenus
                    ? 'text-foreground'
                    : stokMenipis.length === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stokMenipis.some((item) => item.stok === 0)
                    ? 'text-destructive'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {loadingMenus ? (
                  '...'
                ) : stokMenipis.length > 0 ? (
                  <span>{stokMenipis.length} Menu</span>
                ) : (
                  'Semua Aman'
                )}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Formulir Restock & Riwayat */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='space-y-4'
        >
          <TabsList className='grid w-full grid-cols-2 sm:w-[420px]'>
            <TabsTrigger
              value='form'
              className='flex items-center gap-1.5 text-xs'
            >
              <PlusCircle className='h-3.5 w-3.5' />
              Formulir Barang Masuk
            </TabsTrigger>
            <TabsTrigger
              value='riwayat'
              className='flex items-center gap-1.5 text-xs'
            >
              <History className='h-3.5 w-3.5' />
              Riwayat & Pembalik
            </TabsTrigger>
          </TabsList>

          <TabsContent value='form' className='space-y-4'>
            <BarangMasukForm menus={menus} onSuccess={handleRestockSuccess} />
          </TabsContent>

          <TabsContent value='riwayat' className='space-y-4'>
            <RiwayatStokTable
              items={riwayatItems}
              loading={loadingRiwayat}
              onRefresh={() => loadRiwayat(currentPage, selectedJenis)}
              totalCount={totalRiwayat}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              selectedJenis={selectedJenis}
              onJenisChange={handleJenisFilterChange}
            />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
