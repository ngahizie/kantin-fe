import React from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ShoppingCart,
  PlusCircle,
  MinusCircle,
  Trash2,
  Calendar,
  User,
  Coins,
  Inbox,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/formatters'
import type { RiwayatStokItem, JenisMutasiStok } from '../types'

interface KartuStokTimelineProps {
  items: RiwayatStokItem[]
  isLoading?: boolean
}

interface MutationMeta {
  label: string
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive'
  badgeClass: string
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  sign: '+' | '-'
  isMasuk: boolean
}

function getMutationMeta(jenis: JenisMutasiStok): MutationMeta {
  const commonBadgeClass =
    'bg-black/5 text-black dark:bg-white/10 dark:text-white border-0'

  switch (jenis) {
    case 'BARANG_MASUK':
      return {
        label: 'Barang Masuk',
        badgeVariant: 'outline',
        badgeClass: commonBadgeClass,
        icon: ArrowDownLeft,
        iconClass:
          'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
        sign: '+',
        isMasuk: true,
      }
    case 'BARANG_MASUK_PEMBALIK':
      return {
        label: 'Koreksi Pembalik',
        badgeVariant: 'outline',
        badgeClass: commonBadgeClass,
        icon: RotateCcw,
        iconClass:
          'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400',
        sign: '-',
        isMasuk: false,
      }
    case 'PENJUALAN':
      return {
        label: 'Penjualan Kasir POS',
        badgeVariant: 'outline',
        badgeClass: commonBadgeClass,
        icon: ShoppingCart,
        iconClass:
          'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400',
        sign: '-',
        isMasuk: false,
      }
    case 'PENJUALAN_VOID':
      return {
        label: 'Void Penjualan',
        badgeVariant: 'outline',
        badgeClass: commonBadgeClass,
        icon: RotateCcw,
        iconClass:
          'bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-400',
        sign: '+',
        isMasuk: true,
      }
    case 'OPNAME_MASUK':
      return {
        label: 'Opname Fisik (Lebih)',
        badgeVariant: 'outline',
        badgeClass: commonBadgeClass,
        icon: PlusCircle,
        iconClass:
          'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
        sign: '+',
        isMasuk: true,
      }
    case 'OPNAME_KELUAR':
      return {
        label: 'Opname Fisik (Kurang)',
        badgeVariant: 'outline',
        badgeClass: commonBadgeClass,
        icon: MinusCircle,
        iconClass:
          'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
        sign: '-',
        isMasuk: false,
      }
    case 'BARANG_RUSAK':
      return {
        label: 'Barang Rusak',
        badgeVariant: 'outline',
        badgeClass: commonBadgeClass,
        icon: Trash2,
        iconClass:
          'bg-red-50 text-red-600 dark:bg-red-950/80 dark:text-red-400',
        sign: '-',
        isMasuk: false,
      }
    default:
      return {
        label: jenis,
        badgeVariant: 'secondary',
        badgeClass: commonBadgeClass,
        icon: ArrowUpRight,
        iconClass: 'bg-muted text-muted-foreground',
        sign: '-',
        isMasuk: false,
      }
  }
}

