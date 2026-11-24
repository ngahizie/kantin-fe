import { useEffect, useMemo, useState } from 'react'
import {
  CreditCard,
  Info,
  Loader2,
  Pencil,
  Plus,
  Power,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableToolbar } from '@/components/data-table'
import { formatRupiah } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/validation-error'
import { toast } from 'sonner'
import { siswaAdminApi } from './api/siswa-admin-api'
import { PasangKartuModal } from './PasangKartuModal'
import { SiswaFormModal } from './SiswaFormModal'
import type { SiswaManajemenItem } from './types'

function getInitials(nama?: string): string {
  if (!nama) return 'S'
  const parts = nama.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

export function SiswaAdminPage() {
  const [items, setItems] = useState<SiswaManajemenItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [kartuFilter, setKartuFilter] = useState<string>('ALL')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSiswa, setEditingSiswa] = useState<SiswaManajemenItem | null>(null)

  const [kartuSiswa, setKartuSiswa] = useState<SiswaManajemenItem | null>(null)
  const [isKartuOpen, setIsKartuOpen] = useState(false)

  const [confirmDeactivate, setConfirmDeactivate] = useState<SiswaManajemenItem | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    siswaAdminApi
      .list({ limit: 200 })
      .then((list) => {
        if (active) setItems(list)
      })
      .catch((err) => {
        if (active) toast.error(getErrorMessage(err, 'Gagal memuat data siswa'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter === 'AKTIF' && !item.aktif) return false
      if (statusFilter === 'NONAKTIF' && item.aktif) return false
      if (kartuFilter === 'PUNYA' && !item.rfidUid) return false
      if (kartuFilter === 'BELUM' && item.rfidUid) return false

      if (q) {
        const matches =
          item.nama.toLowerCase().includes(q) ||
          item.nis.toLowerCase().includes(q) ||
          Boolean(item.nisn?.toLowerCase().includes(q)) ||
          Boolean(item.kelas?.toLowerCase().includes(q)) ||
          Boolean(item.rfidUid?.toLowerCase().includes(q)) ||
          Boolean(item.namaOrangTua?.toLowerCase().includes(q))
        if (!matches) return false
      }
      return true
    })
  }, [items, searchQuery, statusFilter, kartuFilter])

  const aktifCount = useMemo(() => items.filter((i) => i.aktif).length, [items])
  const kartuCount = useMemo(() => items.filter((i) => Boolean(i.rfidUid)).length, [items])

  const upsertLocalItem = (saved: SiswaManajemenItem) => {
    setItems((prev) => {
      const exists = prev.some((row) => row.siswaId === saved.siswaId)
      if (exists) {
        return prev.map((row) => (row.siswaId === saved.siswaId ? saved : row))
      }
      return [saved, ...prev]
    })
  }

  const handleToggleStatus = async (target: SiswaManajemenItem, nextAktif: boolean) => {
    setUpdatingStatusId(target.siswaId)
    try {
      const updated = await siswaAdminApi.ubahStatus(target.siswaId, nextAktif)
      upsertLocalItem(updated)
      toast.success(
        nextAktif
          ? `Siswa ${updated.nama} berhasil diaktifkan`
          : `Siswa ${updated.nama} dinonaktifkan`
      )
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengubah status siswa'))
    } finally {
      setUpdatingStatusId(null)
      setConfirmDeactivate(null)
    }
  }

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='Saldo & Pengawasan' title='Data Siswa & Kartu' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                Data Siswa &amp; Kartu RFID
              </h1>
              <Badge variant='secondary' className='text-xs'>
                Fitur Sementara
              </Badge>
            </div>
            <p className='text-sm text-muted-foreground'>
              Registrasi sementara data siswa, orang tua/wali, dan kartu RFID untuk operasional kantin.
            </p>
          </div>

          <Button
            type='button'
            onClick={() => {
              setEditingSiswa(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className='mr-2 size-4' />
            Tambah Siswa
          </Button>
        </div>

        <Alert className='border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'>
          <Info className='size-4 text-amber-700 dark:text-amber-300' />
          <AlertTitle>Modul Sementara Sebelum Integrasi Master Admin-BE</AlertTitle>
          <AlertDescription className='text-amber-900/85 dark:text-amber-200/85'>
            Siswa baru selalu dimulai dengan saldo Rp 0. Top-up saldo tetap dilakukan melalui TU agar pembukuan kas tetap akurat.
          </AlertDescription>
        </Alert>

        <div className='grid gap-4 sm:grid-cols-3'>
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
              <div className='text-2xl font-bold tracking-tight tabular-nums'>
                {items.length} Siswa
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Terdaftar pada sekolah aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Siswa Aktif
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'>
                <UserCheck className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight tabular-nums'>
                {aktifCount} Aktif
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                {items.length - aktifCount} siswa nonaktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 gap-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground min-w-0 truncate'>
                Kartu RFID Terpasang
              </CardTitle>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'>
                <CreditCard className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight tabular-nums'>
                {kartuCount} Kartu
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                {items.length - kartuCount} siswa belum memiliki kartu
              </p>
            </CardContent>
          </Card>
        </div>

        <TableToolbar
          searchPlaceholder='Cari nama, NIS, NISN, kelas, UID RFID, atau nama wali...'
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              title: 'Status Siswa',
              options: [
                { label: 'Aktif', value: 'AKTIF' },
                { label: 'Nonaktif', value: 'NONAKTIF' },
              ],
              selectedValues: statusFilter !== 'ALL' ? [statusFilter] : [],
              onSelect: (vals) => setStatusFilter(vals[0] || 'ALL'),
              isSingleSelect: true,
            },
            {
              title: 'Kartu RFID',
              options: [
                { label: 'Sudah Punya Kartu', value: 'PUNYA' },
                { label: 'Belum Punya Kartu', value: 'BELUM' },
              ],
              selectedValues: kartuFilter !== 'ALL' ? [kartuFilter] : [],
              onSelect: (vals) => setKartuFilter(vals[0] || 'ALL'),
              isSingleSelect: true,
            },
          ]}
          isFiltered={Boolean(searchQuery || statusFilter !== 'ALL' || kartuFilter !== 'ALL')}
          onReset={() => {
            setSearchQuery('')
            setStatusFilter('ALL')
            setKartuFilter('ALL')
          }}
        />

        <Card className='p-0 gap-0 overflow-hidden'>
          <CardContent className='p-0'>
            <div
              tabIndex={0}
              role='region'
              aria-label='Daftar data siswa dan kartu RFID'
              className='overflow-x-auto'
            >
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow className='border-b border-border hover:bg-transparent'>
                    <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      No.
                    </TableHead>
                    <TableHead className='min-w-[220px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Siswa
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Orang Tua / Wali
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Kartu RFID
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Saldo
                    </TableHead>
                    <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Status
                    </TableHead>
                    <TableHead className='text-right min-w-[230px] text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-40 text-center'>
                        <div className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
                          <Loader2 className='size-4 animate-spin' />
                          Memuat data siswa...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-40 text-center text-sm text-muted-foreground'>
                        Tidak ada data siswa yang sesuai dengan filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <TableRow key={item.siswaId} className='border-b border-border/60'>
                        <TableCell className='text-center text-xs text-muted-foreground tabular-nums'>
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-3'>
                            <Avatar className='size-9 border'>
                              <AvatarImage
                                src={siswaAdminApi.getFotoUrl(item.fotoUrl)}
                                alt={item.nama}
                              />
                              <AvatarFallback>{getInitials(item.nama)}</AvatarFallback>
                            </Avatar>
                            <div className='min-w-0'>
                              <p className='truncate font-medium text-foreground'>{item.nama}</p>
                              <p className='text-xs text-muted-foreground'>
                                NIS: {item.nis}
                                {item.kelas ? ` • ${item.kelas}` : ''}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.namaOrangTua ? (
                            <div className='text-xs'>
                              <p className='font-medium text-foreground'>
                                {item.namaOrangTua}
                                {item.hubunganOrangTua ? ` (${item.hubunganOrangTua})` : ''}
                              </p>
                              <p className='text-muted-foreground'>
                                {item.teleponOrangTua || '-'}
                              </p>
                            </div>
                          ) : (
                            <span className='text-xs text-muted-foreground'>Belum diisi</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.rfidUid ? (
                            <div className='space-y-0.5'>
                              <Badge variant='secondary' className='font-mono text-xs'>
                                {item.rfidUid}
                              </Badge>
                              {item.nomorKartu && (
                                <p className='text-[11px] text-muted-foreground'>
                                  No: {item.nomorKartu}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge variant='outline' className='text-xs text-muted-foreground'>
                              Belum Terpasang
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className='font-medium tabular-nums'>
                          {formatRupiah(item.saldo)}
                        </TableCell>
                        <TableCell>
                          {item.aktif ? (
                            <Badge className='bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-300'>
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant='destructive' className='bg-destructive/15 text-destructive hover:bg-destructive/20'>
                              Nonaktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-1.5'>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setEditingSiswa(item)
                                setIsFormOpen(true)
                              }}
                            >
                              <Pencil className='mr-1 size-3.5' />
                              Edit
                            </Button>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setKartuSiswa(item)
                                setIsKartuOpen(true)
                              }}
                            >
                              <CreditCard className='mr-1 size-3.5' />
                              Kartu
                            </Button>
                            <Button
                              type='button'
                              variant={item.aktif ? 'ghost' : 'outline'}
                              size='sm'
                              disabled={updatingStatusId === item.siswaId}
                              className={item.aktif ? 'text-destructive hover:text-destructive' : ''}
                              onClick={() => {
                                if (item.aktif) {
                                  setConfirmDeactivate(item)
                                } else {
                                  void handleToggleStatus(item, true)
                                }
                              }}
                            >
                              <Power className='mr-1 size-3.5' />
                              {item.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>

      <SiswaFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        selectedSiswa={editingSiswa}
        onSaved={upsertLocalItem}
      />

      <PasangKartuModal
        open={isKartuOpen}
        onOpenChange={setIsKartuOpen}
        siswa={kartuSiswa}
        onSaved={upsertLocalItem}
      />

      <AlertDialog
        open={Boolean(confirmDeactivate)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeactivate(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <ShieldAlert className='size-5 text-destructive' />
              Nonaktifkan Siswa?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Siswa <strong>{confirmDeactivate?.nama}</strong> ({confirmDeactivate?.nis}) akan ditandai nonaktif dan tidak dapat bertransaksi tap kartu sampai diaktifkan kembali. Riwayat transaksi &amp; saldo tetap aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeactivate) {
                  void handleToggleStatus(confirmDeactivate, false)
                }
              }}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Ya, Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
