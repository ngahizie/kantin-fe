import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Boxes,
  History,
  Image as ImageIcon,
  Loader2,
  Package,
  Pencil,
  Tag,
  User,
  Wallet,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { HeaderActions, HeaderBreadcrumb } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime, formatNumber, formatRupiah } from '@/lib/formatters'
import { stokApi } from '../stok/api/stok-api'
import type { RiwayatStokItem } from '../stok/types'
import { katalogApi } from './api/katalog-api'
import { MenuFormModal } from './MenuFormModal'
import type { KategoriItem, MenuItem } from './types'

interface MenuDetailContentProps {
  menuId: string
  idMenu: number
  idValid: boolean
}

/**
 * Halaman detail satu menu katalog beserta riwayat mutasi stok.
 *
 * Mengambil data terkini langsung dari `GET /api/katalog/menu/{menuId}` dan
 * riwayat mutasi stok dari `GET /api/stok/riwayat?menuId={menuId}`.
 */
export function MenuDetailPage() {
  const { menuId } = useParams({ from: '/_authenticated/menu/$menuId' })
  const idMenu = Number(menuId)
  const idValid = Number.isInteger(idMenu) && idMenu > 0

  return (
    <MenuDetailContent
      key={menuId}
      menuId={menuId}
      idMenu={idMenu}
      idValid={idValid}
    />
  )
}

