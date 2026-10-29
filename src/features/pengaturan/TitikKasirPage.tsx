import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Store,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  MonitorCheck,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { usePengaturanStore } from '@/stores/usePengaturanStore'
import { pengaturanApi } from './api/pengaturan-api'
import { TitikKasirFormModal } from './TitikKasirFormModal'
import type { TitikKasir, TitikKasirFormValues } from './types'

export const TitikKasirPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    activeTitikKasirId,
    setActiveTitikKasirId,
    fetchTitikKasir,
  } = usePengaturanStore()

  const [titikList, setTitikList] = useState<TitikKasir[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AKTIF' | 'NONAKTIF'>('ALL')

  // Modal Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TitikKasir | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete Dialog State
  const [deletingItem, setDeletingItem] = useState<TitikKasir | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await pengaturanApi.getTitikKasirList()
      setTitikList(data)
      await fetchTitikKasir()
    } catch {
      toast.error('Gagal memuat daftar titik kasir')
    } finally {
      setLoading(false)
    }
  }, [fetchTitikKasir])

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const data = await pengaturanApi.getTitikKasirList()
        if (isMounted) {
          setTitikList(data)
          setLoading(false)
        }
        await fetchTitikKasir()
      } catch {
        if (isMounted) {
          toast.error('Gagal memuat daftar titik kasir')
          setLoading(false)
        }
      }
    }

    init()
    return () => {
      isMounted = false
    }
  }, [fetchTitikKasir])

  // Filtered List
  const filteredList = useMemo(() => {
    return titikList.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchSearch) return false

      if (statusFilter === 'AKTIF') return item.aktif
      if (statusFilter === 'NONAKTIF') return !item.aktif

      return true
    })
  }, [titikList, searchQuery, statusFilter])

  // Stat metrics
  const totalCount = titikList.length
  const activeCount = titikList.filter((t) => t.aktif).length
  const inactiveCount = totalCount - activeCount
  const currentPos = titikList.find((t) => t.id === activeTitikKasirId)

  // Handlers CRUD
  const handleOpenCreate = () => {
    setEditingItem(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (item: TitikKasir) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (values: TitikKasirFormValues) => {
    try {
      setIsSubmitting(true)
      if (editingItem) {
        await pengaturanApi.updateTitikKasir(editingItem.id, values)
        toast.success(`Titik kasir "${values.nama}" berhasil diperbarui`)
      } else {
        const created = await pengaturanApi.createTitikKasir(values)
        toast.success(`Titik kasir baru "${created.nama}" berhasil dibuat`)
      }
      setIsFormOpen(false)
      setEditingItem(null)
      await loadData()
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } }
      const msg = errorObj.response?.data?.message || 'Gagal menyimpan titik kasir'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleAktif = async (item: TitikKasir) => {
    try {
      const newStatus = !item.aktif
      await pengaturanApi.toggleTitikKasirAktif(item.id, newStatus)
      toast.success(
        `Titik kasir "${item.nama}" ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`
      )
      await loadData()
    } catch {
      toast.error('Gagal memperbarui status titik kasir')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return
    try {
      setIsDeleting(true)
      await pengaturanApi.deleteTitikKasir(deletingItem.id)
      toast.success(`Titik kasir "${deletingItem.nama}" berhasil dinonaktifkan/dihapus`)
      setDeletingItem(null)
      await loadData()
    } catch {
      toast.error('Gagal menghapus titik kasir')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectForPos = (item: TitikKasir) => {
    setActiveTitikKasirId(item.id)
    toast.success(
      `Titik kasir aktif POS diubah menjadi "${item.nama}" (${item.kode})`
    )
  }

  return (
    <>
      <Header>
        <div className='flex w-full items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground text-xs font-semibold uppercase tracking-wider'>
              Pengaturan Kantin
            </span>
            <span className='text-muted-foreground text-xs'>/</span>
            <span className='text-xs font-medium'>Manajemen Titik Kasir</span>
          </div>
          <div className='flex items-center gap-2'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main fixed>
        <div className='flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6'>
          {/* Header Title & Nav Tabs */}
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
                Manajemen Titik Kasir
              </h1>
            </div>

            {/* Quick Action Button */}
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                onClick={handleOpenCreate}
                className='h-9 gap-1.5 text-xs font-semibold'
              >
                <Plus className='h-4 w-4' />
                <span>Tambah Titik Kasir</span>
              </Button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className='grid gap-4 grid-cols-2 md:grid-cols-4'>
            <Card className='border-0'>
              <CardHeader className='pb-2 pt-4 px-4'>
                <CardDescription className='text-xs font-medium'>
                  Total Perangkat
                </CardDescription>
                <CardTitle className='text-2xl font-bold font-mono'>
                  {totalCount}
                </CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3 text-[11px] text-muted-foreground'>
                <span>Titik kasir terdaftar</span>
              </CardContent>
            </Card>

            <Card className='border-0'>
              <CardHeader className='pb-2 pt-4 px-4'>
                <CardDescription className='text-xs font-medium'>
                  Titik Kasir Aktif
                </CardDescription>
                <CardTitle className='text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400'>
                  {activeCount}
                </CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3 text-[11px] text-muted-foreground'>
                <span>Dapat dipilih di POS</span>
              </CardContent>
            </Card>

            <Card className='border-0'>
              <CardHeader className='pb-2 pt-4 px-4'>
                <CardDescription className='text-xs font-medium'>
                  Nonaktif / Perawatan
                </CardDescription>
                <CardTitle className='text-2xl font-bold font-mono text-muted-foreground'>
                  {inactiveCount}
                </CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3 text-[11px] text-muted-foreground'>
                <span>Sementara dimatikan</span>
              </CardContent>
            </Card>

            <Card className='border-0'>
              <CardHeader className='pb-2 pt-4 px-4'>
                <CardDescription className='text-xs font-medium'>
                  Kasir POS Aktif
                </CardDescription>
                <CardTitle className='text-sm font-bold truncate text-foreground'>
                  {currentPos ? currentPos.nama : 'Belum dipilih'}
                </CardTitle>
              </CardHeader>
              <CardContent className='px-4 pb-3 text-[11px] text-muted-foreground flex items-center justify-between'>
                <span className='font-mono font-semibold text-foreground'>
                  {currentPos ? currentPos.kode : '-'}
                </span>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => navigate({ to: '/kasir' })}
                  className='h-6 px-1.5 text-[10px] text-primary hover:text-primary'
                >
                  Buka POS
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Card: Tabel Titik Kasir */}
          <Card>
            <CardHeader className='border-b bg-card/50 pb-4'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle className='text-base font-bold'>
                    Daftar Perangkat Titik Kasir
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    Tabel daftar titik kasir, kode registrasi perangkat, dan status
                    keaktifannya.
                  </CardDescription>
                </div>

                {/* Toolbar Filters */}
                <div className='flex items-center gap-2'>
                  <div className='relative w-full sm:w-56'>
                    <Search className='absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      placeholder='Cari nama atau kode...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='h-8 pl-8 text-xs'
                    />
                  </div>

                  <Select
                    value={statusFilter}
                    onValueChange={(val) =>
                      setStatusFilter(val as 'ALL' | 'AKTIF' | 'NONAKTIF')
                    }
                  >
                    <SelectTrigger className='h-8 w-28 text-xs'>
                      <SelectValue placeholder='Status' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='ALL' className='text-xs'>
                        Semua Status
                      </SelectItem>
                      <SelectItem value='AKTIF' className='text-xs'>
                        Hanya Aktif
                      </SelectItem>
                      <SelectItem value='NONAKTIF' className='text-xs'>
                        Hanya Nonaktif
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/30'>
                      <TableHead className='w-12 text-center text-xs'>ID</TableHead>
                      <TableHead className='text-xs font-semibold'>
                        Nama Titik Kasir
                      </TableHead>
                      <TableHead className='text-xs font-semibold'>
                        Kode Perangkat
                      </TableHead>
                      <TableHead className='text-xs font-semibold text-center'>
                        Status Operasional
                      </TableHead>
                      <TableHead className='text-xs font-semibold'>
                        Status di POS Klien
                      </TableHead>
                      <TableHead className='text-xs font-semibold text-right'>
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className='h-32 text-center text-xs text-muted-foreground'
                        >
                          <div className='flex items-center justify-center gap-2'>
                            <RefreshCw className='h-4 w-4 animate-spin text-primary' />
                            <span>Memuat data titik kasir...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className='h-32 text-center text-xs text-muted-foreground'
                        >
                          <div className='flex flex-col items-center justify-center gap-1.5'>
                            <Store className='h-6 w-6 text-muted-foreground/60' />
                            <span>Tidak ada data titik kasir yang sesuai</span>
                            {searchQuery && (
                              <Button
                                variant='link'
                                size='sm'
                                onClick={() => {
                                  setSearchQuery('')
                                  setStatusFilter('ALL')
                                }}
                                className='h-auto p-0 text-xs'
                              >
                                Bersihkan filter pencarian
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map((item) => {
                        const isCurrentActivePos = item.id === activeTitikKasirId

                        return (
                          <TableRow key={item.id} className='hover:bg-muted/40'>
                            <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                              #{item.id}
                            </TableCell>

                            <TableCell>
                              <div className='flex items-center gap-2'>
                                <div className='flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground'>
                                  <Store className='h-4 w-4' />
                                </div>
                                <div>
                                  <p className='text-sm font-semibold text-foreground'>
                                    {item.nama}
                                  </p>
                                  <p className='text-[11px] text-muted-foreground'>
                                    ID Tenant: {item.sekolahId}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant='secondary'
                                className='border-0 bg-muted/80 font-mono text-xs font-semibold text-foreground'
                              >
                                {item.kode}
                              </Badge>
                            </TableCell>

                            <TableCell className='text-center'>
                              <div className='flex items-center justify-center gap-2'>
                                <Switch
                                  checked={item.aktif}
                                  onCheckedChange={() => handleToggleAktif(item)}
                                  title={`Klik untuk ${item.aktif ? 'menonaktifkan' : 'mengaktifkan'}`}
                                />
                                <Badge
                                  variant={item.aktif ? 'default' : 'secondary'}
                                  className={
                                    item.aktif
                                      ? 'bg-emerald-600 hover:bg-emerald-600 text-[10px]'
                                      : 'text-[10px]'
                                  }
                                >
                                  {item.aktif ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                              </div>
                            </TableCell>

                            <TableCell>
                              {isCurrentActivePos ? (
                                <Badge
                                  variant='default'
                                  className='gap-1 border-0 bg-primary/10 text-primary hover:bg-primary/10 text-[11px]'
                                >
                                  <MonitorCheck className='h-3 w-3 text-primary' />
                                  <span>Sedang Dipakai</span>
                                </Badge>
                              ) : item.aktif ? (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleSelectForPos(item)}
                                  className='h-7 text-xs text-muted-foreground hover:text-foreground'
                                >
                                  Pilih untuk POS
                                </Button>
                              ) : (
                                <span className='text-xs text-muted-foreground'>
                                  -
                                </span>
                              )}
                            </TableCell>

                            <TableCell className='text-right'>
                              <div className='flex items-center justify-end gap-1'>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => handleOpenEdit(item)}
                                  className='h-7 w-7'
                                  title='Edit titik kasir'
                                >
                                  <Edit2 className='h-3.5 w-3.5' />
                                </Button>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => setDeletingItem(item)}
                                  className='h-7 w-7 text-destructive hover:bg-destructive/10'
                                  title='Hapus titik kasir'
                                >
                                  <Trash2 className='h-3.5 w-3.5' />
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
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Modal Formulir Create / Edit Titik Kasir */}
      <TitikKasirFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingItem}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Dialog Konfirmasi Hapus Titik Kasir */}
      <AlertDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className='flex items-center gap-2 text-destructive'>
              <AlertTriangle className='h-5 w-5' />
              <AlertDialogTitle>Hapus Titik Kasir?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className='text-xs'>
              Apakah Anda yakin ingin menonaktifkan / menghapus titik kasir{' '}
              <strong>"{deletingItem?.nama}"</strong> (Kode:{' '}
              <code>{deletingItem?.kode}</code>)?
              <br />
              Titik kasir ini tidak akan dapat digunakan oleh kasir lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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

export default TitikKasirPage
