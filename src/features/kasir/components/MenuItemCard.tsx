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
      className={`relative flex h-full flex-col gap-0 overflow-hidden rounded-xl p-0 select-none transition-all duration-150 ${
        cartQty > 0 ? 'border-primary/70 ring-1 ring-primary/20' : ''
      } ${
        isHabis
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:border-primary/50 hover:bg-accent/30 active:scale-[0.98]'
      }`}
    >
      {/* Gambar & Badge Keranjang */}
      <div className='relative aspect-4/3 w-full shrink-0 overflow-hidden bg-muted/50'>
        {menu.fotoUrl && !imageError ? (
          <img
            src={menu.fotoUrl}
            alt={menu.nama}
            onError={() => setImageError(true)}
            className={`block aspect-4/3 h-full w-full object-cover ${
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
            <Badge className='rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground shadow-xs'>
              {cartQty}x di keranjang
            </Badge>
          </div>
        )}
      </div>

      {/* Nama Menu */}
      <h4
        className='min-h-[calc(0.75rem+2.75em)] px-3.5 pt-3 text-sm leading-snug font-semibold tracking-tight text-foreground line-clamp-2 [overflow-wrap:anywhere]'
        title={menu.nama}
      >
        {menu.nama}
      </h4>

      {/* Footer Harga & Satuan */}
      <footer className='mt-auto flex items-baseline justify-between gap-2 whitespace-nowrap px-3.5 pt-2 pb-3.5'>
        <span className='shrink-0 text-base font-bold tracking-tight tabular-nums text-primary sm:text-lg'>
          {formatRupiah(menu.hargaJual)}
        </span>
        <span className='min-w-0 truncate text-xs font-medium tracking-wide text-muted-foreground uppercase'>
          /{menu.satuan || 'porsi'}
        </span>
      </footer>
    </Card>
  )
}

export default MenuItemCard
