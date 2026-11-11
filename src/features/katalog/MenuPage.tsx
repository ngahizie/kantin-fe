import { TableToolbar } from '@/components/data-table'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  UtensilsCrossed,
  CheckCircle2,
  EyeOff,
  Plus,
  RefreshCw,
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
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
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
import { katalogApi } from './api/katalog-api'
import { MenuFormModal } from './MenuFormModal'
import {
  MENU_AUTO_REFRESH_INTERVAL_MS,
  matchesMenuSearchQuery,
  shouldPauseMenuAutoRefresh,
  sortMenusNewestFirst,
} from './menu-utils'
import type { MenuItem, KategoriItem } from './types'

const PAGE_SIZE = 10

const CARD_SURFACE_CLASS =
  'has-border border-2 border-slate-200 dark:border-slate-800 bg-card shadow-sm'

const BADGE_TONE_CLASSES = {
  kategori:
    'has-border border border-slate-200 dark:border-slate-800 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
  habis:
    'has-border border border-rose-200 dark:border-rose-800 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  menipis:
    'has-border border border-amber-200 dark:border-amber-800 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  aktif:
    'has-border border border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  nonaktif:
    'has-border border border-slate-200 dark:border-slate-800 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400',
} as const

const SUMMARY_ICON_CLASSES = {
  sky: 'has-border border border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300',
  emerald:
    'has-border border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  amber:
    'has-border border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  slate:
    'has-border border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
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
  const navigate = useNavigate()
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

  // Delete & status toggle states
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeDeleteTarget, setActiveDeleteTarget] = useState<MenuItem | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [isDocumentHidden, setIsDocumentHidden] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  )

  const isMountedRef = useRef(true)
  const inFlightCountRef = useRef(0)
  const activeSyncIdRef = useRef(0)
  const mutationEpochRef = useRef(0)
  const lastSyncedAtRef = useRef<Date | null>(null)

  const handleDeleteClick = (item: MenuItem) => {
    setDeleteTarget(item)
    setActiveDeleteTarget(item)
  }

  const isAutoRefreshPaused = shouldPauseMenuAutoRefresh({
    isModalOpen,
    hasDeleteTarget: Boolean(deleteTarget),
    isDeleting,
    togglingId,
    isDocumentHidden,
  })

  const commitKatalogData = useCallback(
    (menus: MenuItem[], categories: KategoriItem[]) => {
      setMenuList(menus)
      setKategoriList(categories)
      lastSyncedAtRef.current = new Date()
    },
    []
  )

  // Sinkronisasi latar belakang otomatis tanpa mengganggu state tabel/form
  const syncKatalog = useCallback(
    async (force = false) => {
      if (!force && inFlightCountRef.current > 0) return

      inFlightCountRef.current += 1
      const syncId = ++activeSyncIdRef.current
      const requestEpoch = mutationEpochRef.current

      try {
        const { menus, categories } = await fetchKatalogData()
        if (!isMountedRef.current || syncId !== activeSyncIdRef.current) return
        if (!force && requestEpoch !== mutationEpochRef.current) return

        commitKatalogData(menus, categories)
      } catch {
        // Abaikan kegagalan background polling agar tidak mengganggu antarmuka
      } finally {
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1)
      }
    },
    [commitKatalogData]
  )

  useEffect(() => {
    isMountedRef.current = true
    const init = async () => {
      inFlightCountRef.current += 1
      const syncId = ++activeSyncIdRef.current
      try {
        const { menus, categories } = await fetchKatalogData()
        if (isMountedRef.current && syncId === activeSyncIdRef.current) {
          commitKatalogData(menus, categories)
        }
      } catch (err: unknown) {
        if (isMountedRef.current && syncId === activeSyncIdRef.current) {
          const error = err as { message?: string }
          toast.error(error.message || 'Gagal memuat data katalog menu')
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
  }, [commitKatalogData])

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
        void syncKatalog()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isModalOpen, deleteTarget, isDeleting, togglingId, syncKatalog])

  // Polling otomatis setiap 30 detik selalu aktif selama tidak dijeda
  useEffect(() => {
    if (isAutoRefreshPaused) return

    const timer = window.setInterval(() => {
      void syncKatalog()
    }, MENU_AUTO_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [isAutoRefreshPaused, syncKatalog])

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
      <Header fixed className='has-border border-b border-slate-200 dark:border-slate-800'>
        <div className='flex items-center gap-2 overflow-hidden me-auto'>
          <h1 className='text-base sm:text-lg font-bold tracking-tight text-foreground'>
            Katalog Menu Kantin
          </h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 pb-12'>
        {/* Ringkasan Widgets */}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          <Card className={CARD_SURFACE_CLASS}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Menu
              </CardTitle>
              <div className={`flex size-9 items-center justify-center rounded-lg ${SUMMARY_ICON_CLASSES.sky}`}>
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

          <Card className={CARD_SURFACE_CLASS}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Menu Aktif
              </CardTitle>
              <div className={`flex size-9 items-center justify-center rounded-lg ${SUMMARY_ICON_CLASSES.emerald}`}>
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

          <Card className={CARD_SURFACE_CLASS}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Stok Menipis / Habis
              </CardTitle>
              <div
                className={`flex size-9 items-center justify-center rounded-lg ${
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

          <Card className={CARD_SURFACE_CLASS}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Menu Nonaktif
              </CardTitle>
              <div className={`flex size-9 items-center justify-center rounded-lg ${SUMMARY_ICON_CLASSES.slate}`}>
                <EyeOff className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {stats.nonaktif}
              </div>
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground mt-1'>
                <span className='font-semibold text-slate-600 dark:text-slate-400'>
                  Arsip
                </span>
                <span>• Disembunyikan dari POS</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls & Search */}
        <Card className={`${CARD_SURFACE_CLASS} gap-0 py-0 overflow-hidden`}>
          <div className='p-4 has-border border-b border-slate-200 dark:border-slate-800'>
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
                },
              ]}
              isFiltered={Boolean(searchQuery || selectedKategoriId !== 'all' || selectedStatus !== 'all')}
              onReset={() => {
                setSearchQuery('')
                setSelectedKategoriId('all')
                setSelectedStatus('all')
                setCurrentPage(1)
              }}
            >
              <Button size='sm' onClick={handleAdd} className='h-8 gap-1.5 text-xs shadow-xs'>
                <Plus className='size-4' />
                Tambah Menu
              </Button>
            </TableToolbar>
          </div>

          <CardContent className='p-0 overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40 has-border border-b border-slate-200 dark:border-slate-800'>
                  <TableHead className='w-12 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-4'>No.</TableHead>
                  <TableHead className='w-16 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Foto</TableHead>
                  <TableHead className='border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider ps-2'>Nama Menu</TableHead>
                  <TableHead className='w-36 border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Kategori</TableHead>
                  <TableHead className='w-32 text-right border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Harga Jual</TableHead>
                  <TableHead className='w-28 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Stok Berjalan</TableHead>
                  <TableHead className='w-24 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Satuan</TableHead>
                  <TableHead className='w-28 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Stok Min.</TableHead>
                  <TableHead className='w-24 text-center border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Status</TableHead>
                  <TableHead className='w-36 text-right border-none text-xs font-semibold text-muted-foreground uppercase tracking-wider pe-6'>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className='border-none'>
                    <TableCell colSpan={10} className='h-40 text-center text-muted-foreground border-none px-6'>
                      <div className='flex items-center justify-center gap-2'>
                        <RefreshCw className='size-4 animate-spin' />
                        <span>Memuat data katalog menu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredMenu.length === 0 ? (
                  <TableRow className='border-none'>
                    <TableCell colSpan={10} className='h-32 text-center text-muted-foreground border-none px-6'>
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
                        className='hover:bg-muted/30 has-border border-b border-slate-100 dark:border-slate-800/60 transition-colors'
                      >
                        <TableCell className='text-center font-mono text-xs text-muted-foreground border-none py-3.5 ps-4'>
                          {(safeCurrentPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        {/* Foto Thumbnail */}
                        <TableCell className='text-center border-none py-3.5'>
                          <div className='size-11 rounded-xl has-border border border-slate-200 dark:border-slate-800 bg-muted/40 overflow-hidden flex items-center justify-center mx-auto shrink-0 shadow-none'>
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
                          {item.kodeBarcode && (
                            <div className='mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground font-mono tabular-nums'>
                              <Barcode className='size-3 shrink-0 opacity-70' />
                              <span>{item.kodeBarcode}</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Kategori */}
                        <TableCell className='border-none py-3.5'>
                          <Badge
                            variant='outline'
                            className={`rounded-full font-semibold text-[10px] uppercase tracking-wide px-2.5 py-0.5 shadow-none ${BADGE_TONE_CLASSES.kategori}`}
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
                                className={`rounded-full text-[9px] px-2 py-0.5 font-semibold uppercase tracking-wide shadow-none ${BADGE_TONE_CLASSES.habis}`}
                              >
                                Habis
                              </Badge>
                            ) : isStokMenipis ? (
                              <Badge
                                variant='outline'
                                className={`rounded-full text-[9px] px-2 py-0.5 font-semibold uppercase tracking-wide shadow-none ${BADGE_TONE_CLASSES.menipis}`}
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
                              variant='outline'
                              className={`rounded-full text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 shadow-none ${BADGE_TONE_CLASSES.aktif}`}
                            >
                              Aktif
                            </Badge>
                          ) : (
                            <Badge
                              variant='outline'
                              className={`rounded-full text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 shadow-none ${BADGE_TONE_CLASSES.nonaktif}`}
                            >
                              Nonaktif
                            </Badge>
                          )}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className='text-right border-none py-3.5 pe-6'>
                          <div className='flex items-center justify-end gap-1.5'>
                            <Switch
                              checked={item.aktif}
                              disabled={togglingId === item.id}
                              onCheckedChange={() => void handleToggleAktif(item)}
                              aria-label={item.aktif ? `Nonaktifkan ${item.nama}` : `Aktifkan ${item.nama}`}
                              title={item.aktif ? 'Nonaktifkan Menu' : 'Aktifkan Menu'}
                              className='me-1 has-border border border-slate-300 dark:border-slate-700 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:border-emerald-500 dark:data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-700 [&_[data-slot=switch-thumb]]:bg-white dark:[&_[data-slot=switch-thumb]]:bg-white'
                            />
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-lg border-none text-muted-foreground hover:text-foreground hover:bg-muted shadow-none'
                              onClick={() =>
                                navigate({
                                  to: '/menu/$menuId',
                                  params: { menuId: String(item.id) },
                                })
                              }
                              title='Lihat Detail'
                            >
                              <Eye className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-lg border-none text-muted-foreground hover:text-foreground hover:bg-muted shadow-none'
                              onClick={() => handleEdit(item)}
                              title='Ubah Menu'
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-lg border-none text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-none'
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
          {totalPages > 1 && (
            <div className='p-4 has-border border-t border-slate-200 dark:border-slate-800 flex items-center justify-between'>
              <div className='text-xs font-medium text-muted-foreground tabular-nums'>
                Halaman <span className='font-semibold text-foreground'>{safeCurrentPage}</span> dari{' '}
                <span className='font-semibold text-foreground'>{totalPages}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                  disabled={safeCurrentPage === 1}
                  className='gap-1 h-8 text-xs has-border border border-slate-200 dark:border-slate-800 bg-background hover:bg-muted text-foreground rounded-lg shadow-none'
                >
                  <ChevronLeft className='size-3.5' />
                  Sebelumnya
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className='gap-1 h-8 text-xs has-border border border-slate-200 dark:border-slate-800 bg-background hover:bg-muted text-foreground rounded-lg shadow-none'
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
        onSuccess={handleFormSuccess}
      />

      {/* Alert Dialog Konfirmasi Hapus Menu */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className='has-border border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg max-w-md bg-card'>
          <AlertDialogHeader>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-10 items-center justify-center rounded-xl has-border border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'>
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
            <AlertDialogCancel
              disabled={isDeleting}
              className='has-border border border-slate-200 dark:border-slate-800 bg-background text-foreground hover:bg-muted rounded-xl shadow-none'
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className='border-none rounded-xl shadow-none bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 font-semibold'
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