function MenuDetailContent({ menuId, idMenu, idValid }: MenuDetailContentProps) {
  const navigate = useNavigate()

  const [menu, setMenu] = useState<MenuItem | null>(null)
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([])
  const [kategoriError, setKategoriError] = useState<string | null>(null)
  const [loading, setLoading] = useState(idValid)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fotoGagal, setFotoGagal] = useState(false)

  // Riwayat mutasi stok per item
  const [riwayatStok, setRiwayatStok] = useState<RiwayatStokItem[]>([])
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)

  const [versiMuat, setVersiMuat] = useState(0)

  useEffect(() => {
    if (!idValid) return
    let masihAktif = true

    void (async () => {
      try {
        setLoading(true)
        setLoadingRiwayat(true)

        const [detail, hasilKategori, riwayatRes] = await Promise.all([
          katalogApi.getMenuDetail(idMenu),
          katalogApi
            .getKategoriList()
            .then((list) => ({ ok: true as const, list }))
            .catch((err: unknown) => ({
              ok: false as const,
              list: [] as KategoriItem[],
              err,
            })),
          stokApi
            .getRiwayatStok({ menuId: idMenu, ukuran: 50 })
            .catch(() => ({ items: [] as RiwayatStokItem[] })),
        ])

        if (!masihAktif) return
        setMenu(detail)
        setFotoGagal(false)
        setKategoriList(hasilKategori.list)
        setKategoriError(
          hasilKategori.ok
            ? null
            : 'Daftar kategori gagal dimuat, jadi nama kategori belum bisa ditampilkan dan menu belum bisa diubah.'
        )
        setRiwayatStok(riwayatRes.items || [])
        setError(null)
      } catch (err) {
        if (!masihAktif) return
        setMenu(null)
        setRiwayatStok([])
        const status = (err as { response?: { status?: number } })?.response?.status
        const pesanMentah = err instanceof Error ? err.message : ''
        setError(
          status === 404 || pesanMentah.includes('404')
            ? 'Menu dengan nomor ini tidak ditemukan. Mungkin sudah dihapus atau tautannya salah.'
            : pesanMentah || 'Menu tidak dapat dimuat'
        )
      } finally {
        if (masihAktif) {
          setLoading(false)
          setLoadingRiwayat(false)
        }
      }
    })()

    return () => {
      masihAktif = false
    }
  }, [idMenu, idValid, versiMuat])

  const muatUlang = () => {
    if (!idValid) return
    setLoading(true)
    setVersiMuat((v) => v + 1)
  }

  const getJenisBadgeClass = (jenis: string, arah: string) => {
    switch (jenis) {
      case 'BARANG_MASUK':
      case 'OPNAME_MASUK':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
      case 'PENJUALAN':
        return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
      case 'BARANG_RUSAK':
        return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
      case 'PENJUALAN_VOID':
      case 'OPNAME_KELUAR':
        return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
      case 'BARANG_MASUK_PEMBALIK':
        return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
      default:
        return arah === 'MASUK'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-border bg-muted/50 text-muted-foreground'
    }
  }

  const pesanGalat = idValid
    ? error
    : `Nomor menu "${menuId}" tidak valid. Alamat halaman harus berisi angka, misalnya /menu/4.`
  const kategoriSiap = kategoriList.length > 0
  const fotoSrc =
    menu?.fotoUrl && !fotoGagal ? katalogApi.getImageUrl(menu.fotoUrl) : ''

  const kategoriNama =
    kategoriList.find((k) => k.id === menu?.kategoriId)?.nama ?? '—'
  const habis = (menu?.stokBerjalan ?? 0) <= 0
  const menipis =
    !habis && (menu?.stokBerjalan ?? 0) <= (menu?.stokMinimum ?? 0)

  return (
    <>
      <Header fixed>
        <HeaderBreadcrumb section='KATALOG' title='Detail Menu' />
        <HeaderActions />
      </Header>

      <Main className='space-y-6'>
        {/* Top bar & actions */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Detail Menu
            </h1>
            <p className='text-sm text-muted-foreground'>
              Informasi harga jual, kategori, barcode, dan stok berjalan terkini dari server.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigate({ to: '/menu' })}
              className='gap-1.5'
            >
              <ArrowLeft className='size-4' />
              Kembali
            </Button>
            <Button
              size='sm'
              onClick={() => setIsModalOpen(true)}
              disabled={!idValid || !menu || !kategoriSiap}
              title={
                kategoriSiap
                  ? 'Ubah menu'
                  : 'Daftar kategori belum siap — menu tidak bisa diubah'
              }
              className='gap-1.5 font-semibold'
            >
              <Pencil className='size-4' />
              Ubah Menu
            </Button>
          </div>
        </div>

        {kategoriError && menu && (
          <div className='flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300'>
            <AlertTriangle className='mt-0.5 size-4 shrink-0' />
            <div className='space-y-1'>
              <p>{kategoriError}</p>
              <Button
                variant='ghost'
                size='sm'
                onClick={muatUlang}
                className='h-7 rounded-lg px-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/15 dark:text-amber-300'
              >
                Muat ulang
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <Card>
            <CardContent className='p-6'>
              <div className='flex flex-col gap-6 sm:flex-row'>
                <Skeleton className='size-44 rounded-xl' />
                <div className='flex-1 space-y-3'>
                  <Skeleton className='h-7 w-48' />
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-10 w-40' />
                  <Skeleton className='h-4 w-56' />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && pesanGalat && (
          <Card>
            <CardContent className='flex flex-col items-center gap-3 p-10 text-center'>
              <div className='rounded-full bg-destructive/10 p-3'>
                <AlertTriangle className='size-6 text-destructive' />
              </div>
              <div className='space-y-1'>
                <p className='font-semibold text-foreground'>
                  Menu tidak dapat ditampilkan
                </p>
                <p className='text-sm text-muted-foreground'>{pesanGalat}</p>
              </div>
              <div className='flex gap-2 pt-1'>
                {idValid && (
                  <Button variant='outline' size='sm' onClick={muatUlang}>
                    Coba lagi
                  </Button>
                )}
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => navigate({ to: '/menu' })}
                >
                  Kembali ke daftar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !pesanGalat && menu && (
          <div className='space-y-6'>
            {/* Info Menu Grid */}
            <div className='grid gap-6 md:grid-cols-[260px_1fr]'>
              {/* Foto & status */}
              <Card className='mx-auto w-full max-w-[260px] md:mx-0 md:max-w-none'>
                <CardContent className='space-y-4 p-5'>
                  <div className='relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted/40'>
                    {fotoSrc ? (
                      <img
                        src={fotoSrc}
                        alt={menu.nama}
                        className='size-full object-cover'
                        onError={() => setFotoGagal(true)}
                      />
                    ) : (
                      <div className='flex size-full items-center justify-center text-muted-foreground'>
                        <ImageIcon className='size-10' />
                      </div>
                    )}
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    {menu.aktif ? (
                      <Badge
                        variant='outline'
                        className='rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                      >
                        Aktif
                      </Badge>
                    ) : (
                      <Badge
                        variant='outline'
                        className='rounded-full border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground'
                      >
                        Nonaktif
                      </Badge>
                    )}
                    {habis && (
                      <Badge
                        variant='outline'
                        className='rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                      >
                        Habis
                      </Badge>
                    )}
                    {menipis && (
                      <Badge
                        variant='outline'
                        className='rounded-full border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                      >
                        Stok menipis
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Rincian Produk */}
              <div className='space-y-6'>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-xl font-bold tracking-tight'>
                      {menu.nama}
                    </CardTitle>
                    {menu.kodeBarcode && (
                      <div className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums'>
                        <Barcode className='size-3.5 shrink-0 opacity-70' />
                        <span>{menu.kodeBarcode}</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className='space-y-5'>
                    <div className='flex items-center gap-2'>
                      <Wallet className='size-4 text-muted-foreground' />
                      <span className='text-2xl font-bold tracking-tight tabular-nums'>
                        {formatRupiah(menu.hargaJual)}
                      </span>
                      <span className='text-sm text-muted-foreground'>
                        / {menu.satuan?.toLowerCase() ?? 'pcs'}
                      </span>
                    </div>

                    <Separator />

                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div className='flex items-start gap-3'>
                        <Tag className='mt-0.5 size-4 text-muted-foreground' />
                        <div>
                          <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                            Kategori
                          </p>
                          <p className='text-sm font-semibold text-foreground'>
                            {kategoriNama}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-start gap-3'>
                        <Package className='mt-0.5 size-4 text-muted-foreground' />
                        <div>
                          <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                            Satuan
                          </p>
                          <p className='text-sm font-semibold text-foreground'>
                            {menu.satuan}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-start gap-3'>
                        <Boxes className='mt-0.5 size-4 text-muted-foreground' />
                        <div>
                          <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                            Stok berjalan
                          </p>
                          <p className='text-sm font-semibold text-foreground tabular-nums'>
                            {formatNumber(menu.stokBerjalan)}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-start gap-3'>
                        <Boxes className='mt-0.5 size-4 text-muted-foreground' />
                        <div>
                          <p className='text-xs uppercase tracking-wide text-muted-foreground'>
                            Stok minimum
                          </p>
                          <p className='text-sm font-semibold text-foreground tabular-nums'>
                            {formatNumber(menu.stokMinimum)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className='rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground'>
                      Data diambil langsung dari server saat halaman dibuka. Stok
                      berubah mengikuti transaksi kasir dan barang masuk.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Card Riwayat Mutasi Stok Menu Ini */}
            <Card className='overflow-hidden'>
              <CardHeader className='pb-3'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                  <div className='space-y-1'>
                    <CardTitle className='text-base font-bold flex items-center gap-2'>
                      <History className='size-4 text-primary' />
                      Riwayat Mutasi Stok Produk
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Histori lengkap pencatatan barang masuk, stok opname, barang rusak, penjualan, dan petugas/aktor yang mencatat.
                    </CardDescription>
                  </div>
                  <Badge variant='outline' className='w-fit text-xs font-mono tabular-nums'>
                    {riwayatStok.length} Catatan
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-muted/50 hover:bg-muted/50 border-b border-border'>
                        <TableHead className='w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground'>No.</TableHead>
                        <TableHead className='w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Waktu</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Jenis Mutasi</TableHead>
                        <TableHead className='text-right w-24 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400'>Masuk</TableHead>
                        <TableHead className='text-right w-24 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400'>Keluar</TableHead>
                        <TableHead className='text-right w-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Saldo Akhir</TableHead>
                        <TableHead className='w-40 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Dicatat Oleh</TableHead>
                        <TableHead className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Alasan / Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingRiwayat ? (
                        <TableRow className='hover:bg-transparent'>
                          <TableCell colSpan={8} className='h-24 text-center'>
                            <div className='flex items-center justify-center gap-2 text-xs text-muted-foreground'>
                              <Loader2 className='size-4 animate-spin' />
                              <span>Memuat riwayat mutasi stok...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : riwayatStok.length === 0 ? (
                        <TableRow className='hover:bg-transparent'>
                          <TableCell colSpan={8} className='h-24 text-center text-xs text-muted-foreground'>
                            Belum ada riwayat pergerakan stok untuk menu ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        riwayatStok.map((item, idx) => {
                          const isMasuk = item.arah === 'MASUK'
                          const aktorDisplay =
                            item.aktorNama ||
                            (item.aktorId ? `Aktor #${item.aktorId}` : 'Sistem')

                          return (
                            <TableRow key={item.id} className='border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors'>
                              <TableCell className='text-center font-mono text-xs text-muted-foreground tabular-nums'>
                                {idx + 1}
                              </TableCell>
                              <TableCell className='text-xs whitespace-nowrap text-muted-foreground tabular-nums'>
                                {formatDateTime(item.waktu)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant='outline'
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getJenisBadgeClass(
                                    item.jenis,
                                    item.arah
                                  )}`}
                                >
                                  {item.jenis.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className='text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums'>
                                {isMasuk ? formatNumber(item.qty) : '-'}
                              </TableCell>
                              <TableCell className='text-right font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums'>
                                {!isMasuk ? formatNumber(item.qty) : '-'}
                              </TableCell>
                              <TableCell className='text-right font-mono font-bold text-foreground tabular-nums'>
                                {formatNumber(item.stokSetelah)}
                              </TableCell>
                              <TableCell className='text-xs font-medium text-foreground truncate max-w-[160px]'>
                                <div className='flex items-center gap-1.5'>
                                  <User className='size-3 text-muted-foreground shrink-0' />
                                  <span className='truncate'>{aktorDisplay}</span>
                                </div>
                              </TableCell>
                              <TableCell className='text-xs text-muted-foreground max-w-xs truncate'>
                                {item.alasan || '-'}
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
        )}

        <MenuFormModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          selectedMenu={menu}
          kategoriList={kategoriList}
          onSuccess={() => {
            setIsModalOpen(false)
            muatUlang()
          }}
        />
      </Main>
    </>
  )
}

