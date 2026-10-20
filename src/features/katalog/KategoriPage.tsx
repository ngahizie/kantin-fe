import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo } from 'react'
import {
  Tag,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
  UtensilsCrossed,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as SearchComp } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { katalogApi } from './api/katalog-api'
import { KategoriFormModal } from './KategoriFormModal'
import type { KategoriItem } from './types'

export function KategoriPage() {
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedKategori, setSelectedKategori] = useState<KategoriItem | null>(null)

  // Dialog konfirmasi delete / nonaktifkan
  const [deleteTarget, setDeleteTarget] = useState<KategoriItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await katalogApi.getKategoriList(false)
      setKategoriList(data)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || 'Gagal memuat daftar kategori')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const data = await katalogApi.getKategoriList(false)
        if (isMounted) {
          setKategoriList(data)
          setLoading(false)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err as { message?: string }
          toast.error(error.message || 'Gagal memuat daftar kategori')
          setLoading(false)
        }
      }
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [])

  // Filter kategori berdasarkan search
  const filteredKategori = useMemo(() => {
    return kategoriList.filter((k) =>
      k.nama.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [kategoriList, searchQuery])

  // Metrik statistik
  const stats = useMemo(() => {
    const total = kategoriList.length
    const aktif = kategoriList.filter((k) => k.isActive !== false && k.aktif !== false).length
    const nonaktif = total - aktif
    return { total, aktif, nonaktif }
  }, [kategoriList])

  const handleEdit = (kategori: KategoriItem) => {
    setSelectedKategori(kategori)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedKategori(null)
    setIsModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      await katalogApi.deleteKategori(deleteTarget.id)
      toast.success(`Kategori "${deleteTarget.nama}" berhasil dinonaktifkan`)
      setDeleteTarget(null)
      loadData()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        error.response?.data?.message ||
        error.message ||
        'Gagal menonaktifkan kategori. Pastikan tidak ada menu aktif yang menggunakannya.'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Header fixed>
        <SearchComp showKbd={false} />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='p-4 md:p-6 space-y-6'>
        {/* Header Title & Actions */}
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Manajemen Kategori Menu
            </h1>
            <p className='text-sm text-muted-foreground mt-0.5'>
              Kelola pengelompokan menu makanan, minuman, dan snack untuk kasir dan laporan.
            </p>
          </div>

          <div className='flex items-center gap-2'>
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
            <Button size='sm' onClick={handleAdd} className='gap-1.5 shadow-xs'>
              <Plus className='size-4' />
              Tambah Kategori
            </Button>
          </div>
        </div>

        {/* Ringkasan Widget */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card className='border-0 bg-muted/70 dark:bg-muted/30 shadow-xs transition-all hover:shadow-md'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>Total Kategori</p>
              <h3 className='mt-0.5 text-xl font-bold text-foreground'>{stats.total}</h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>Kelompok menu terdaftar</p>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30 shadow-xs transition-all hover:shadow-md'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>Kategori Aktif</p>
              <h3 className='mt-0.5 text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                {stats.aktif}
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>Aktif di kasir & laporan</p>
            </CardContent>
          </Card>

          <Card className='border-0 bg-muted/70 dark:bg-muted/30 shadow-xs transition-all hover:shadow-md'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium text-muted-foreground'>Nonaktif</p>
              <h3 className='mt-0.5 text-xl font-bold text-muted-foreground'>
                {stats.nonaktif}
              </h3>
              <p className='mt-1 text-[11px] text-muted-foreground'>Tidak digunakan</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table Card */}
        <Card className='border border-border bg-card shadow-xs'>
          <div className='p-4 border-b'>
            <TableToolbar
              searchPlaceholder='Cari nama kategori...'
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              isFiltered={Boolean(searchQuery)}
              onReset={() => setSearchQuery('')}
            >
              <Button size='sm' onClick={handleAdd} className='h-8 gap-1.5 text-xs shadow-xs'>
                <Plus className='size-4' />
                Tambah Kategori
              </Button>
            </TableToolbar>
          </div>

          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40'>
                  <TableHead className='w-16 text-center'>Urutan</TableHead>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead className='w-36 text-center'>Menu Terkait</TableHead>
                  <TableHead className='w-28 text-center'>Status</TableHead>
                  <TableHead className='w-28 text-right'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-32 text-center text-muted-foreground'>
                      <div className='flex items-center justify-center gap-2'>
                        <RefreshCw className='size-4 animate-spin' />
                        <span>Memuat kategori menu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredKategori.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='h-32 text-center text-muted-foreground'>
                      <div className='flex flex-col items-center justify-center gap-1.5'>
                        <Tag className='size-8 text-muted-foreground/40' />
                        <p className='font-medium'>Tidak ada kategori ditemukan</p>
                        <p className='text-xs text-muted-foreground'>
                          {searchQuery
                            ? 'Coba gunakan kata kunci pencarian lainnya'
                            : 'Mulai dengan menambahkan kategori menu baru'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKategori.map((kat) => {
                    const isAktif = kat.isActive !== false && kat.aktif !== false
                    const itemQty = kat.jumlahItem ?? 0

                    return (
                      <TableRow key={kat.id} className='hover:bg-muted/30'>
                        <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                          {kat.urutan ?? kat.id}
                        </TableCell>
                        <TableCell className='font-medium text-foreground'>
                          <div className='flex items-center gap-2'>
                            <span>{kat.nama}</span>
                          </div>
                        </TableCell>
                        <TableCell className='text-center'>
                          <Badge
                            variant='outline'
                            className='border-0 bg-muted/60 text-muted-foreground font-normal text-xs gap-1'
                          >
                            <UtensilsCrossed className='size-3 text-muted-foreground' />
                            <span>{itemQty} menu</span>
                          </Badge>
                        </TableCell>
                        <TableCell className='text-center'>
                          {isAktif ? (
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
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 text-muted-foreground hover:text-foreground'
                              onClick={() => handleEdit(kat)}
                              title='Ubah Kategori'
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 text-muted-foreground hover:text-destructive'
                              onClick={() => setDeleteTarget(kat)}
                              title='Nonaktifkan Kategori'
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
        </Card>
      </Main>

      {/* Modal Form Tambah / Edit */}
      <KategoriFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedKategori={selectedKategori}
        onSuccess={loadData}
      />

      {/* Alert Dialog Konfirmasi Nonaktifkan */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='size-5' />
              <AlertDialogTitle>Nonaktifkan Kategori?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className='space-y-2 pt-2'>
              <p>
                Apakah Anda yakin ingin menonaktifkan kategori{' '}
                <strong className='text-foreground'>{deleteTarget?.nama}</strong>?
              </p>
              {deleteTarget && (deleteTarget.jumlahItem ?? 0) > 0 ? (
                <div className='rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 border border-amber-500/20'>
                  ⚠️ <strong>Perhatian:</strong> Kategori ini saat ini masih memiliki{' '}
                  <strong>{deleteTarget.jumlahItem} menu terkait</strong>. Sesuai aturan sistem,
                  kategori hanya akan <strong>dinonaktifkan</strong> (tidak dihapus permanen) agar
                  riwayat transaksi kasir tetap aman.
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  Kategori yang dinonaktifkan tidak akan muncul lagi di tab kasir POS.
                </p>
              )}
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
