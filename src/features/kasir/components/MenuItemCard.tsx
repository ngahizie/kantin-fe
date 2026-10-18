import React, { useState } from 'react'
import { Plus, Utensils, AlertCircle } from 'lucide-react'
import { formatRupiah } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-none bg-card shadow-xs transition-all duration-200 select-none ${
        isHabis
          ? 'cursor-not-allowed bg-muted/40 opacity-60'
          : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
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
            <Badge variant='destructive' className='border-none font-bold shadow-xs'>
              Habis
            </Badge>
          ) : isMenipis ? (
            <Badge
              variant='secondary'
              className='border-none bg-amber-500 font-bold text-amber-950 shadow-xs dark:text-amber-100'
            >
              <AlertCircle className='mr-1 h-3 w-3' /> Sisa {availableStock}
            </Badge>
          ) : (
            <Badge
              variant='secondary'
              className='border-none bg-background/90 text-xs font-medium text-foreground shadow-xs backdrop-blur-xs'
            >
              Stok: {availableStock}
            </Badge>
          )}
        </div>

        {/* Badge Jumlah di Keranjang di Pojok Kanan Atas */}
        {cartQty > 0 && (
          <div className='absolute top-2 right-2 animate-in duration-200 zoom-in-75'>
            <Badge className='border-none bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow-xs'>
              {cartQty}x di keranjang
            </Badge>
          </div>
        )}
      </div>

      {/* Konten Menu */}
      <div className='flex flex-1 flex-col justify-between p-3'>
        <div>
          <h4
            className='line-clamp-2 text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary'
            title={menu.nama}
          >
            {menu.nama}
          </h4>
          <span className='mt-0.5 inline-block text-[11px] text-muted-foreground uppercase'>
            /{menu.satuan || 'porsi'}
          </span>
        </div>

        {/* Harga & Tombol Tambah */}
        <div className='mt-3 flex items-center justify-between gap-2 border-none pt-2'>
          <div className='flex flex-col'>
            <span className='text-xs text-muted-foreground'>Harga</span>
            <span className='text-sm font-bold text-primary sm:text-base'>
              {formatRupiah(menu.hargaJual)}
            </span>
          </div>

          <Button
            type='button'
            size='sm'
            variant={isHabis ? 'secondary' : 'default'}
            disabled={isHabis}
            onClick={(e) => {
              e.stopPropagation()
              handleCardClick()
            }}
            className='h-8 min-w-[36px] touch-manipulation border-none px-2.5 shadow-xs'
            title={isHabis ? 'Stok habis' : `Tambah ${menu.nama} ke keranjang`}
          >
            <Plus className='h-4 w-4' />
            <span className='hidden text-xs font-medium sm:inline'>Pilih</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default MenuItemCard
