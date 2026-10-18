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
      <div className='grid grid-cols-2 gap-3 p-4 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
        {Array.from({ length: 8 }).map((_, idx) => (
          <Card
            key={idx}
            className='flex flex-col overflow-hidden rounded-2xl border-0 bg-card p-0 shadow-xs'
          >
            <Skeleton className='aspect-4/3 w-full' />
            <div className='flex flex-col gap-2 p-3'>
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-3 w-1/3' />
              <div className='mt-2 flex items-center justify-between border-0 pt-2'>
                <Skeleton className='h-5 w-16' />
                <Skeleton className='h-8 w-12 rounded-md' />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (menus.length === 0) {
    return (
      <div className='flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center'>
        <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground'>
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
            variant='secondary'
            size='sm'
            onClick={onResetFilters}
            className='mt-4 gap-2 text-xs border-0 bg-muted/80 hover:bg-muted text-foreground'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            Reset Filter &amp; Pencarian
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-3 p-4 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
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
