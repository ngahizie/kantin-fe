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
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#0a0a0a] p-0 gap-0 shadow-none select-none transition-all duration-150 ${
        cartQty > 0
          ? 'has-border !border !border-blue-500/70 dark:!border-blue-500/60'
          : 'has-border !border !border-slate-200 dark:!border-slate-800'
      } ${
        isHabis
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-900/60 hover:!border-blue-300 dark:hover:!border-blue-800 active:scale-[0.98]'
      }`}
    >
      {/* Gambar & Badge Keranjang */}
      <div className='relative aspect-4/3 w-full shrink-0 overflow-hidden bg-slate-50/70 dark:bg-slate-900/60'>
        {menu.fotoUrl && !imageError ? (
          <img
            src={menu.fotoUrl}
            alt={menu.nama}
            onError={() => setImageError(true)}
            className={`block h-full w-full object-cover ${
              isHabis ? 'grayscale filter' : ''
            }`}
            loading='lazy'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-600'>
            <Utensils className='h-12 w-12 stroke-[1.5]' />
          </div>
        )}

        {/* Badge Jumlah di Keranjang di Pojok Kanan Atas */}
        {cartQty > 0 && (
          <div className='absolute top-2.5 right-2.5 animate-in duration-200 zoom-in-75'>
            <Badge className='rounded-full !bg-blue-600 !text-white font-semibold text-xs px-2.5 py-0.5 shadow-none'>
              {cartQty}x di keranjang
            </Badge>
          </div>
        )}
      </div>

      {/* Nama Menu */}
      <h4
        className='px-3.5 pt-3 text-sm leading-snug font-semibold tracking-tight text-slate-800 dark:text-white line-clamp-2 [overflow-wrap:anywhere]'
        title={menu.nama}
      >
        {menu.nama}
      </h4>

      {/* Footer Harga & Satuan */}
      <footer className='mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 px-3.5 pt-2.5 pb-3.5'>
        <span className='text-base font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums sm:text-lg'>
          {formatRupiah(menu.hargaJual)}
        </span>
        <span className='shrink-0 text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase'>
          /{menu.satuan || 'porsi'}
        </span>
      </footer>
    </Card>
  )
}

export default MenuItemCard
