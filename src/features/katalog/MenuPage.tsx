import { useState, useEffect, useMemo } from 'react'
import {
  UtensilsCrossed,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Tag,
  ChevronLeft,
  ChevronRight,
  Filter,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { formatRupiah, formatNumber } from '@/lib/formatters'
import { katalogApi } from './api/katalog-api'
import { MenuFormModal } from './MenuFormModal'
import type { MenuItem, KategoriItem } from './types'

const PAGE_SIZE = 10

export function MenuPage() {
  const [menuList, setMenuList] = useState<MenuItem[]>([])
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategoriId, setSelectedKategoriId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeDeleteTarget, setActiveDeleteTarget] = useState<MenuItem | null>(null)
  const handleDeleteClick = (item: MenuItem) => {
    setDeleteTarget(item)
    setActiveDeleteTarget(item)
  }

  
  // Load menu and kategori data
  const loadData = async () => {
    try {
      setLoading(true)
      const [menus, categories] = await Promise.all([
        katalogApi.getMenuList(undefined, false),
        katalogApi.getKategoriList(false),
      ])
      setMenuList(menus)
      setKategoriList(categories)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || 'Gagal memuat data katalog menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [menus, categories] = await Promise.all([
          katalogApi.getMenuList(undefined, false),
          katalogApi.getKategoriList(false),
        ])
        if (isMounted) {
          setMenuList(menus)
          setKategoriList(categories)
          setLoading(false)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err as { message?: string }
          toast.error(error.message || 'Gagal memuat data katalog menu')
          setLoading(false)
        }
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  // Map kategoriId ke nama kategori
  const kategoriMap = useMemo(() => {
    const map = new Map<number, string>()
    kategoriList.forEach((k) => map.set(k.id, k.nama))
    return map
  }, [kategoriList])

  // Metrik statistik
  const stats = useMemo(() => {
    const total = menuList.length
    const aktif = menuList.filter((m) => m.aktif).length
    const nonaktif = total - aktif
    const stokMenipis = menuList.filter(
      (m) => m.aktif && m.stokBerjalan <= (m.stokMinimum || 0)
    ).length
    return { total, aktif, nonaktif, stokMenipis }
  }, [menuList])

  // Filter data sesuai kriteria
  const filteredMenu = useMemo(() => {
    return menuList.filter((item) => {
      // 1. Search Query
      const query = (searchQuery || '').trim().toLowerCase()
      const matchSearch = !query || (item?.nama ?? '').toLowerCase().includes(query)

      // 2. Kategori Filter
      const matchKategori =
        selectedKategoriId === 'all' || String(item?.kategoriId ?? '') === selectedKategoriId

      // 3. Status Filter
      let matchStatus = true
      if (selectedStatus === 'active') {
        matchStatus = item.aktif === true
      } else if (selectedStatus === 'inactive') {
        matchStatus = item.aktif === false
      } else if (selectedStatus === 'low_stock') {
        matchStatus = (item?.aktif === true) && (item?.stokBerjalan ?? 0) <= (item?.stokMinimum ?? 0)
      }

      return matchSearch && matchKategori && matchStatus
    })
  }, [menuList, searchQuery, selectedKategoriId, selectedStatus])

  // Pagination calculation
  const totalPages = Math.ceil(filteredMenu.length / PAGE_SIZE) || 1
  const paginatedMenu = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredMenu.slice(start, start + PAGE_SIZE)
  }, [filteredMenu, currentPage])

  const handleAdd = () => {
    setSelectedMenu(null)
    setIsModalOpen(true)
  }

  const handleEdit = (menu: MenuItem) => {
    setSelectedMenu(menu)
    setIsModalOpen(true)
  }

  const confirmDelete = async () => {
    const target = activeDeleteTarget
    if (!target) return
    try {
      setIsDeleting(true)
      await katalogApi.deleteMenu(target.id)
      toast.success(`Menu "${target.nama}" berhasil dinonaktifkan`)
      setDeleteTarget(null)
      loadData()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message = error.response?.data?.message || error.message || 'Gagal menonaktifkan menu'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Header fixed className='border-b border-sidebar-border/50'>
        <div className='flex items-center gap-2 overflow-hidden me-auto'>
          <h1 className='text-base sm:text-lg font-bold tracking-tight text-foreground'>
            Katalog Menu Kantin
          </h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 pb-12'>
        {/* Actions */}
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='secondary'
            size='sm'
            onClick={loadData}
            disabled={loading}
            className='gap-1.5 border-none bg-muted/70 dark:bg-muted/30 text-foreground hover:bg-muted rounded-xl shadow-none'
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Button
            size='sm'
            onClick={handleAdd}
            className='gap-1.5 border-none rounded-xl shadow-none font-semibold'
          >
            <Plus className='size-4' />
            Tambah Menu Baru
          </Button>
        </div>

        {/* Ringkasan Widgets */}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Total Menu</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums'>{stats.total}</h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Terdaftar di katalog</p>
            </CardContent>
          </Card>

          <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Menu Aktif</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                {stats.aktif}
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Tampil di kasir POS</p>
            </CardContent>
          </Card>

          <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Stok Menipis / Habis</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums'>
                {stats.stokMenipis}
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Perlu restock segera</p>
            </CardContent>
          </Card>

          <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Menu Nonaktif</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-muted-foreground tabular-nums'>
                {stats.nonaktif}
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Disembunyikan</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls & Search */}
        <Card className='overflow-hidden rounded-2xl border-none bg-muted/70 dark:bg-muted/30 shadow-none'>
          <div className='p-4 flex flex-col md:flex-row md:items-center justify-between gap-3'>
            <div className='flex flex-1 flex-col sm:flex-row items-center gap-2.5'>
              {/* Search Bar */}
              <div className='relative w-full sm:w-64 shrink-0'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                <Input
                  placeholder='Cari nama menu...'
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className='h-10 border-none bg-background/90 dark:bg-background/40 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:bg-background focus-visible:ring-0 rounded-xl shadow-none'
                />
                {searchQuery && (
                  <button
                    type='button'
                    onClick={() => {
                      setSearchQuery('')
                      setCurrentPage(1)
                    }}
                    className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-lg transition-colors outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0'
                    title='Hapus pencarian'
                  >
                    <X className='size-3.5' />
                  </button>
                )}
              </div>

              {/* Filter Kategori */}
              <div className='w-full sm:w-48 shrink-0'>
                <Select
                  value={selectedKategoriId}
                  onValueChange={(val) => {
                    setSelectedKategoriId(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className='w-full !h-10 data-[size=default]:!h-10 border-none bg-background/90 dark:bg-background/40 rounded-xl shadow-none text-sm text-foreground focus:ring-0 focus-visible:ring-0 px-3'>
                    <div className='flex items-center gap-2 truncate'>
                      <Tag className='size-4 text-muted-foreground shrink-0' />
                      <SelectValue placeholder='Kategori' />
                    </div>
                  </SelectTrigger>
                  <SelectContent className='border-none rounded-xl shadow-none'>
                    <SelectItem value='all'>Semua Kategori</SelectItem>
                    {kategoriList.map((kat) => (
                      <SelectItem key={kat.id} value={String(kat.id)}>
                        {kat.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Status */}
              <div className='w-full sm:w-48 shrink-0'>
                <Select
                  value={selectedStatus}
                  onValueChange={(val) => {
                    setSelectedStatus(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className='w-full !h-10 data-[size=default]:!h-10 border-none bg-background/90 dark:bg-background/40 rounded-xl shadow-none text-sm text-foreground focus:ring-0 focus-visible:ring-0 px-3'>
                    <div className='flex items-center gap-2 truncate'>
                      <Filter className='size-4 text-muted-foreground shrink-0' />
                      <SelectValue placeholder='Status' />
                    </div>
                  </SelectTrigger>
                  <SelectContent className='border-none rounded-xl shadow-none'>
                    <SelectItem value='all'>Semua Status</SelectItem>
                    <SelectItem value='active'>Hanya Aktif</SelectItem>
                    <SelectItem value='inactive'>Hanya Nonaktif</SelectItem>
                    <SelectItem value='low_stock'>Stok Menipis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='text-xs font-medium text-muted-foreground tabular-nums shrink-0'>
              Menampilkan {filteredMenu.length} dari {menuList.length} menu
            </div>
          </div>

          {/* Tabel Menu */}
          <CardContent className='p-0 overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='border-none bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'>
                  <TableHead className='w-16 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-6'>Foto</TableHead>
                  <TableHead className='border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-2'>Nama Menu</TableHead>
                  <TableHead className='w-36 border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Kategori</TableHead>
                  <TableHead className='w-32 text-right border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Harga Jual</TableHead>
                  <TableHead className='w-28 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Stok Berjalan</TableHead>
                  <TableHead className='w-24 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Satuan</TableHead>
                  <TableHead className='w-28 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Stok Min.</TableHead>
                  <TableHead className='w-24 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Status</TableHead>
                  <TableHead className='w-28 text-right border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider pe-6'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className='border-none'>
                    <TableCell colSpan={9} className='h-40 text-center text-muted-foreground border-none px-6'>
                      <div className='flex items-center justify-center gap-2'>
                        <RefreshCw className='size-4 animate-spin' />
                        <span>Memuat data katalog menu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredMenu.length === 0 ? (
                  <TableRow className='border-none'>
                    <TableCell colSpan={9} className='h-32 text-center text-muted-foreground border-none px-6'>
                      <div className='flex flex-col items-center justify-center gap-1.5'>
                        <UtensilsCrossed className='size-8 text-muted-foreground/40' />
                        <p className='font-semibold text-foreground'>Tidak ada menu ditemukan</p>
                        <p className='text-xs text-muted-foreground'>
                          {searchQuery || selectedKategoriId !== 'all' || selectedStatus !== 'all'
                            ? 'Coba gunakan kata kunci atau atur ulang filter pencarian lainnya'
                            : 'Mulai dengan menambahkan menu baru ke katalog'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMenu.map((item) => {
                    const kategoriNama =
                      kategoriMap.get(item.kategoriId || 0) || 'Tanpa Kategori'
                    const isStokMenipis = item.stokBerjalan <= (item.stokMinimum || 0)
                    const isHabis = item.stokBerjalan <= 0

                    return (
                      <TableRow key={item.id} className='border-none hover:bg-background/60 dark:hover:bg-background/10 transition-colors'>
                        {/* Foto Thumbnail */}
                        <TableCell className='text-center border-none py-3.5 ps-6'>
                          <div className='size-11 rounded-xl border-none bg-background/80 dark:bg-background/20 overflow-hidden flex items-center justify-center mx-auto shrink-0 shadow-none'>
                            {item.fotoUrl ? (
                              <img
                                src={katalogApi.getImageUrl(item.fotoUrl)}
                                alt={item.nama}
                                className='size-full object-cover'
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'
                                }}
                              />
                            ) : (
                              <ImageIcon className='size-5 text-muted-foreground/30' />
                            )}
                          </div>
                        </TableCell>

                        {/* Nama Menu */}
                        <TableCell className='border-none py-3.5 ps-2'>
                          <div className='font-semibold text-foreground text-sm'>{item.nama}</div>
                          <div className='text-[11px] text-muted-foreground tabular-nums'>ID: #{item.id}</div>
                        </TableCell>

                        {/* Kategori */}
                        <TableCell className='border-none py-3.5'>
                          <Badge
                            variant='secondary'
                            className='rounded-full border-none bg-background/80 dark:bg-background/20 text-muted-foreground font-semibold text-[10px] uppercase tracking-wide px-2.5 py-0.5 shadow-none'
                          >
                            {kategoriNama}
                          </Badge>
                        </TableCell>

                        {/* Harga Jual */}
                        <TableCell className='text-right font-semibold text-foreground border-none py-3.5 tabular-nums text-sm'>
                          {formatRupiah(item.hargaJual)}
                        </TableCell>

                        {/* Stok Berjalan */}
                        <TableCell className='text-center border-none py-3.5'>
                          <div className='flex flex-col items-center gap-0.5'>
                            <span
                              className={`font-semibold text-sm tabular-nums ${
                                isHabis
                                  ? 'text-destructive font-bold'
                                  : isStokMenipis
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-foreground'
                              }`}
                            >
                              {formatNumber(item.stokBerjalan)}
                            </span>
                            {isHabis ? (
                              <Badge
                                variant='secondary'
                                className='rounded-full border-none bg-destructive/15 text-destructive text-[9px] px-2 py-0.5 font-semibold uppercase tracking-wide shadow-none'
                              >
                                Habis
                              </Badge>
                            ) : isStokMenipis ? (
                              <Badge
                                variant='secondary'
                                className='rounded-full border-none bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] px-2 py-0.5 font-semibold uppercase tracking-wide shadow-none'
                              >
                                Menipis
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* Satuan */}
                        <TableCell className='text-center text-xs font-semibold text-muted-foreground uppercase border-none py-3.5'>
                          {item.satuan || 'PCS'}
                        </TableCell>

                        {/* Stok Minimum */}
                        <TableCell className='text-center text-xs text-muted-foreground border-none py-3.5 tabular-nums'>
                          {formatNumber(item.stokMinimum)}
                        </TableCell>

                        {/* Status Aktif */}
                        <TableCell className='text-center border-none py-3.5'>
                          {item.aktif ? (
                            <Badge
                              variant='secondary'
                              className='rounded-full border-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 shadow-none'
                            >
                              Aktif
                            </Badge>
                          ) : (
                            <Badge
                              variant='secondary'
                              className='rounded-full border-none bg-background/80 dark:bg-background/20 text-muted-foreground text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 shadow-none'
                            >
                              Nonaktif
                            </Badge>
                          )}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className='text-right border-none py-3.5 pe-6'>
                          <div className='flex items-center justify-end gap-1'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-xl border-none text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-background/20 shadow-none'
                              onClick={() => handleEdit(item)}
                              title='Ubah Menu'
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-xl border-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-none'
                              onClick={() => handleDeleteClick(item)}
                              title='Nonaktifkan Menu'
                            >
                              <Trash2 className='size-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className='p-4 flex items-center justify-between'>
              <div className='text-xs font-medium text-muted-foreground tabular-nums'>
                Halaman <span className='font-semibold text-foreground'>{currentPage}</span> dari{' '}
                <span className='font-semibold text-foreground'>{totalPages}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className='gap-1 h-8 text-xs border-none bg-background/80 dark:bg-background/20 hover:bg-background text-foreground rounded-xl shadow-none'
                >
                  <ChevronLeft className='size-3.5' />
                  Sebelumnya
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className='gap-1 h-8 text-xs border-none bg-background/80 dark:bg-background/20 hover:bg-background text-foreground rounded-xl shadow-none'
                >
                  Selanjutnya
                  <ChevronRight className='size-3.5' />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Main>

      {/* Modal Form Tambah / Edit */}
      <MenuFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedMenu={selectedMenu}
        kategoriList={kategoriList}
        onSuccess={loadData}
      />

      {/* Alert Dialog Konfirmasi Nonaktifkan Menu */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className='border-none rounded-2xl shadow-none max-w-md bg-card'>
          <AlertDialogHeader>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
                <AlertTriangle className='size-5' />
              </div>
              <AlertDialogTitle className='text-lg font-bold'>Nonaktifkan Menu?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className='space-y-2 pt-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menonaktifkan menu{' '}
                <strong className='text-foreground'>{activeDeleteTarget?.nama}</strong>?
              </p>
              <p className='text-xs text-muted-foreground'>
                Menu yang dinonaktifkan akan <strong>otomatis disembunyikan</strong> dari layar
                kasir POS dan tidak dapat dipesan lagi. Data riwayat penjualan yang sudah ada tetap
                tersimpan aman.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-2.5 pt-2'>
            <AlertDialogCancel
              disabled={isDeleting}
              className='border-none bg-muted/70 dark:bg-muted/30 text-foreground hover:bg-muted rounded-xl shadow-none'
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className='border-none rounded-xl shadow-none bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold'
            >
              {isDeleting ? 'Memproses...' : 'Ya, Nonaktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
