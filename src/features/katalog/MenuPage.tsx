import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  UtensilsCrossed,
  CheckCircle2,
  EyeOff,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  Barcode,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatRupiah, formatNumber } from '@/lib/formatters'
import {
  getLatestKatalogChangeId,
  subscribeKatalogChanges,
} from '@/lib/katalog-sync'
import { katalogApi } from './api/katalog-api'
import { MenuDetailModal } from './MenuDetailModal'
import { MenuFormModal } from './MenuFormModal'
import {
  matchesMenuSearchQuery,
  shouldPauseMenuAutoRefresh,
  sortMenusNewestFirst,
} from './menu-utils'
import type { MenuItem, KategoriItem } from './types'

const PAGE_SIZE = 10

const BADGE_TONE_CLASSES = {
  kategori:
    'border-border bg-muted/50 text-foreground',
  habis:
    'border-rose-200 dark:border-rose-900/60 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  menipis:
    'border-amber-200 dark:border-amber-900/60 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  aktif:
    'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  nonaktif:
    'border-border bg-muted/50 text-muted-foreground',
} as const

const SUMMARY_ICON_CLASSES = {
  sky: 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
  emerald:
    'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  amber:
    'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  slate:
    'border border-border bg-muted/50 text-muted-foreground',
} as const

async function fetchKatalogData() {
  const [menus, categories] = await Promise.all([
    katalogApi.getMenuList(undefined, false),
    katalogApi.getKategoriList(false),
  ])
  return {
    menus: sortMenusNewestFirst(menus),
    categories,
  }
}

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

  // Modal detail popup state
  const [detailMenuId, setDetailMenuId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Delete & status toggle states
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeDeleteTarget, setActiveDeleteTarget] = useState<MenuItem | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [isDocumentHidden, setIsDocumentHidden] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  )

  const isAutoRefreshPaused = shouldPauseMenuAutoRefresh({
    isModalOpen: isModalOpen || isDetailOpen,
    hasDeleteTarget: Boolean(deleteTarget),
    isDeleting,
    togglingId,
    isDocumentHidden,
  })

  const isMountedRef = useRef(true)
  const inFlightCountRef = useRef(0)
  const activeSyncIdRef = useRef(0)
  const mutationEpochRef = useRef(0)
  const pendingSyncRef = useRef(false)
  const lastSeenChangeIdRef = useRef<string | null>(null)
  const isAutoRefreshPausedRef = useRef(isAutoRefreshPaused)
  const ignoringLocalToggleRef = useRef(false)

  const handleDeleteClick = (item: MenuItem) => {
    setDeleteTarget(item)
    setActiveDeleteTarget(item)
  }

  const commitKatalogData = useCallback(
    (menus: MenuItem[], categories: KategoriItem[]) => {
      setMenuList(menus)
      setKategoriList(categories)
    },
    []
  )

  const syncKatalogRef = useRef<(force?: boolean) => Promise<void>>(
    async () => {}
  )

  // Sinkronisasi latar belakang event-driven tanpa mengganggu state tabel/form
  const syncKatalog = useCallback(
    async (force = false) => {
      const hiddenNow =
        typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (
        !force &&
        (isAutoRefreshPausedRef.current || hiddenNow || inFlightCountRef.current > 0)
      ) {
        return
      }

      pendingSyncRef.current = false
      inFlightCountRef.current += 1
      const syncId = ++activeSyncIdRef.current
      const requestEpoch = mutationEpochRef.current
      const syncChangeId = getLatestKatalogChangeId()
      let succeeded = false

      try {
        const { menus, categories } = await fetchKatalogData()
        if (!isMountedRef.current || syncId !== activeSyncIdRef.current) return
        if (!force && requestEpoch !== mutationEpochRef.current) return

        commitKatalogData(menus, categories)
        lastSeenChangeIdRef.current = syncChangeId
        succeeded = true
      } catch {
        // Abaikan kegagalan sinkronisasi latar belakang agar tidak mengganggu antarmuka
      } finally {
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1)
        const latestId = getLatestKatalogChangeId()
        if (latestId && latestId !== syncChangeId) {
          pendingSyncRef.current = true
        }
        const stillHidden =
          typeof document !== 'undefined' && document.visibilityState === 'hidden'
        if (
          succeeded &&
          isMountedRef.current &&
          inFlightCountRef.current === 0 &&
          pendingSyncRef.current &&
          !isAutoRefreshPausedRef.current &&
          !stillHidden
        ) {
          void syncKatalogRef.current()
        }
      }
    },
    [commitKatalogData]
  )

  useEffect(() => {
    syncKatalogRef.current = syncKatalog
  }, [syncKatalog])

  useEffect(() => {
    isAutoRefreshPausedRef.current = isAutoRefreshPaused
    if (!isAutoRefreshPaused && pendingSyncRef.current) {
      void syncKatalog()
    }
  }, [isAutoRefreshPaused, syncKatalog])

  useEffect(() => {
    isMountedRef.current = true
    const init = async () => {
      pendingSyncRef.current = false
      inFlightCountRef.current += 1
      const syncId = ++activeSyncIdRef.current
      const syncChangeId = getLatestKatalogChangeId()
      let succeeded = false
      try {
        const { menus, categories } = await fetchKatalogData()
        if (isMountedRef.current && syncId === activeSyncIdRef.current) {
          commitKatalogData(menus, categories)
          lastSeenChangeIdRef.current = syncChangeId
          succeeded = true
        }
      } catch (err: unknown) {
        if (isMountedRef.current && syncId === activeSyncIdRef.current) {
          const error = err as { message?: string }
          toast.error(error.message || 'Gagal memuat data katalog menu')
        }
      } finally {
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1)
        const latestId = getLatestKatalogChangeId()
        if (latestId && latestId !== syncChangeId) {
          pendingSyncRef.current = true
        }
        if (isMountedRef.current && inFlightCountRef.current === 0) {
          setLoading(false)
          const stillHidden =
            typeof document !== 'undefined' && document.visibilityState === 'hidden'
          if (
            succeeded &&
            pendingSyncRef.current &&
            !isAutoRefreshPausedRef.current &&
            !stillHidden
          ) {
            void syncKatalog()
          }
        }
      }
    }
    void init()
    return () => {
      isMountedRef.current = false
    }
  }, [commitKatalogData, syncKatalog])

  // Auto-refresh event-driven: hanya menyinkronkan ulang bila ada perubahan
  // (mutasi lokal di app / BroadcastChannel antar tab / perubahan tertunda saat kembali fokus)
  useEffect(() => {
    const checkAndSyncIfChanged = () => {
      const hidden =
        typeof document !== 'undefined' && document.visibilityState === 'hidden'
      setIsDocumentHidden(hidden)
      if (hidden) return

      const latestId = getLatestKatalogChangeId()
      if (latestId && latestId !== lastSeenChangeIdRef.current) {
        pendingSyncRef.current = true
      }

      if (!isAutoRefreshPausedRef.current && pendingSyncRef.current) {
        void syncKatalog()
      }
    }

    const unsubscribe = subscribeKatalogChanges((event) => {
      if (!event.isCrossTab && ignoringLocalToggleRef.current) {
        lastSeenChangeIdRef.current = event.id
        return
      }

      pendingSyncRef.current = true
      const hidden =
        typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (!isAutoRefreshPausedRef.current && !hidden) {
        void syncKatalog()
      }
    })

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || pendingSyncRef.current) {
        checkAndSyncIfChanged()
      } else {
        const latestId = getLatestKatalogChangeId()
        if (latestId && latestId !== lastSeenChangeIdRef.current) {
          checkAndSyncIfChanged()
        }
      }
    }

    document.addEventListener('visibilitychange', checkAndSyncIfChanged)
    window.addEventListener('focus', checkAndSyncIfChanged)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', checkAndSyncIfChanged)
      window.removeEventListener('focus', checkAndSyncIfChanged)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [syncKatalog])

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
      // 1. Search Query (nama menu atau kode barcode)
      const matchSearch = matchesMenuSearchQuery(item, searchQuery)

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
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedMenu = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return filteredMenu.slice(start, start + PAGE_SIZE)
  }, [filteredMenu, safeCurrentPage])

  const handleAdd = () => {
    setSelectedMenu(null)
    setIsModalOpen(true)
  }

  const handleEdit = (menu: MenuItem) => {
    setSelectedMenu(menu)
    setIsModalOpen(true)
  }

  const handleViewDetail = (item: MenuItem) => {
    setDetailMenuId(item.id)
    setIsDetailOpen(true)
  }

  const handleFormSuccess = () => {
    mutationEpochRef.current += 1
    if (!selectedMenu) {
      setCurrentPage(1)
    }
    void syncKatalog(true)
  }

  const handleToggleAktif = async (item: MenuItem) => {
    const nextAktif = !item.aktif
    mutationEpochRef.current += 1
    ignoringLocalToggleRef.current = true
    try {
      setTogglingId(item.id)
      const updated = await katalogApi.updateMenu(item.id, {
        nama: item.nama,
        kodeBarcode: item.kodeBarcode ?? '',
        kategoriId: item.kategoriId ?? null,
        hargaJual: item.hargaJual,
        satuan: item.satuan || 'PCS',
        stokMinimum: item.stokMinimum ?? 0,
        fotoUrl: item.fotoUrl || '',
        aktif: nextAktif,
      })
      mutationEpochRef.current += 1
      setMenuList((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, ...updated, aktif: nextAktif } : m))
      )
      toast.success(
        nextAktif ? `Menu "${item.nama}" diaktifkan` : `Menu "${item.nama}" dinonaktifkan`
      )
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        error.response?.data?.message || error.message || 'Gagal memperbarui status menu'
      toast.error(message)
    } finally {
      ignoringLocalToggleRef.current = false
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    const target = activeDeleteTarget
    if (!target) return
    mutationEpochRef.current += 1
    try {
      setIsDeleting(true)
      await katalogApi.deleteMenu(target.id)
      mutationEpochRef.current += 1
      toast.success(`Menu "${target.nama}" berhasil dihapus`)
      setDeleteTarget(null)
      await syncKatalog(true)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      const message = error.response?.data?.message || error.message || 'Gagal menghapus menu'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Katalog' title='Daftar Menu' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Page Header */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Katalog Menu Kantin
            </h1>
            <p className='text-sm text-muted-foreground'>
              Kelola daftar menu, harga jual, kode barcode, dan status ketersediaan di kasir POS.
            </p>
          </div>
          <Button size='sm' onClick={handleAdd} className='gap-1.5 self-start sm:self-auto font-semibold'>
            <Plus className='size-4' />
            Tambah Menu
          </Button>
        </div>

        {/* Ringkasan Widgets */}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total Menu
              </CardTitle>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${SUMMARY_ICON_CLASSES.sky}`}>
                <UtensilsCrossed className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {stats.total}
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-sky-600 dark:text-sky-400'>
                  Katalog
                </span>
                <span>• Terdaftar di sistem</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Menu Aktif
              </CardTitle>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${SUMMARY_ICON_CLASSES.emerald}`}>
                <CheckCircle2 className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {stats.aktif}
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
                  Tersedia
                </span>
                <span>• Tampil di kasir POS</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Stok Menipis / Habis
              </CardTitle>
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                  stats.stokMenipis === 0
                    ? SUMMARY_ICON_CLASSES.emerald
                    : SUMMARY_ICON_CLASSES.amber
                }`}
              >
                <AlertTriangle className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {stats.stokMenipis}
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span
                  className={`font-semibold ${
                    stats.stokMenipis === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {stats.stokMenipis === 0 ? 'Aman' : 'Perlu Restock'}
                </span>
                <span>
                  • {stats.stokMenipis === 0 ? 'Semua stok di atas minimum' : 'Segera tambah stok'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Menu Nonaktif
              </CardTitle>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${SUMMARY_ICON_CLASSES.slate}`}>
                <EyeOff className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {stats.nonaktif}
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-muted-foreground'>
                  Arsip
                </span>
                <span>• Disembunyikan dari POS</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls & Search */}
        <Card className='gap-0 py-0 overflow-hidden'>
          <div className='p-4 border-b border-border'>
            <TableToolbar
              searchPlaceholder='Cari nama menu atau barcode...'
              searchValue={searchQuery}
              onSearchChange={(val: string) => {
                setSearchQuery(val)
                setCurrentPage(1)
              }}
              filters={[
                {
                  title: 'Kategori',
                  options: kategoriList.map((kat) => ({
                    label: kat.nama,
                    value: String(kat.id),
                  })),
                  selectedValues: selectedKategoriId !== 'all' ? [selectedKategoriId] : [],
                  onSelect: (vals: string[]) => {
                    setSelectedKategoriId(vals[0] || 'all')
                    setCurrentPage(1)
                  },
                  isSingleSelect: true,
                  triggerClassName: 'w-[175px]',
                },
                {
                  title: 'Status',
                  options: [
                    { label: 'Hanya Aktif', value: 'active' },
                    { label: 'Hanya Nonaktif', value: 'inactive' },
                    { label: 'Stok Menipis', value: 'low_stock' },
                  ],
                  selectedValues: selectedStatus !== 'all' ? [selectedStatus] : [],
                  onSelect: (vals: string[]) => {
                    setSelectedStatus(vals[0] || 'all')
                    setCurrentPage(1)
                  },
                  isSingleSelect: true,
                  showSearch: false,
                  triggerClassName: 'w-[160px]',
                },
              ]}
              isFiltered={Boolean(searchQuery || selectedKategoriId !== 'all' || selectedStatus !== 'all')}
              onReset={() => {
                setSearchQuery('')
                setSelectedKategoriId('all')
                setSelectedStatus('all')
                setCurrentPage(1)
              }}
            />
          </div>

          <CardContent className='p-0 min-h-[460px]'>
            <Table className='table-fixed w-full min-w-[1160px]'>
              <TableHeader>
                <TableRow className='bg-muted/50 hover:bg-muted/50 border-b border-border'>
                  <TableHead className='w-14 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-4'>No.</TableHead>
                  <TableHead className='w-16 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Foto</TableHead>
                  <TableHead className='text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-2'>Nama Menu</TableHead>
                  <TableHead className='w-36 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Kategori</TableHead>
                  <TableHead className='w-32 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Harga Jual</TableHead>
                  <TableHead className='w-28 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Stok Berjalan</TableHead>
                  <TableHead className='w-24 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Satuan</TableHead>
                  <TableHead className='w-24 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Stok Min.</TableHead>
                  <TableHead className='w-24 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Status</TableHead>
                  <TableHead className='w-48 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pe-6'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className='hover:bg-transparent border-b-0'>
                    <TableCell colSpan={10} className='h-[420px] text-center text-muted-foreground px-6'>
                      <div className='flex flex-col items-center justify-center gap-2'>
                        <Loader2 className='size-6 animate-spin text-muted-foreground' />
                        <span className='text-xs'>Memuat data katalog menu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredMenu.length === 0 ? (
                  <TableRow className='hover:bg-transparent border-b-0'>
                    <TableCell colSpan={10} className='h-[420px] text-center text-muted-foreground px-6'>
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
                  paginatedMenu.map((item, idx) => {
                    const kategoriNama =
                      kategoriMap.get(item.kategoriId || 0) || 'Tanpa Kategori'
                    const isStokMenipis = item.stokBerjalan <= (item.stokMinimum || 0)
                    const isHabis = item.stokBerjalan <= 0

                    return (
                      <TableRow
                        key={item.id}
                        className='hover:bg-muted/30 border-b border-border last:border-b-0 transition-colors'
                      >
                        <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums py-3.5 ps-4'>
                          {(safeCurrentPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        {/* Foto Thumbnail */}
                        <TableCell className='text-center py-3.5'>
                          <div className='size-11 rounded-xl border border-border bg-muted/40 overflow-hidden flex items-center justify-center mx-auto shrink-0'>
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
                        <TableCell className='py-3.5 ps-2 overflow-hidden'>
                          <div className='font-semibold text-foreground text-sm truncate' title={item.nama}>
                            {item.nama}
                          </div>
                          {item.kodeBarcode && (
                            <div className='mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground font-mono tabular-nums'>
                              <Barcode className='size-3 shrink-0 opacity-70' />
                              <span className='truncate' title={item.kodeBarcode}>
                                {item.kodeBarcode}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Kategori */}
                        <TableCell className='py-3.5 overflow-hidden'>
                          <Badge
                            variant='outline'
                            title={kategoriNama}
                            className={`max-w-full overflow-hidden rounded-full font-medium text-xs px-2.5 py-0.5 ${BADGE_TONE_CLASSES.kategori}`}
                          >
                            <span className='truncate'>{kategoriNama}</span>
                          </Badge>
                        </TableCell>

                        {/* Harga Jual */}
                        <TableCell className='text-right font-semibold text-foreground py-3.5 tabular-nums text-sm'>
                          {formatRupiah(item.hargaJual)}
                        </TableCell>

                        {/* Stok Berjalan */}
                        <TableCell className='text-center py-3.5'>
                          <div className='flex flex-col items-center gap-0.5'>
                            <span
                              className={`font-semibold text-sm tabular-nums ${
                                isHabis
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
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
                                className={`rounded-full text-[10px] px-2 py-0 font-medium uppercase tracking-wide ${BADGE_TONE_CLASSES.habis}`}
                              >
                                Habis
                              </Badge>
                            ) : isStokMenipis ? (
                              <Badge
                                variant='outline'
                                className={`rounded-full text-[10px] px-2 py-0 font-medium uppercase tracking-wide ${BADGE_TONE_CLASSES.menipis}`}
                              >
                                Menipis
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* Satuan */}
                        <TableCell className='text-center text-xs font-semibold text-muted-foreground uppercase py-3.5'>
                          {item.satuan || 'PCS'}
                        </TableCell>

                        {/* Stok Minimum */}
                        <TableCell className='text-center text-xs text-muted-foreground py-3.5 tabular-nums'>
                          {formatNumber(item.stokMinimum)}
                        </TableCell>

                        {/* Status Aktif */}
                        <TableCell className='text-center py-3.5'>
                          {item.aktif ? (
                            <Badge
                              variant='outline'
                              className={`rounded-full text-xs font-medium px-2.5 py-0.5 ${BADGE_TONE_CLASSES.aktif}`}
                            >
                              Aktif
                            </Badge>
                          ) : (
                            <Badge
                              variant='outline'
                              className={`rounded-full text-xs font-medium px-2.5 py-0.5 ${BADGE_TONE_CLASSES.nonaktif}`}
                            >
                              Nonaktif
                            </Badge>
                          )}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className='text-right py-3.5 pe-6'>
                          <div className='flex items-center justify-end gap-1.5'>
                            <Switch
                              checked={item.aktif}
                              disabled={togglingId === item.id}
                              onCheckedChange={() => void handleToggleAktif(item)}
                              aria-label={item.aktif ? `Nonaktifkan ${item.nama}` : `Aktifkan ${item.nama}`}
                              title={item.aktif ? 'Nonaktifkan Menu' : 'Aktifkan Menu'}
                              className='me-1 border border-slate-300 dark:border-slate-700 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:border-emerald-500 dark:data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700 [&_[data-slot=switch-thumb]]:bg-white dark:[&_[data-slot=switch-thumb]]:bg-white'
                            />
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted'
                              onClick={() => handleViewDetail(item)}
                              title='Lihat Detail'
                            >
                              <Eye className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted'
                              onClick={() => handleEdit(item)}
                              title='Ubah Menu'
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-lg text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              onClick={() => handleDeleteClick(item)}
                              title='Hapus Menu'
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
          {!loading && (
            <div className='p-4 border-t border-border flex flex-wrap items-center justify-between gap-2'>
              <div className='text-xs font-medium text-muted-foreground tabular-nums'>
                {filteredMenu.length === 0 ? (
                  'Menampilkan 0 menu'
                ) : (
                  <>
                    Menampilkan{' '}
                    <span className='font-semibold text-foreground'>
                      {(safeCurrentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(safeCurrentPage * PAGE_SIZE, filteredMenu.length)}
                    </span>{' '}
                    dari{' '}
                    <span className='font-semibold text-foreground'>{filteredMenu.length}</span>{' '}
                    menu
                  </>
                )}
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-xs font-medium text-muted-foreground tabular-nums'>
                  Halaman <span className='font-semibold text-foreground'>{safeCurrentPage}</span> dari{' '}
                  <span className='font-semibold text-foreground'>{totalPages}</span>
                </span>
                <div className='flex items-center gap-1.5'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                    disabled={safeCurrentPage === 1}
                    className='gap-1 h-8 text-xs'
                  >
                    <ChevronLeft className='size-3.5' />
                    Sebelumnya
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className='gap-1 h-8 text-xs'
                  >
                    Selanjutnya
                    <ChevronRight className='size-3.5' />
                  </Button>
                </div>
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
        onSuccess={handleFormSuccess}
      />

      {/* Modal Detail Popup */}
      <MenuDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        menuId={detailMenuId}
        kategoriList={kategoriList}
        onEdit={(item) => handleEdit(item)}
      />

      {/* Alert Dialog Konfirmasi Hapus Menu */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'>
                <AlertTriangle className='size-5' />
              </div>
              <AlertDialogTitle className='text-lg font-bold'>Hapus Menu?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className='space-y-2 pt-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menghapus menu{' '}
                <strong className='text-foreground'>{activeDeleteTarget?.nama}</strong>?
              </p>
              <p className='text-xs text-muted-foreground'>
                Menu yang dihapus akan dihilangkan dari daftar katalog maupun layar kasir POS.
                Data riwayat transaksi dan mutasi stok yang sudah tercatat tetap tersimpan aman.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-2.5 pt-2'>
            <AlertDialogCancel disabled={isDeleting}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold'
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
