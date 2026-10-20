import { useState, useEffect, useMemo, useRef } from 'react'
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
  const lastDeleteTargetRef = useRef<MenuItem | null>(null)
  if (deleteTarget) {
    lastDeleteTargetRef.current = deleteTarget
  }
  const activeDeleteTarget = deleteTarget || lastDeleteTargetRef.current

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
      const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase())

      // 2. Kategori Filter
      const matchKategori =
        selectedKategoriId === 'all' || String(item.kategoriId) === selectedKategoriId

      // 3. Status Filter
      let matchStatus = true
      if (selectedStatus === 'active') {
        matchStatus = item.aktif === true
      } else if (selectedStatus === 'inactive') {
        matchStatus = item.aktif === false
      } else if (selectedStatus === 'low_stock') {
        matchStatus = item.aktif && item.stokBerjalan <= (item.stokMinimum || 0)
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

      <Main className='p-4 md:p-6 space-y-6'>
        {/* Actions */}
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={loadData}
            disabled={loading}
            className='gap-1.5'
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Button size='sm' onClick={handleAdd} className='gap-1.5'>
            <Plus className='size-4' />
            Tambah Menu Baru
          </Button>
        </div>

        {/* Ringkasan Widgets */}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>Total Menu</p>
              <h3 className='mt-0.5 text-xl font-bold text-foreground'>{stats.total}</h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>Terdaftar di katalog</p>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>Menu Aktif</p>
              <h3 className='mt-0.5 text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                {stats.aktif}
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>Tampil di kasir POS</p>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>Stok Menipis / Habis</p>
              <h3 className='mt-0.5 text-xl font-bold text-amber-600 dark:text-amber-400'>
                {stats.stokMenipis}
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>Perlu restock segera</p>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>Menu Nonaktif</p>
              <h3 className='mt-0.5 text-xl font-bold text-muted-foreground'>
                {stats.nonaktif}
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>Disembunyikan</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls & Search */}
        <Card className='border border-border bg-card'>
          <div className='p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3'>
            <div className='flex flex-1 flex-col sm:flex-row items-center gap-3'>
              {/* Search Bar */}
              <div className='relative w-full sm:w-72'>
                <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
                <Input
                  placeholder='Cari nama menu...'
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className='pl-8 h-9 text-sm'
                />
              </div>

              {/* Filter Kategori */}
              <div className='w-full sm:w-48'>
                <Select
                  value={selectedKategoriId}
                  onValueChange={(val) => {
                    setSelectedKategoriId(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className='h-9 text-xs'>
                    <div className='flex items-center gap-1.5 truncate'>
                      <Tag className='size-3.5 text-muted-foreground' />
                      <SelectValue placeholder='Kategori' />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
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
              <div className='w-full sm:w-44'>
                <Select
                  value={selectedStatus}
                  onValueChange={(val) => {
                    setSelectedStatus(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className='h-9 text-xs'>
                    <div className='flex items-center gap-1.5 truncate'>
                      <Filter className='size-3.5 text-muted-foreground' />
                      <SelectValue placeholder='Status' />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Semua Status</SelectItem>
                    <SelectItem value='active'>Hanya Aktif</SelectItem>
                    <SelectItem value='inactive'>Hanya Nonaktif</SelectItem>
                    <SelectItem value='low_stock'>Stok Menipis (⚠️)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='text-xs text-muted-foreground shrink-0'>
              Menampilkan {filteredMenu.length} menu
            </div>
          </div>

          {/* Tabel Menu */}
          <CardContent className='p-0 overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40'>
                  <TableHead className='w-16 text-center'>Foto</TableHead>
                  <TableHead>Nama Menu</TableHead>
                  <TableHead className='w-36'>Kategori</TableHead>
                  <TableHead className='w-32 text-right'>Harga Jual</TableHead>
                  <TableHead className='w-28 text-center'>Stok Berjalan</TableHead>
                  <TableHead className='w-24 text-center'>Satuan</TableHead>
                  <TableHead className='w-28 text-center'>Stok Min.</TableHead>
                  <TableHead className='w-24 text-center'>Status</TableHead>
                  <TableHead className='w-28 text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className='h-40 text-center text-muted-foreground'>
                      <div className='flex items-center justify-center gap-2'>
                        <RefreshCw className='size-4 animate-spin' />
                        <span>Memuat data katalog menu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedMenu.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className='h-40 text-center text-muted-foreground'>
                      <div className='flex flex-col items-center justify-center gap-1.5'>
                        <UtensilsCrossed className='size-8 text-muted-foreground/40' />
                        <p className='font-medium'>Tidak ada menu ditemukan</p>
                        <p className='text-xs text-muted-foreground'>
                          {searchQuery || selectedKategoriId !== 'all' || selectedStatus !== 'all'
                            ? 'Coba atur ulang filter pencarian Anda'
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
                      <TableRow key={item.id} className='hover:bg-muted/30'>
                        {/* Foto Thumbnail */}
                        <TableCell className='p-2 text-center'>
                          <div className='size-11 rounded-lg border bg-muted/40 overflow-hidden flex items-center justify-center mx-auto shrink-0'>
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
                        <TableCell>
                          <div className='font-medium text-foreground'>{item.nama}</div>
                          <div className='text-[11px] text-muted-foreground'>ID: #{item.id}</div>
                        </TableCell>

                        {/* Kategori */}
                        <TableCell>
                          <Badge
                            variant='outline'
                            className='border-0 bg-muted/60 text-muted-foreground font-normal text-xs'
                          >
                            {kategoriNama}
                          </Badge>
                        </TableCell>

                        {/* Harga Jual */}
                        <TableCell className='text-right font-mono font-semibold text-foreground'>
                          {formatRupiah(item.hargaJual)}
                        </TableCell>

                        {/* Stok Berjalan */}
                        <TableCell className='text-center'>
                          <div className='flex flex-col items-center gap-0.5'>
                            <span
                              className={`font-mono font-semibold text-sm ${
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
                                variant='outline'
                                className='border-0 bg-destructive/15 text-destructive text-[9px] px-1.5 py-0 h-3.5 leading-none font-medium'
                              >
                                Habis
                              </Badge>
                            ) : isStokMenipis ? (
                              <Badge
                                variant='outline'
                                className='border-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] px-1.5 py-0 h-3.5 leading-none font-medium'
                              >
                                Menipis
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* Satuan */}
                        <TableCell className='text-center text-xs font-medium text-muted-foreground uppercase'>
                          {item.satuan || 'PCS'}
                        </TableCell>

                        {/* Stok Minimum */}
                        <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                          {formatNumber(item.stokMinimum)}
                        </TableCell>

                        {/* Status Aktif */}
                        <TableCell className='text-center'>
                          {item.aktif ? (
                            <Badge
                              variant='outline'
                              className='border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium'
                            >
                              Aktif
                            </Badge>
                          ) : (
                            <Badge
                              variant='outline'
                              className='border-0 bg-muted text-muted-foreground text-[11px] font-medium'
                            >
                              Nonaktif
                            </Badge>
                          )}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 text-muted-foreground hover:text-foreground'
                              onClick={() => handleEdit(item)}
                              title='Ubah Menu'
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 text-muted-foreground hover:text-destructive'
                              onClick={() => setDeleteTarget(item)}
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
            <div className='p-4 border-t flex items-center justify-between'>
              <div className='text-xs text-muted-foreground'>
                Halaman <span className='font-semibold text-foreground'>{currentPage}</span> dari{' '}
                <span className='font-semibold text-foreground'>{totalPages}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className='gap-1 h-8 text-xs'
                >
                  <ChevronLeft className='size-3.5' />
                  Sebelumnya
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className='gap-1 h-8 text-xs'
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='size-5' />
              <AlertDialogTitle>Nonaktifkan Menu?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className='space-y-2 pt-2'>
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeleting ? 'Memproses...' : 'Ya, Nonaktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
