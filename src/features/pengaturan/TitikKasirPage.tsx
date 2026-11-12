import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Store,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  MonitorCheck,
  AlertTriangle,
  PowerOff,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { TableToolbar } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
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
      <Header fixed>
        <HeaderBreadcrumb section='Pengaturan Kantin' title='Manajemen Titik Kasir' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Header Title & Action */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Manajemen Titik Kasir
            </h1>
            <p className='text-sm text-muted-foreground'>
              Kelola daftar perangkat titik kasir, kode registrasi, dan status operasional.
            </p>
          </div>

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
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total Perangkat
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground'>
                <Store className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {totalCount}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Titik kasir terdaftar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Titik Kasir Aktif
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'>
                <CheckCircle2 className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                {activeCount}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Dapat dipilih di POS
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Nonaktif / Perawatan
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground'>
                <PowerOff className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-muted-foreground tabular-nums'>
                {inactiveCount}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Sementara dimatikan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Kasir POS Aktif
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'>
                <MonitorCheck className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-lg font-bold tracking-tight text-foreground truncate'>
                {currentPos ? currentPos.nama : 'Belum dipilih'}
              </div>
              <div className='flex items-center justify-between gap-2 mt-1'>
                <span className='font-mono text-xs text-muted-foreground tabular-nums'>
                  {currentPos ? currentPos.kode : '-'}
                </span>
                <Button
                  variant='link'
                  size='sm'
                  onClick={() => navigate({ to: '/kasir' })}
                  className='h-auto p-0 text-xs text-primary'
                >
                  Buka POS
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar Pencarian & Filter */}
        <TableToolbar
          searchPlaceholder='Cari nama atau kode titik kasir...'
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              title: 'Status',
              options: [
                { label: 'Hanya Aktif', value: 'AKTIF' },
                { label: 'Hanya Nonaktif', value: 'NONAKTIF' },
              ],
              selectedValues: statusFilter !== 'ALL' ? [statusFilter] : [],
              onSelect: (vals) =>
                setStatusFilter((vals[0] as 'AKTIF' | 'NONAKTIF') || 'ALL'),
              isSingleSelect: true,
            },
          ]}
          isFiltered={Boolean(searchQuery || statusFilter !== 'ALL')}
          onReset={() => {
            setSearchQuery('')
            setStatusFilter('ALL')
          }}
        />

        {/* Main Card: Tabel Titik Kasir */}
        <Card className='p-0 gap-0 overflow-hidden'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow className='border-b border-border hover:bg-transparent'>
                    <TableHead className='w-16 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      ID
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Nama Titik Kasir
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Kode Perangkat
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center'>
                      Status Operasional
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Status di POS Klien
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right'>
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
                          <Loader2 className='size-6 animate-spin text-muted-foreground' />
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
                          {(searchQuery || statusFilter !== 'ALL') && (
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
                        <TableRow key={item.id} className='border-b border-border last:border-b-0 hover:bg-muted/40'>
                          <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                            #{item.id}
                          </TableCell>

                          <TableCell>
                            <div className='flex items-center gap-2.5'>
                              <div className='flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground'>
                                <Store className='h-4 w-4' />
                              </div>
                              <div>
                                <p className='text-sm font-semibold text-foreground'>
                                  {item.nama}
                                </p>
                                <p className='text-[11px] text-muted-foreground tabular-nums'>
                                  ID Tenant: {item.sekolahId}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant='outline'
                              className='rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium text-foreground bg-muted/50 border-border tabular-nums'
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
                                variant='outline'
                                className={
                                  item.aktif
                                    ? 'rounded-full border px-2.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/60'
                                    : 'rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted/50 border-border'
                                }
                              >
                                {item.aktif ? 'Aktif' : 'Nonaktif'}
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell>
                            {isCurrentActivePos ? (
                              <Badge
                                variant='outline'
                                className='gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900/60'
                              >
                                <MonitorCheck className='h-3 w-3' />
                                <span>Sedang Dipakai</span>
                              </Badge>
                            ) : item.aktif ? (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleSelectForPos(item)}
                                className='h-7 text-xs'
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
                                className='h-8 w-8'
                                title='Ubah titik kasir'
                              >
                                <Edit2 className='h-3.5 w-3.5' />
                              </Button>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                onClick={() => setDeletingItem(item)}
                                className='h-8 w-8 text-destructive hover:bg-destructive/10'
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
