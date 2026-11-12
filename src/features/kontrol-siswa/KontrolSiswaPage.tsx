import { useState, useEffect, useMemo } from 'react'
import {
  PhoneOff,
  Smartphone,
  Sliders,
  CheckCircle2,
  UtensilsCrossed,
  DollarSign,
  Users,
  Loader2,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import { TableToolbar } from '@/components/data-table'
import { formatRupiah } from '@/lib/formatters'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { type KartuSiswaMock } from '@/types/kantin'
import { LimitBlokirForm } from './LimitBlokirForm'

interface RawInfoSiswaItem {
  siswaId?: number
  siswa_id?: number
  id?: number
  nis?: string
  nama?: string
  kelas?: string
  fotoUrl?: string
  foto_url?: string
  saldo?: number
  tidakAktif?: boolean
  tidak_aktif?: boolean
  diblokir?: boolean
  namaOrangTua?: string
  parentName?: string
  teleponOrangTua?: string
  parentPhone?: string
  punyaAplikasi?: boolean
  parentAppRegistered?: boolean
  uid?: string
  rfidUid?: string
}

interface RawKontrolBulkItem {
  siswaId?: number
  diblokir?: boolean
  limitHarian?: number | null
  adaLimit?: boolean
  menuDiblokir?: number[]
  kategoriDiblokir?: number[]
  alasanBlokir?: string | null
}

function getInitials(name?: string): string {
  if (!name) return 'S'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

export function KontrolSiswaPage() {
  const [students, setStudents] = useState<KartuSiswaMock[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [appFilter, setAppFilter] = useState<string>('ALL')
  const [limitFilter, setLimitFilter] = useState<string>('ALL')

  // Selected student for LimitBlokirForm
  const [selectedStudent, setSelectedStudent] = useState<KartuSiswaMock | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadStudentsAndKontrol = async () => {
      setIsLoading(true)
      try {
        const siswaRes = await apiClient.get('/api/siswa', {
          params: { batas: 50 },
        })
        const rawList = Array.isArray(siswaRes.data?.data)
          ? (siswaRes.data.data as RawInfoSiswaItem[])
          : []

        const baseStudents: KartuSiswaMock[] = rawList.map((raw) => {
          const sId = Number(raw.siswaId ?? raw.siswa_id ?? raw.id ?? 0)
          const nis = String(raw.nis ?? '')
          return {
            uid: raw.uid || raw.rfidUid || (nis ? `UID-${nis}` : `UID-${sId}`),
            siswa_id: sId,
            nis,
            nama: String(raw.nama || `Siswa #${sId}`),
            kelas: String(raw.kelas || '-'),
            foto_url: raw.fotoUrl || raw.foto_url || '',
            saldo: Number(raw.saldo ?? 0),
            limit_harian: 0,
            limit_harian_enabled: false,
            belanja_hari_ini: 0,
            is_blocked: Boolean(raw.diblokir ?? raw.tidakAktif ?? raw.tidak_aktif),
            blocked_items: [],
            blocked_categories: [],
            parent_name: raw.namaOrangTua || raw.parentName,
            parent_phone: raw.teleponOrangTua || raw.parentPhone,
            parent_app_registered:
              typeof raw.punyaAplikasi === 'boolean'
                ? raw.punyaAplikasi
                : typeof raw.parentAppRegistered === 'boolean'
                  ? raw.parentAppRegistered
                  : undefined,
          }
        })

        let merged = baseStudents
        const validIds = baseStudents
          .map((s) => s.siswa_id)
          .filter((id) => Number.isFinite(id) && id > 0)

        if (validIds.length > 0) {
          try {
            const bulkRes = await apiClient.get('/api/kontrol-kartu/bulk', {
              params: { siswaIds: validIds.join(',') },
            })
            const bulkItems = Array.isArray(bulkRes.data?.data)
              ? (bulkRes.data.data as RawKontrolBulkItem[])
              : []
            const kontrolBySiswa = new Map<number, RawKontrolBulkItem>()
            for (const item of bulkItems) {
              if (item.siswaId != null) {
                kontrolBySiswa.set(Number(item.siswaId), item)
              }
            }

            merged = baseStudents.map((siswa) => {
              const kontrol = kontrolBySiswa.get(siswa.siswa_id)
              if (!kontrol) return siswa
              const limitNominal = Number(kontrol.limitHarian ?? 0)
              const hasLimit = Boolean(kontrol.adaLimit && limitNominal > 0)
              return {
                ...siswa,
                limit_harian: limitNominal,
                limit_harian_enabled: hasLimit,
                blocked_items: Array.isArray(kontrol.menuDiblokir)
                  ? kontrol.menuDiblokir
                  : [],
                blocked_categories: Array.isArray(kontrol.kategoriDiblokir)
                  ? kontrol.kategoriDiblokir
                  : [],
                is_blocked: Boolean(kontrol.diblokir),
              }
            })
          } catch {
            // Gunakan data dasar siswa jika bulk kontrol belum tersedia
          }
        }

        if (isMounted) {
          setStudents(merged)
        }
      } catch {
        if (isMounted) {
          setStudents([])
          toast.error('Gagal memuat daftar kontrol siswa dari server.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadStudentsAndKontrol()
    return () => {
      isMounted = false
    }
  }, [])



  // KPI Calculations
  const nonAppCount = useMemo(() => {
    return students.filter((s) => !s.parent_app_registered).length
  }, [students])

  const limitActiveCount = useMemo(() => {
    return students.filter((s) => s.limit_harian_enabled !== false && s.limit_harian > 0).length
  }, [students])

  const menuBlockCount = useMemo(() => {
    return students.filter(
      (s) =>
        (s.blocked_items && s.blocked_items.length > 0) ||
        (s.blocked_categories && s.blocked_categories.length > 0)
    ).length
  }, [students])

  // Filtered List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // App Filter
      if (appFilter === 'NON_APP' && s.parent_app_registered) return false
      if (appFilter === 'APP' && !s.parent_app_registered) return false

      // Limit Filter
      if (limitFilter === 'WITH_LIMIT') {
        const hasLimit = s.limit_harian_enabled !== false && s.limit_harian > 0
        if (!hasLimit) return false
      }
      if (limitFilter === 'NO_LIMIT') {
        const hasLimit = s.limit_harian_enabled !== false && s.limit_harian > 0
        if (hasLimit) return false
      }
      if (limitFilter === 'WITH_BLOCK') {
        const hasBlock =
          (s.blocked_items && s.blocked_items.length > 0) ||
          (s.blocked_categories && s.blocked_categories.length > 0)
        if (!hasBlock) return false
      }

      // Search
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        return (
          (s.nama?.toLowerCase() ?? '').includes(q) ||
          (s.nis?.toLowerCase() ?? '').includes(q) ||
          (s.kelas?.toLowerCase() ?? '').includes(q) ||
          Boolean(s.parent_name && s.parent_name.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [students, appFilter, limitFilter, searchQuery])

  const handleSaveSuccess = (updatedStudent: KartuSiswaMock) => {
    setStudents((prev) =>
      prev.map((s) => (s.siswa_id === updatedStudent.siswa_id ? updatedStudent : s))
    )
  }




  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Saldo & Pengawasan' title='Batasan Jajan Siswa' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Title Header */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Batasan Jajan Siswa & Perwalian
            </h1>
            <p className='text-sm text-muted-foreground'>
              Kelola batas jajan harian dan pantangan makanan siswa pemegang kartu RFID.
            </p>
          </div>
        </div>

        {/* KPI Cards Ringkasan */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Total Siswa Terdaftar
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground'>
                <Users className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                {students.length} Siswa
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Siswa aktif pemegang kartu RFID
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Ortu Belum Pasang Aplikasi
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'>
                <PhoneOff className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums'>
                {nonAppCount} Siswa
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Bantuan pengaturan dari pihak sekolah
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Batas Jajan Harian Aktif
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'>
                <DollarSign className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-primary tabular-nums'>
                {limitActiveCount} Siswa
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Membatasi belanja harian siswa di kantin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Pantangan Makanan Aktif
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'>
                <UtensilsCrossed className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-destructive tabular-nums'>
                {menuBlockCount} Siswa
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Pencegahan alergi atau pantangan jajanan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar Pencarian & Filter */}
        <TableToolbar
          searchPlaceholder='Cari nama siswa, NIS, kelas, atau nama orang tua...'
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              title: 'Akun Ortu',
              options: [
                { label: 'Belum Pasang Aplikasi', value: 'NON_APP' },
                { label: 'Sudah Pasang Aplikasi', value: 'APP' },
              ],
              selectedValues: appFilter !== 'ALL' ? [appFilter] : [],
              onSelect: (vals) => setAppFilter(vals[0] || 'ALL'),
              isSingleSelect: true,
            },
            {
              title: 'Pembatasan',
              options: [
                { label: 'Dibatasi Nominal Harian', value: 'WITH_LIMIT' },
                { label: 'Tanpa Batasan Nominal', value: 'NO_LIMIT' },
                { label: 'Ada Pantangan Makanan', value: 'WITH_BLOCK' },
              ],
              selectedValues: limitFilter !== 'ALL' ? [limitFilter] : [],
              onSelect: (vals) => setLimitFilter(vals[0] || 'ALL'),
              isSingleSelect: true,
            },
          ]}
          isFiltered={Boolean(searchQuery || appFilter !== 'ALL' || limitFilter !== 'ALL')}
          onReset={() => {
            setSearchQuery('')
            setAppFilter('ALL')
            setLimitFilter('ALL')
          }}
        />

        {/* Tabel Siswa */}
        <Card className='p-0 gap-0 overflow-hidden'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow className='border-b border-border hover:bg-transparent'>
                    <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                    <TableHead className='w-[240px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Data Siswa</TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Aplikasi Orang Tua</TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Batas Jajan per Hari</TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Pantangan Makanan</TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Saldo Kartu</TableHead>
                    <TableHead className='text-right w-[160px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Pengaturan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-xs'>
                        <div className='flex items-center justify-center gap-2'>
                          <Loader2 className='size-6 animate-spin text-muted-foreground' />
                          <span>Memuat data kontrol siswa...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-xs'>
                        {students.length === 0
                          ? 'Belum ada data siswa.'
                          : 'Tidak ada siswa yang sesuai dengan filter pencarian.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((siswa, idx) => {
                      const hasLimit =
                        siswa.limit_harian_enabled !== false && siswa.limit_harian > 0
                      const blockedCatsCount = siswa.blocked_categories?.length || 0
                      const blockedItemsCount = siswa.blocked_items?.length || 0
                      const hasRestrictions = blockedCatsCount > 0 || blockedItemsCount > 0

                      return (
                        <TableRow key={siswa.siswa_id} className='border-b border-border last:border-b-0 text-xs hover:bg-muted/40'>
                          <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                            {idx + 1}
                          </TableCell>
                          {/* Data Siswa */}
                          <TableCell>
                            <div className='flex items-center gap-3'>
                              <Avatar className='h-10 w-10'>
                                <AvatarImage
                                  src={siswa.foto_url || undefined}
                                  alt={siswa.nama}
                                  className='object-cover'
                                />
                                <AvatarFallback className='text-xs font-semibold'>
                                  {getInitials(siswa.nama)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className='font-bold text-foreground flex items-center gap-1.5'>
                                  {siswa.nama}
                                  {siswa.is_blocked && (
                                    <Badge
                                      variant='outline'
                                      className='rounded-full border px-2 py-0 text-[10px] font-medium text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/60'
                                    >
                                      Kartu Diblokir
                                    </Badge>
                                  )}
                                </p>
                                <p className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                                  NIS: {siswa.nis || '-'} • {siswa.kelas}
                                </p>
                                <p className='text-[10px] text-muted-foreground'>
                                  Ortu: {siswa.parent_name || '-'}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Status Aplikasi Ortu */}
                          <TableCell>
                            {siswa.parent_app_registered ? (
                              <Badge
                                variant='outline'
                                className='rounded-full border px-2.5 py-0.5 text-xs font-medium gap-1 text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/60'
                              >
                                <Smartphone className='h-3 w-3' />
                                <span>Terhubung App</span>
                              </Badge>
                            ) : (
                              <div className='space-y-0.5'>
                                <Badge
                                  variant='outline'
                                  className='rounded-full border px-2.5 py-0.5 text-xs font-medium gap-1 text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/60'
                                >
                                  <PhoneOff className='h-3 w-3' />
                                  <span>Belum Pakai App</span>
                                </Badge>
                                <p className='text-[10px] text-amber-700 dark:text-amber-400 font-medium'>
                                  Perwalian Admin
                                </p>
                              </div>
                            )}
                          </TableCell>

                          {/* Limit Harian */}
                          <TableCell>
                            {hasLimit ? (
                              <div className='space-y-1'>
                                <Badge
                                  variant='outline'
                                  className='rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium tabular-nums text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900/60'
                                >
                                  {formatRupiah(siswa.limit_harian)} / hari
                                </Badge>
                                <div className='text-[10px] text-muted-foreground tabular-nums'>
                                  Belanja hari ini: {formatRupiah(siswa.belanja_hari_ini)}
                                </div>
                              </div>
                            ) : (
                              <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium'>
                                <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                                Tanpa Limit
                              </span>
                            )}
                          </TableCell>

                          {/* Larangan Menu & Kategori */}
                          <TableCell>
                            {hasRestrictions ? (
                              <div className='space-y-1'>
                                <div className='flex flex-wrap gap-1'>
                                  {blockedCatsCount > 0 && (
                                    <Badge
                                      variant='outline'
                                      className='rounded-full border px-2 py-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/60'
                                    >
                                      {blockedCatsCount} Kategori Diblokir
                                    </Badge>
                                  )}
                                  {blockedItemsCount > 0 && (
                                    <Badge
                                      variant='outline'
                                      className='rounded-full border px-2 py-0.5 text-[10px] font-medium text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/60'
                                    >
                                      {blockedItemsCount} Item Spesifik
                                    </Badge>
                                  )}
                                </div>
                                {siswa.catatan_kontrol && (
                                  <p className='text-[10px] text-muted-foreground truncate max-w-[200px] italic'>
                                    "{siswa.catatan_kontrol}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className='text-[11px] text-muted-foreground italic'>
                                Tidak ada larangan menu
                              </span>
                            )}
                          </TableCell>

                          {/* Saldo Digital */}
                          <TableCell>
                            <span className='font-mono font-bold text-foreground text-xs tabular-nums'>
                              {formatRupiah(siswa.saldo)}
                            </span>
                          </TableCell>

                          {/* Aksi */}
                          <TableCell className='text-right'>
                            <div className='flex items-center justify-end'>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => {
                                  setSelectedStudent(siswa)
                                  setIsFormOpen(true)
                                }}
                                className='h-8 text-xs gap-1.5'
                              >
                                <Sliders className='h-3.5 w-3.5' />
                                <span>Atur Limit & Blokir</span>
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

      {/* FORM DIALOG */}
      <LimitBlokirForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        student={selectedStudent}
        onSaveSuccess={handleSaveSuccess}
      />
    </>
  )
}
export default KontrolSiswaPage
