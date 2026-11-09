import React, { useState } from 'react'
import { Utensils } from 'lucide-react'
import { formatRupiah } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { MenuItem } from '@/features/katalog/types'

export interface MenuItemCardProps {
  menu: MenuItem
  cartQty?: number
  onAddToCart: (menu: MenuItem) => void
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  menu,
  cartQty = 0,
  onAddToCart,
}) => {
  const [imageError, setImageError] = useState(false)
  const availableStock = menu.stokBerjalan ?? 0
  const isHabis = availableStock <= 0 || !menu.aktif

  const handleCardClick = () => {
    if (isHabis) return
    onAddToCart(menu)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isHabis) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onAddToCart(menu)
    }
  }

  return (
    <Card
      role='button'
      tabIndex={isHabis ? -1 : 0}
      aria-disabled={isHabis}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={`relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border-none bg-muted/70 dark:bg-muted/30 p-0 gap-0 shadow-none select-none transition-all duration-150 hover:bg-muted/90 dark:hover:bg-muted/50 ${
        isHabis
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* Gambar & Badges */}
      <div className='relative aspect-4/3 w-full shrink-0 overflow-hidden bg-muted/50 dark:bg-muted/50'>
        {menu.fotoUrl && !imageError ? (
          <img
            src={menu.fotoUrl}
            alt={menu.nama}
            onError={() => setImageError(true)}
            className={`h-full w-full object-cover ${
              isHabis ? 'grayscale filter' : ''
            }`}
            loading='lazy'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-muted-foreground/50'>
            <Utensils className='h-12 w-12 stroke-[1.5]' />
          </div>
        )}

        {/* Badge Jumlah di Keranjang di Pojok Kanan Atas */}
        {cartQty > 0 && (
          <div className='absolute top-2.5 right-2.5 animate-in duration-200 zoom-in-75'>
            <Badge className='rounded-full border-none bg-primary text-primary-foreground font-semibold text-[10px] px-2.5 py-0.5 shadow-none'>
              {cartQty}x di keranjang
            </Badge>
          </div>
        )}
      </div>

      {/* Konten Menu */}
      <div className='flex flex-1 flex-col justify-between p-3.5'>
        <div>
          <h4
            className='h-10 text-sm font-semibold tracking-tight text-foreground line-clamp-2'
            title={menu.nama}
          >
            {menu.nama}
          </h4>
          <span className='mt-0.5 inline-block text-[11px] text-muted-foreground uppercase'>
            /{menu.satuan || 'porsi'}
          </span>
        </div>

        {/* Harga */}
        <div className='mt-3 flex flex-col border-none pt-1'>
          <span className='text-xs text-muted-foreground'>Harga</span>
          <span className='text-base font-bold tracking-tight text-primary tabular-nums sm:text-lg'>
            {formatRupiah(menu.hargaJual)}
          </span>
        </div>
      </div>
    </Card>
  )
}

export default MenuItemCard
