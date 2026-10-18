import { useState, useEffect, useMemo } from 'react'
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  UtensilsCrossed,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
        <div className='ms-auto flex items-center space-x-4'>
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
              Tambah Kategori
            </Button>
          </div>
        </div>

        {/* Ringkasan Widget */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Total Kategori</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums'>{stats.total}</h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Kelompok menu terdaftar</p>
            </CardContent>
          </Card>

          <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Kategori Aktif</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                {stats.aktif}
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Aktif di kasir & laporan</p>
            </CardContent>
          </Card>

          <Card className='border-none bg-muted/70 dark:bg-muted/30 rounded-2xl shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Nonaktif</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-muted-foreground tabular-nums'>
                {stats.nonaktif}
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Tidak digunakan</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table Card */}
        <Card className='overflow-hidden rounded-2xl border-none bg-card shadow-none'>
          <div className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative w-full max-w-[280px] sm:w-64'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
              <Input
                placeholder='Cari nama kategori...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-10 border-none bg-muted/60 dark:bg-muted/40 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:bg-muted focus-visible:ring-0 rounded-xl shadow-none'
              />
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => setSearchQuery('')}
                  className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-lg transition-colors'
                  title='Hapus pencarian'
                >
                  <X className='size-3.5' />
                </button>
              )}
            </div>
            <div className='text-xs font-medium text-muted-foreground tabular-nums'>
              Menampilkan {filteredKategori.length} dari {kategoriList.length} kategori
            </div>
          </div>

          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow className='border-none bg-muted/50 dark:bg-muted/20 hover:bg-muted/50'>
                  <TableHead className='w-16 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Urutan
                  </TableHead>
                  <TableHead className='border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Nama Kategori
                  </TableHead>
                  <TableHead className='w-36 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Menu Terkait
                  </TableHead>
                  <TableHead className='w-28 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Status
                  </TableHead>
                  <TableHead className='w-28 text-right border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className='border-none'>
                    <TableCell colSpan={5} className='h-32 text-center text-muted-foreground border-none'>
                      <div className='flex items-center justify-center gap-2'>
                        <RefreshCw className='size-4 animate-spin' />
                        <span>Memuat kategori menu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredKategori.length === 0 ? (
                  <TableRow className='border-none'>
                    <TableCell colSpan={5} className='h-32 text-center text-muted-foreground border-none'>
                      <div className='flex flex-col items-center justify-center gap-1.5'>
                        <Tag className='size-8 text-muted-foreground/40' />
                        <p className='font-semibold text-foreground'>Tidak ada kategori ditemukan</p>
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
                      <TableRow
                        key={kat.id}
                        className='border-none hover:bg-muted/40 dark:hover:bg-muted/10 transition-colors'
                      >
                        <TableCell className='text-center border-none py-3.5 text-xs font-bold text-muted-foreground tabular-nums'>
                          {kat.urutan ?? kat.id}
                        </TableCell>
                        <TableCell className='border-none py-3.5 font-semibold text-foreground text-sm'>
                          <div className='flex items-center gap-2'>
                            <span>{kat.nama}</span>
                          </div>
                        </TableCell>
                        <TableCell className='text-center border-none py-3.5'>
                          <Badge
                            variant='secondary'
                            className='rounded-full border-none bg-muted/80 dark:bg-muted/50 text-foreground font-semibold text-[10px] uppercase tracking-wide px-2.5 py-0.5 shadow-none gap-1'
                          >
                            <UtensilsCrossed className='size-3 text-muted-foreground' />
                            <span className='tabular-nums'>{itemQty} menu</span>
                          </Badge>
                        </TableCell>
                        <TableCell className='text-center border-none py-3.5'>
                          {isAktif ? (
                            <Badge
                              variant='secondary'
                              className='rounded-full border-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 shadow-none'
                            >
                              Aktif
                            </Badge>
                          ) : (
                            <Badge
                              variant='secondary'
                              className='rounded-full border-none bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 shadow-none'
                            >
                              Nonaktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className='text-right border-none py-3.5'>
                          <div className='flex items-center justify-end gap-1'>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 shadow-none'
                              onClick={() => handleEdit(kat)}
                              title='Ubah Kategori'
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-none'
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
        <AlertDialogContent className='border-none rounded-2xl shadow-none max-w-md bg-card'>
          <AlertDialogHeader>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
                <AlertTriangle className='size-5' />
              </div>
              <AlertDialogTitle className='text-lg font-bold'>
                Nonaktifkan Kategori?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className='space-y-2 pt-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menonaktifkan kategori{' '}
                <strong className='text-foreground'>{deleteTarget?.nama}</strong>?
              </p>
              {deleteTarget && (deleteTarget.jumlahItem ?? 0) > 0 ? (
                <div className='flex items-start gap-2.5 rounded-xl border-none bg-amber-500/15 p-3 text-xs text-amber-900 dark:text-amber-200 shadow-none'>
                  <AlertTriangle className='size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5' />
                  <span>
                    <strong>Perhatian:</strong> Kategori ini saat ini masih memiliki{' '}
                    <strong>{deleteTarget.jumlahItem} menu terkait</strong>. Sesuai aturan sistem,
                    kategori hanya akan <strong>dinonaktifkan</strong> (tidak dihapus permanen) agar
                    riwayat transaksi kasir tetap aman.
                  </span>
                </div>
              ) : (
                <p className='text-xs text-muted-foreground'>
                  Kategori yang dinonaktifkan tidak akan muncul lagi di tab kasir POS.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-0 pt-2'>
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
