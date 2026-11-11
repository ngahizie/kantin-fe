import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  Boxes,
  Image as ImageIcon,
  Package,
  Pencil,
  RefreshCw,
  Tag,
  Wallet,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatRupiah } from '@/lib/formatters'
import { katalogApi } from './api/katalog-api'
import { MenuFormModal } from './MenuFormModal'
import type { KategoriItem, MenuItem } from './types'

interface MenuDetailContentProps {
  menuId: string
  idMenu: number
  idValid: boolean
}

/**
 * Halaman detail satu menu katalog.
 *
 * Memakai `GET /api/katalog/menu/{menuId}` (data tunggal dari server), bukan
 * mengambil dari daftar di halaman sebelumnya — supaya stok dan harga yang
 * tampil selalu yang terbaru saat halaman dibuka.
 *
 * Komponen ini hanya membaca parameter rute lalu menyerahkan sisanya ke
 * `MenuDetailContent` dengan `key={menuId}`. Dengan begitu, saat pengguna
 * berpindah `/menu/4` → `/menu/5`, seluruh state (menu, fotoGagal, error,
 * kategoriError, loading) dibuang karena komponennya dipasang ulang — bukan
 * menampilkan data menu sebelumnya sambil menunggu respons baru.
 */
export function MenuDetailPage() {
  const { menuId } = useParams({ from: '/_authenticated/menu/$menuId' })
  // Rute non-numerik (/menu/abc) tidak boleh menembak GET /api/katalog/menu/NaN.
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
  // Kalau id tidak valid tidak ada permintaan yang dijalankan, jadi jangan
  // mulai dalam keadaan "memuat" — kalau tidak, ikon Segarkan berputar terus.
  const [loading, setLoading] = useState(idValid)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fotoGagal, setFotoGagal] = useState(false)

  // Muat data setiap kali menuId berubah atau tombol Segarkan ditekan.
  // setState hanya dipanggil setelah `await`, supaya tidak memicu render
  // berantai di dalam effect (react-hooks/set-state-in-effect).
  const [versiMuat, setVersiMuat] = useState(0)

  useEffect(() => {
    if (!idValid) return
    let masihAktif = true
    void (async () => {
      try {
        // Kategori dimuat berdampingan, tapi kegagalannya TIDAK ditelan diam-diam:
        // hasilnya dicatat di `kategoriError` dan ditampilkan ke pengguna.
        const [detail, hasilKategori] = await Promise.all([
          katalogApi.getMenuDetail(idMenu),
          katalogApi
            .getKategoriList()
            .then((list) => ({ ok: true as const, list }))
            .catch((err: unknown) => ({
              ok: false as const,
              list: [] as KategoriItem[],
              err,
            })),
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
        setError(null)
      } catch (err) {
        if (!masihAktif) return
        setMenu(null)
        // 404 = id tidak ada / sudah dihapus: beri pesan yang bisa dimengerti,
        // bukan pesan mentah dari axios.
        const status = (err as { response?: { status?: number } })?.response
          ?.status
        const pesanMentah = err instanceof Error ? err.message : ''
        setError(
          status === 404 || pesanMentah.includes('404')
            ? 'Menu dengan nomor ini tidak ditemukan. Mungkin sudah dihapus atau tautannya salah.'
            : pesanMentah || 'Menu tidak dapat dimuat'
        )
      } finally {
        if (masihAktif) setLoading(false)
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

  const pesanGalat = idValid
    ? error
    : `Nomor menu "${menuId}" tidak valid. Alamat halaman harus berisi angka, misalnya /menu/4.`
  const kategoriSiap = kategoriList.length > 0
  // Backend bisa mengirim path relatif storage; resolve lewat getImageUrl supaya
  // tidak dianggap relatif terhadap /menu/$menuId.
  const fotoSrc =
    menu?.fotoUrl && !fotoGagal ? katalogApi.getImageUrl(menu.fotoUrl) : ''

  const kategoriNama =
    kategoriList.find((k) => k.id === menu?.kategoriId)?.nama ?? '—'
  const habis = (menu?.stokBerjalan ?? 0) <= 0
  const menipis =
    !habis && (menu?.stokBerjalan ?? 0) <= (menu?.stokMinimum ?? 0)

  return (
    <>
      <Header fixed className='border-b border-sidebar-border/50'>
        <div className='flex items-center gap-2 overflow-hidden me-auto'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-xl'
            onClick={() => navigate({ to: '/menu' })}
            title='Kembali ke daftar menu'
          >
            <ArrowLeft className='size-4' />
          </Button>
          <h1 className='text-base sm:text-lg font-bold tracking-tight text-foreground'>
            Detail Menu
          </h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6 pb-12'>
        <div className='flex items-center justify-end gap-2'>
          <Button
            variant='secondary'
            size='sm'
            onClick={muatUlang}
            // Rute tidak valid: tidak ada yang bisa disegarkan.
            disabled={!idValid || loading}
            className='gap-1.5 border-none bg-muted/70 dark:bg-muted/30 text-foreground hover:bg-muted rounded-xl shadow-none'
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
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
            className='gap-1.5 border-none rounded-xl shadow-none font-semibold'
          >
            <Pencil className='size-4' />
            Ubah Menu
          </Button>
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
          <Card className='border-none shadow-sm'>
            <CardContent className='p-6'>
              <div className='flex flex-col gap-6 sm:flex-row'>
                <Skeleton className='size-44 rounded-2xl' />
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
          <Card className='border-none shadow-sm'>
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
                {/* Id tidak valid bukan kegagalan jaringan: tidak ada yang bisa
                    dicoba ulang, jadi tombolnya tidak ditampilkan. */}
                {idValid && (
                  <Button
                    variant='secondary'
                    size='sm'
                    onClick={muatUlang}
                    className='rounded-xl'
                  >
                    Coba lagi
                  </Button>
                )}
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => navigate({ to: '/menu' })}
                  className='rounded-xl'
                >
                  Kembali ke daftar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !pesanGalat && menu && (
          <div className='grid gap-6 md:grid-cols-[260px_1fr]'>
            {/* Foto & status */}
            <Card className='mx-auto w-full max-w-[260px] border-none shadow-sm md:mx-0 md:max-w-none'>
              <CardContent className='space-y-4 p-5'>
                <div className='relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/50'>
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
                      variant='secondary'
                      className='rounded-full border-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5'
                    >
                      Aktif
                    </Badge>
                  ) : (
                    <Badge
                      variant='secondary'
                      className='rounded-full border-none bg-background/80 dark:bg-background/20 text-muted-foreground text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5'
                    >
                      Nonaktif
                    </Badge>
                  )}
                  {habis && (
                    <Badge
                      variant='secondary'
                      className='rounded-full border-none bg-destructive/15 text-destructive text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5'
                    >
                      Habis
                    </Badge>
                  )}
                  {menipis && (
                    <Badge
                      variant='secondary'
                      className='rounded-full border-none bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5'
                    >
                      Stok menipis
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rincian */}
            <div className='space-y-6'>
              <Card className='border-none shadow-sm'>
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
                    <span className='text-2xl font-bold tracking-tight'>
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
                        <p className='text-sm font-semibold text-foreground'>
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
                        <p className='text-sm font-semibold text-foreground'>
                          {formatNumber(menu.stokMinimum)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className='rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground'>
                    Data diambil langsung dari server saat halaman dibuka. Stok
                    berubah mengikuti transaksi kasir dan barang masuk.
                  </p>
                </CardContent>
              </Card>
            </div>
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
