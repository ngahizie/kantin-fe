import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo, useRef, useCallback, useId } from 'react'
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
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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
import {
  MENU_AUTO_REFRESH_INTERVAL_MS,
  getKategoriDeleteBlockedReason,
  mergeKategoriMenuCounts,
  notifyKategoriChanged,
  shouldPauseMenuAutoRefresh,
  subscribeKategoriChanges,
} from './menu-utils'
import type { KategoriItem } from './types'

const CARD_OUTLINE_CLASS =
  'has-outline outline-2 outline-slate-200 dark:outline-slate-800'

const SUMMARY_CARD_CLASS =
  `${CARD_OUTLINE_CLASS} border-none bg-card rounded-2xl shadow-none`

async function fetchKategoriWithMenuCounts(): Promise<KategoriItem[]> {
  const [kategoris, menus] = await Promise.all([
    katalogApi.getKategoriList(false),
    katalogApi.getMenuList(undefined, false).catch(() => null),
  ])
  return mergeKategoriMenuCounts(kategoris, menus)
}

export function KategoriPage() {
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedKategori, setSelectedKategori] = useState<KategoriItem | null>(null)

  // Dialog konfirmasi delete / nonaktifkan
  const [deleteTarget, setDeleteTarget] = useState<KategoriItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeDeleteTarget, setActiveDeleteTarget] = useState<KategoriItem | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [isDocumentHidden, setIsDocumentHidden] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  )

  const syncSourceId = useId()
  const isMountedRef = useRef(true)
  const inFlightCountRef = useRef(0)
  const activeSyncIdRef = useRef(0)
  const mutationEpochRef = useRef(0)
  const lastSyncedAtRef = useRef<Date | null>(null)

  const handleDeleteClick = (kat: KategoriItem) => {
    const blockedReason = getKategoriDeleteBlockedReason(kat)
    if (blockedReason) {
      toast.error(blockedReason)
      return
    }
    setDeleteTarget(kat)
    setActiveDeleteTarget(kat)
  }

  const isAutoRefreshPaused = shouldPauseMenuAutoRefresh({
    isModalOpen,
    hasDeleteTarget: Boolean(deleteTarget),
    isDeleting,
    togglingId,
    isDocumentHidden,
  })

  const commitKategoriData = useCallback((data: KategoriItem[]) => {
    setKategoriList(data)
    lastSyncedAtRef.current = new Date()
  }, [])

  // Sinkronisasi latar belakang & pasca-mutasi tanpa mengganggu tampilan tabel dengan loading penuh
  const syncKategori = useCallback(
    async (force = false) => {
      if (!force && inFlightCountRef.current > 0) return

      inFlightCountRef.current += 1
      const syncId = ++activeSyncIdRef.current
      const requestEpoch = mutationEpochRef.current

      try {
        const data = await fetchKategoriWithMenuCounts()
        if (!isMountedRef.current || syncId !== activeSyncIdRef.current) return
        if (!force && requestEpoch !== mutationEpochRef.current) return

        commitKategoriData(data)
      } catch {
        // Abaikan kegagalan sinkronisasi latar belakang agar tidak mengganggu antarmuka
      } finally {
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1)
      }
    },
    [commitKategoriData]
  )

  useEffect(() => {
    isMountedRef.current = true
    const init = async () => {
      inFlightCountRef.current += 1
      const syncId = ++activeSyncIdRef.current
      try {
        const data = await fetchKategoriWithMenuCounts()
        if (isMountedRef.current && syncId === activeSyncIdRef.current) {
          commitKategoriData(data)
        }
      } catch (err: unknown) {
        if (isMountedRef.current && syncId === activeSyncIdRef.current) {
          const error = err as { message?: string }
          toast.error(error.message || 'Gagal memuat daftar kategori')
        }
      } finally {
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1)
        if (isMountedRef.current && inFlightCountRef.current === 0) {
          setLoading(false)
        }
      }
    }
    void init()
    return () => {
      isMountedRef.current = false
    }
  }, [commitKategoriData])

  // Pantau visibilitas tab agar auto-refresh berhenti saat tab tersembunyi
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.visibilityState === 'hidden'
      setIsDocumentHidden(hidden)

      if (hidden) return

      const pausedWithoutVisibility = shouldPauseMenuAutoRefresh({
        isModalOpen,
        hasDeleteTarget: Boolean(deleteTarget),
        isDeleting,
        togglingId,
        isDocumentHidden: false,
      })
      if (pausedWithoutVisibility) return

      const elapsedMs = lastSyncedAtRef.current
        ? Date.now() - lastSyncedAtRef.current.getTime()
        : Number.POSITIVE_INFINITY
      if (elapsedMs >= MENU_AUTO_REFRESH_INTERVAL_MS) {
        void syncKategori()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isModalOpen, deleteTarget, isDeleting, togglingId, syncKategori])

  // Polling otomatis setiap 30 detik selalu aktif selama tidak dijeda
  useEffect(() => {
    if (isAutoRefreshPaused) return

    const timer = window.setInterval(() => {
      void syncKategori()
    }, MENU_AUTO_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [isAutoRefreshPaused, syncKategori])

  // Dengarkan perubahan kategori dari tab atau komponen lain untuk sinkronisasi otomatis
  useEffect(() => {
    return subscribeKategoriChanges(() => {
      mutationEpochRef.current += 1
      void syncKategori(true)
    }, syncSourceId)
  }, [syncKategori, syncSourceId])

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

  const handleFormSuccess = useCallback(
    async (savedKategori?: KategoriItem) => {
      mutationEpochRef.current += 1
      if (savedKategori && typeof savedKategori === 'object') {
        setKategoriList((prev) => {
          const exists = prev.some((k) => k.id === savedKategori.id)
          if (exists) {
            return prev.map((k) =>
              k.id === savedKategori.id
                ? {
                    ...k,
                    ...savedKategori,
                    jumlahItem: savedKategori.jumlahItem ?? k.jumlahItem,
                  }
                : k
            )
          }
          return [
            ...prev,
            { ...savedKategori, jumlahItem: savedKategori.jumlahItem ?? 0 },
          ]
        })
      }
      notifyKategoriChanged(syncSourceId)
      await syncKategori(true)
    },
    [syncKategori, syncSourceId]
  )

  const handleToggleAktif = async (kat: KategoriItem) => {
    const currentAktif = kat.isActive !== false && kat.aktif !== false
    const nextAktif = !currentAktif
    mutationEpochRef.current += 1
    try {
      setTogglingId(kat.id)
      const updated = await katalogApi.updateKategori(kat.id, {
        nama: kat.nama,
        urutan: kat.urutan ?? 0,
        aktif: nextAktif,
      })
      mutationEpochRef.current += 1
      setKategoriList((prev) =>
        prev.map((k) =>
          k.id === kat.id
            ? {
                ...k,
                ...updated,
                jumlahItem: updated.jumlahItem ?? k.jumlahItem,
                isActive: nextAktif,
                aktif: nextAktif,
              }
            : k
        )
      )
      toast.success(
        nextAktif
          ? `Kategori "${kat.nama}" diaktifkan`
          : `Kategori "${kat.nama}" dinonaktifkan`
      )
      notifyKategoriChanged(syncSourceId)
      await syncKategori(true)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        error.response?.data?.message || error.message || 'Gagal memperbarui status kategori'
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    const target = activeDeleteTarget
    if (!target) return
    const latestTarget = kategoriList.find((k) => k.id === target.id) ?? target
    const blockedReason = getKategoriDeleteBlockedReason(latestTarget)
    if (blockedReason) {
      toast.error(blockedReason)
      setDeleteTarget(null)
      return
    }
    mutationEpochRef.current += 1
    try {
      setIsDeleting(true)
      await katalogApi.deleteKategori(target.id)
      mutationEpochRef.current += 1
      setKategoriList((prev) => prev.filter((k) => k.id !== target.id))
      toast.success(`Kategori "${target.nama}" berhasil dihapus`)
      setDeleteTarget(null)
      notifyKategoriChanged(syncSourceId)
      await syncKategori(true)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        error.response?.data?.message ||
        error.message ||
        'Gagal menghapus kategori. Pastikan tidak ada menu terkait yang menggunakannya.'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-2 overflow-hidden me-auto'>
          <h1 className='text-base sm:text-lg font-bold tracking-tight text-foreground'>
            Manajemen Kategori Menu
          </h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 pb-12'>
        {/* Ringkasan Widget */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card className={SUMMARY_CARD_CLASS}>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Total Kategori</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums'>{stats.total}</h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Kelompok menu terdaftar</p>
            </CardContent>
          </Card>

          <Card className={SUMMARY_CARD_CLASS}>
            <CardContent className='p-4'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Kategori Aktif</p>
              <h3 className='mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums'>
                {stats.aktif}
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>Aktif di kasir & laporan</p>
            </CardContent>
          </Card>

          <Card className={SUMMARY_CARD_CLASS}>
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
        <Card className={`${CARD_OUTLINE_CLASS} border-0 bg-card shadow-xs`}>
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
                <TableRow className='border-none bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'>
                  <TableHead className='w-20 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-6'>
                    No.
                  </TableHead>
                  <TableHead className='border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-2'>
                    Nama Kategori
                  </TableHead>
                  <TableHead className='w-36 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Menu Terkait
                  </TableHead>
                  <TableHead className='w-28 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    Status
                  </TableHead>
                  <TableHead className='w-36 text-right border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider pe-6'>
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className='border-none'>
                    <TableCell colSpan={5} className='h-32 text-center text-muted-foreground border-none px-6'>
                      <div className='flex items-center justify-center gap-2'>
                        <RefreshCw className='size-4 animate-spin' />
                        <span>Memuat kategori menu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredKategori.length === 0 ? (
                  <TableRow className='border-none'>
                    <TableCell colSpan={5} className='h-32 text-center text-muted-foreground border-none px-6'>
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
                  filteredKategori.map((kat, idx) => {
                    const isAktif = kat.isActive !== false && kat.aktif !== false
                    const itemQty = kat.jumlahItem ?? 0
                    const deleteBlockedReason = getKategoriDeleteBlockedReason(kat)
                    const isDeleteDisabled = Boolean(deleteBlockedReason)
                    const deleteButtonTitle = deleteBlockedReason || 'Hapus Kategori'

                    return (
                      <TableRow
                        key={kat.id}
                        className='border-none hover:bg-background/60 dark:hover:bg-background/10 transition-colors'
                      >
                        <TableCell className='text-center border-none py-3.5 text-xs font-bold text-muted-foreground tabular-nums ps-6'>
                          {idx + 1}
                        </TableCell>
                        <TableCell className='border-none py-3.5 font-semibold text-foreground text-sm ps-2'>
                          <div className='flex items-center gap-2'>
                            <span>{kat.nama}</span>
                          </div>
                        </TableCell>
                        <TableCell className='text-center border-none py-3.5'>
                          <Badge
                            variant='secondary'
                            className='rounded-full border-none bg-background/80 dark:bg-background/20 text-foreground font-semibold text-[10px] uppercase tracking-wide px-2.5 py-0.5 shadow-none gap-1'
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
                              className='rounded-full border-none bg-background/80 dark:bg-background/20 text-muted-foreground text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 shadow-none'
                            >
                              Nonaktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className='text-right border-none py-3.5 pe-6'>
                          <div className='flex items-center justify-end gap-1.5'>
                            <Switch
                              checked={isAktif}
                              disabled={togglingId === kat.id}
                              onCheckedChange={() => void handleToggleAktif(kat)}
                              aria-label={isAktif ? `Nonaktifkan ${kat.nama}` : `Aktifkan ${kat.nama}`}
                              title={isAktif ? 'Nonaktifkan Kategori' : 'Aktifkan Kategori'}
                              className='me-1 has-border border border-slate-300 dark:border-slate-700 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:border-emerald-500 dark:data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700 [&_[data-slot=switch-thumb]]:bg-white dark:[&_[data-slot=switch-thumb]]:bg-white'
                            />
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-background/20 shadow-none'
                              onClick={() => handleEdit(kat)}
                              title='Ubah Kategori'
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <span title={deleteButtonTitle} className='inline-flex'>
                              <Button
                                variant='ghost'
                                size='icon'
                                disabled={isDeleteDisabled}
                                className='size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 shadow-none'
                                onClick={() => handleDeleteClick(kat)}
                                aria-label={
                                  isDeleteDisabled
                                    ? deleteButtonTitle
                                    : `Hapus ${kat.nama}`
                                }
                              >
                                <Trash2 className='size-4' />
                              </Button>
                            </span>
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
        onSuccess={handleFormSuccess}
      />

      {/* Alert Dialog Konfirmasi Hapus Kategori */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className='border-none rounded-2xl shadow-none max-w-md bg-card'>
          <AlertDialogHeader>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
                <AlertTriangle className='size-5' />
              </div>
              <AlertDialogTitle className='text-lg font-bold'>
                Hapus Kategori?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className='space-y-2 pt-2 text-xs text-muted-foreground'>
                <p>
                  Apakah Anda yakin ingin menghapus kategori{' '}
                  <strong className='text-foreground'>{activeDeleteTarget?.nama}</strong>?
                </p>
                {activeDeleteTarget && (activeDeleteTarget.jumlahItem ?? 0) > 0 ? (
                  <div className='flex items-start gap-2.5 rounded-xl border-none bg-destructive/10 p-3 text-xs text-destructive shadow-none'>
                    <AlertTriangle className='size-4 shrink-0 mt-0.5' />
                    <span>
                      Kategori ini masih memiliki{' '}
                      <strong>{activeDeleteTarget.jumlahItem} menu terkait</strong> sehingga tidak dapat
                      dihapus. Pindahkan atau hapus menu terkait terlebih dahulu.
                    </span>
                  </div>
                ) : (
                  <p className='text-xs text-muted-foreground'>
                    Kategori yang dihapus akan dihilangkan dari daftar kategori maupun tab kasir POS.
                  </p>
                )}
              </div>
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
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              disabled={isDeleting || Boolean(getKategoriDeleteBlockedReason(activeDeleteTarget))}
              className='border-none rounded-xl shadow-none bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold'
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
