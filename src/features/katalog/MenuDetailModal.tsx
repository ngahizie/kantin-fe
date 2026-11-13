import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Barcode,
  Boxes,
  Image as ImageIcon,
  Package,
  Pencil,
  RotateCw,
  Tag,
  Wallet,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber, formatRupiah } from '@/lib/formatters'
import { katalogApi } from './api/katalog-api'
import type { KategoriItem, MenuItem } from './types'

export interface MenuDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  menuId: number | null
  kategoriList?: KategoriItem[]
  onEdit?: (menu: MenuItem) => void
}

/**
 * Modal popup detail menu katalog.
 *
 * Mengambil data terkini langsung dari `GET /api/katalog/menu/{menuId}` saat modal dibuka
 * agar harga, barcode, dan stok berjalan selalu akurat dari server.
 */
export function MenuDetailModal({
  open,
  onOpenChange,
  menuId,
  kategoriList: kategoriListProp,
  onEdit,
}: MenuDetailModalProps) {
  const [menu, setMenu] = useState<MenuItem | null>(null)
  const [internalKategoriList, setInternalKategoriList] = useState<KategoriItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fotoGagal, setFotoGagal] = useState(false)
  const [versiMuat, setVersiMuat] = useState(0)

  const idValid = typeof menuId === 'number' && Number.isInteger(menuId) && menuId > 0

  useEffect(() => {
    if (!open || !idValid) {
      setMenu(null)
      setError(null)
      setLoading(false)
      return
    }

    let masihAktif = true
    setLoading(true)
    setError(null)
    setFotoGagal(false)

    void (async () => {
      try {
        const needsKategoriFetch = !kategoriListProp || kategoriListProp.length === 0
        const [detail, kategoriRes] = await Promise.all([
          katalogApi.getMenuDetail(menuId),
          needsKategoriFetch
            ? katalogApi.getKategoriList().catch(() => [] as KategoriItem[])
            : Promise.resolve(kategoriListProp ?? []),
        ])

        if (!masihAktif) return
        setMenu(detail)
        if (needsKategoriFetch) {
          setInternalKategoriList(kategoriRes)
        }
        setError(null)
      } catch (err) {
        if (!masihAktif) return
        setMenu(null)
        const status = (err as { response?: { status?: number } })?.response?.status
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
  }, [open, menuId, idValid, kategoriListProp, versiMuat])

  const muatUlang = () => {
    if (!idValid) return
    setVersiMuat((v) => v + 1)
  }

  const kategoriList =
    kategoriListProp && kategoriListProp.length > 0
      ? kategoriListProp
      : internalKategoriList
  const kategoriNama =
    kategoriList.find((k) => k.id === menu?.kategoriId)?.nama ?? '—'

  const fotoSrc =
    menu?.fotoUrl && !fotoGagal ? katalogApi.getImageUrl(menu.fotoUrl) : ''
  const habis = (menu?.stokBerjalan ?? 0) <= 0
  const menipis =
    !habis && (menu?.stokBerjalan ?? 0) <= (menu?.stokMinimum ?? 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl p-6'>
        <DialogHeader className='pb-2'>
          <DialogTitle className='text-xl font-bold'>Detail Menu</DialogTitle>
          <DialogDescription>
            Informasi lengkap harga jual, kategori, barcode, dan stok berjalan terkini dari server.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className='flex flex-col gap-6 py-4 sm:flex-row sm:items-start'>
            <Skeleton className='size-40 shrink-0 rounded-xl' />
            <div className='flex-1 space-y-3'>
              <Skeleton className='h-7 w-48' />
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-8 w-36' />
              <div className='grid grid-cols-2 gap-3 pt-2'>
                <Skeleton className='h-12 w-full rounded-lg' />
                <Skeleton className='h-12 w-full rounded-lg' />
                <Skeleton className='h-12 w-full rounded-lg' />
                <Skeleton className='h-12 w-full rounded-lg' />
              </div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className='flex flex-col items-center gap-3 py-8 text-center'>
            <div className='rounded-full bg-destructive/10 p-3'>
              <AlertTriangle className='size-6 text-destructive' />
            </div>
            <div className='space-y-1'>
              <p className='font-semibold text-foreground'>
                Menu tidak dapat ditampilkan
              </p>
              <p className='text-sm text-muted-foreground'>{error}</p>
            </div>
            {idValid && (
              <Button
                variant='outline'
                size='sm'
                onClick={muatUlang}
                className='mt-2 gap-1.5'
              >
                <RotateCw className='size-3.5' />
                Coba lagi
              </Button>
            )}
          </div>
        )}

        {!loading && !error && menu && (
          <div className='flex flex-col gap-6 py-2 sm:flex-row sm:items-start'>
            {/* Foto & status badges */}
            <div className='mx-auto flex w-full max-w-[200px] shrink-0 flex-col items-center gap-3 sm:mx-0'>
              <div className='relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted/40 shadow-xs'>
                {fotoSrc ? (
                  <img
                    src={fotoSrc}
                    alt={menu.nama}
                    className='size-full object-cover'
                    onError={() => setFotoGagal(true)}
                  />
                ) : (
                  <div className='flex size-full items-center justify-center text-muted-foreground'>
                    <ImageIcon className='size-12 opacity-50' />
                  </div>
                )}
              </div>
              <div className='flex flex-wrap justify-center gap-1.5'>
                {menu.aktif ? (
                  <Badge
                    variant='outline'
                    className='rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                  >
                    Aktif
                  </Badge>
                ) : (
                  <Badge
                    variant='outline'
                    className='rounded-full border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
                  >
                    Nonaktif
                  </Badge>
                )}
                {habis && (
                  <Badge
                    variant='outline'
                    className='rounded-full border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                  >
                    Habis
                  </Badge>
                )}
                {menipis && (
                  <Badge
                    variant='outline'
                    className='rounded-full border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
                  >
                    Stok menipis
                  </Badge>
                )}
              </div>
            </div>

            {/* Rincian data menu */}
            <div className='flex-1 space-y-4'>
              <div>
                <h3 className='text-lg font-bold tracking-tight text-foreground'>
                  {menu.nama}
                </h3>
                {menu.kodeBarcode && (
                  <div className='mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums'>
                    <Barcode className='size-3.5 shrink-0 opacity-70' />
                    <span>{menu.kodeBarcode}</span>
                  </div>
                )}
              </div>

              <div className='flex items-baseline gap-2'>
                <Wallet className='size-4 text-muted-foreground' />
                <span className='text-2xl font-bold tracking-tight text-foreground tabular-nums'>
                  {formatRupiah(menu.hargaJual)}
                </span>
                <span className='text-xs text-muted-foreground'>
                  / {menu.satuan?.toLowerCase() ?? 'pcs'}
                </span>
              </div>

              <Separator />

              <div className='grid grid-cols-2 gap-3'>
                <div className='flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-2.5'>
                  <Tag className='mt-0.5 size-4 text-muted-foreground' />
                  <div className='min-w-0'>
                    <p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
                      Kategori
                    </p>
                    <p className='truncate text-sm font-semibold text-foreground'>
                      {kategoriNama}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-2.5'>
                  <Package className='mt-0.5 size-4 text-muted-foreground' />
                  <div className='min-w-0'>
                    <p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
                      Satuan
                    </p>
                    <p className='truncate text-sm font-semibold text-foreground'>
                      {menu.satuan}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-2.5'>
                  <Boxes className='mt-0.5 size-4 text-muted-foreground' />
                  <div className='min-w-0'>
                    <p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
                      Stok Berjalan
                    </p>
                    <p className='text-sm font-semibold text-foreground tabular-nums'>
                      {formatNumber(menu.stokBerjalan)}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 p-2.5'>
                  <Boxes className='mt-0.5 size-4 text-muted-foreground' />
                  <div className='min-w-0'>
                    <p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground'>
                      Stok Minimum
                    </p>
                    <p className='text-sm font-semibold text-foreground tabular-nums'>
                      {formatNumber(menu.stokMinimum)}
                    </p>
                  </div>
                </div>
              </div>

              <p className='rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground'>
                Data diambil langsung dari server saat modal dibuka.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className='pt-2 sm:justify-end gap-2 sm:gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </Button>
          {menu && onEdit && (
            <Button
              type='button'
              onClick={() => {
                onOpenChange(false)
                onEdit(menu)
              }}
              className='gap-1.5 font-semibold'
            >
              <Pencil className='size-4' />
              Ubah Menu
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