export function KartuStokTimeline({
  items,
  isLoading = false,
}: KartuStokTimelineProps) {
  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-16 text-center text-muted-foreground'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3' />
        <p className='text-sm'>Memuat linimasa mutasi kartu stok...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className='border-dashed'>
        <CardContent className='flex flex-col items-center justify-center py-12 text-center text-muted-foreground'>
          <Inbox className='h-12 w-12 text-muted-foreground/40 mb-3' />
          <h4 className='text-base font-semibold text-foreground'>
            Tidak Ada Mutasi Tercatat
          </h4>
          <p className='text-sm max-w-sm mt-1'>
            Belum ada pergerakan stok untuk menu dan rentang tanggal yang
            dipilih.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Sorting descending by time (terbaru di atas)
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()
  )

  return (
    <div className='relative space-y-6'>
      {/* Garis timeline vertikal menyatu rapi */}
      <div className='absolute left-4 top-4 bottom-4 w-0.5 -translate-x-1/2 bg-border/80' />

      {sortedItems.map((item, index) => {
        const meta = getMutationMeta(item.jenis)
        const IconComponent = meta.icon
        const aktorDisplay = item.aktorNama || (item.aktorId ? `Aktor #${item.aktorId}` : 'Sistem')

        return (
          <div key={item.id ?? index} className='relative flex items-start gap-3.5 sm:gap-4 group'>
            {/* Dot / Icon marker on vertical line */}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 ${meta.iconClass}`}
            >
              <IconComponent className='h-4 w-4' />
            </div>

            {/* Card Content */}
            <div className='flex-1 min-w-0'>
              <Card className='border-0 bg-muted/70 dark:bg-muted/30'>
                <CardContent className='p-4 sm:p-5'>
                  {/* Header: [Badge] • #ID_TRANSAKSI             TANGGAL & WAKTU */}
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 mb-3'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge
                        variant='outline'
                        className={`font-medium px-2 py-0.5 text-xs rounded-md border-0 ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </Badge>
                      <span className='text-muted-foreground/40 text-xs'>•</span>
                      <span className='font-mono text-xs font-medium text-muted-foreground'>
                        #{item.referensiId}
                      </span>
                    </div>

                    <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                      <Calendar className='h-3.5 w-3.5 text-muted-foreground/70' />
                      <span>{formatDateTime(item.waktu)}</span>
                    </div>
                  </div>

                  {/* Body: 4 Flat Stat Columns */}
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-y-3 sm:gap-y-0 py-1'>
                    {/* PERUBAHAN QTY */}
                    <div className='sm:pr-4 sm:border-r border-border/60'>
                      <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1'>
                        PERUBAHAN QTY
                      </span>
                      <span
                        className={`text-base font-bold font-mono block ${
                          meta.isMasuk
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {meta.sign}
                        {formatNumber(item.qty)} unit
                      </span>
                    </div>

                    {/* SALDO AKHIR */}
                    <div className='sm:px-4 sm:border-r border-border/60'>
                      <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1'>
                        SALDO AKHIR
                      </span>
                      <span className='text-base font-bold font-mono text-foreground block'>
                        {formatNumber(item.stokSetelah)} unit
                      </span>
                    </div>

                    {/* SNAPSHOT HPP */}
                    <div className='sm:px-4 sm:border-r border-border/60'>
                      <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1'>
                        SNAPSHOT HPP
                      </span>
                      <span className='text-base font-bold font-mono text-foreground block'>
                        {formatRupiah(item.hppSnapshot)}
                      </span>
                    </div>

                    {/* DICATAT OLEH */}
                    <div className='sm:pl-4'>
                      <span className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1'>
                        DICATAT OLEH
                      </span>
                      <span className='text-sm font-semibold text-foreground flex items-center gap-1.5 truncate pt-0.5'>
                        <User className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                        <span className='truncate'>{aktorDisplay}</span>
                      </span>
                    </div>
                  </div>

                  {/* Harga Beli & Nilai Mutasi jika Barang Masuk */}
                  {item.jenis === 'BARANG_MASUK' && item.hargaBeliSatuan && (
                    <div className='mt-3 pt-3 border-t flex flex-wrap items-center gap-4 text-xs text-muted-foreground'>
                      <span className='inline-flex items-center gap-1'>
                        <Coins className='h-3.5 w-3.5 text-emerald-500' />
                        Harga Beli Satuan:{' '}
                        <strong className='text-foreground font-mono'>
                          {formatRupiah(item.hargaBeliSatuan)}
                        </strong>
                      </span>
                      {item.totalNilai && (
                        <span>
                          Total Faktur:{' '}
                          <strong className='text-foreground font-mono'>
                            {formatRupiah(item.totalNilai)}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Alasan / Catatan jika ada */}
                  {item.alasan && (
                    <div className='mt-3 pt-2.5 border-t text-xs'>
                      <span className='text-muted-foreground font-medium'>
                        Catatan / Alasan:{' '}
                      </span>
                      <span className='text-foreground italic'>
                        &ldquo;{item.alasan}&rdquo;
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      })}
    </div>
  )
}
