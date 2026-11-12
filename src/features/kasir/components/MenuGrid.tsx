import React from 'react'
import { UtensilsCrossed, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { MenuItem } from '@/features/katalog/types'
import MenuItemCard from './MenuItemCard'

export interface MenuGridProps {
  menus: MenuItem[]
  loading?: boolean
  getCartQty: (menuId: number) => number
  onAddToCart: (menu: MenuItem) => void
  onResetFilters?: () => void
  hasFilters?: boolean
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  menus,
  loading = false,
  getCartQty,
  onAddToCart,
  onResetFilters,
  hasFilters = false,
}) => {
  if (loading) {
    return (
      <div className='grid grid-cols-2 auto-rows-fr gap-3 p-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-4'>
        {Array.from({ length: 8 }).map((_, idx) => (
          <Card
            key={idx}
            className='flex h-full flex-col gap-0 overflow-hidden rounded-xl p-0'
          >
            <Skeleton className='aspect-4/3 w-full shrink-0 rounded-none' />
            <div className='min-h-[calc(0.75rem+2.75em)] px-3.5 pt-3 text-sm leading-snug'>
              <Skeleton className='h-5 w-3/4' />
            </div>
            <div className='mt-auto flex items-baseline justify-between gap-2 px-3.5 pt-2 pb-3.5'>
              <Skeleton className='h-6 w-20 sm:h-7' />
              <Skeleton className='h-3.5 w-12' />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (menus.length === 0) {
    return (
      <div className='flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center'>
        <div className='flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs'>
          <UtensilsCrossed className='h-8 w-8 stroke-[1.5]' />
        </div>
        <h3 className='mt-4 text-base font-semibold text-foreground'>
          Menu Tidak Ditemukan
        </h3>
        <p className='mt-1 max-w-sm text-xs text-muted-foreground sm:text-sm'>
          Tidak ada menu yang sesuai dengan kata kunci pencarian atau kategori
          yang dipilih.
        </p>
        {hasFilters && onResetFilters && (
          <Button
            variant='outline'
            size='sm'
            onClick={onResetFilters}
            className='mt-4 gap-2 text-xs'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            Reset Filter &amp; Pencarian
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 auto-rows-fr gap-3 p-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-4'>
      {menus.map((menu) => (
        <MenuItemCard
          key={menu.id}
          menu={menu}
          cartQty={getCartQty(menu.id)}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  )
}

export default MenuGrid
