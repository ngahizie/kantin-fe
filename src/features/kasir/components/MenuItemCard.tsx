import React, { useState } from 'react'
import { Utensils, AlertCircle } from 'lucide-react'
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
  const isMenipis = !isHabis && availableStock <= (menu.stokMinimum ?? 5)

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
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-none bg-card shadow-xs select-none ${
        isHabis
          ? 'cursor-not-allowed bg-muted/40 opacity-60'
          : 'cursor-pointer'
      }`}
    >
      {/* Gambar & Badges */}
      <div className='relative aspect-4/3 w-full overflow-hidden bg-muted/60'>
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

        {/* Badge Status Stok di Pojok Kiri Atas */}
        <div className='absolute top-2 left-2 flex flex-col gap-1'>
          {isHabis ? (
            <Badge variant='destructive' className='border-none font-bold shadow-none'>
              Habis
            </Badge>
          ) : isMenipis ? (
            <Badge
              variant='secondary'
              className='border-none bg-amber-500 font-bold text-amber-950 dark:text-amber-100 shadow-none'
            >
              <AlertCircle className='mr-1 h-3 w-3' /> Sisa {availableStock}
            </Badge>
          ) : (
            <Badge
              variant='secondary'
              className='border-none bg-background/90 text-xs font-medium text-foreground shadow-none backdrop-blur-xs'
            >
              Stok: {availableStock}
            </Badge>
          )}
        </div>

        {/* Badge Jumlah di Keranjang di Pojok Kanan Atas */}
        {cartQty > 0 && (
          <div className='absolute top-2 right-2 animate-in duration-200 zoom-in-75'>
            <Badge className='border-none bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow-none'>
              {cartQty}x di keranjang
            </Badge>
          </div>
        )}
      </div>

      {/* Konten Menu */}
      <div className='flex flex-1 flex-col justify-between p-3.5'>
        <div>
          <h4
            className='line-clamp-2 text-sm font-semibold tracking-tight text-foreground'
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
          <span className='font-mono text-base font-bold text-primary sm:text-lg'>
            {formatRupiah(menu.hargaJual)}
          </span>
        </div>
      </div>
    </Card>
  )
}

export default MenuItemCard
