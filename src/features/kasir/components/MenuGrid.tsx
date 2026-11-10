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
      <div className='grid grid-cols-2 gap-3 p-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-4'>
        {Array.from({ length: 8 }).map((_, idx) => (
          <Card
            key={idx}
            className='flex h-full flex-col overflow-hidden rounded-2xl has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] p-0 gap-0 shadow-none'
          >
            <Skeleton className='aspect-4/3 w-full shrink-0 rounded-none bg-slate-200/70 dark:bg-slate-800/80' />
            <div className='px-3.5 pt-3'>
              <Skeleton className='h-5 w-3/4 bg-slate-200/70 dark:bg-slate-800/80' />
            </div>
            <div className='mt-auto flex items-baseline justify-between gap-2 px-3.5 pt-2.5 pb-3.5'>
              <Skeleton className='h-5 w-20 bg-slate-200/70 dark:bg-slate-800/80' />
              <Skeleton className='h-3.5 w-12 bg-slate-200/70 dark:bg-slate-800/80' />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (menus.length === 0) {
    return (
      <div className='flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center'>
        <div className='flex h-16 w-16 items-center justify-center rounded-2xl has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] text-slate-400 dark:text-slate-500'>
          <UtensilsCrossed className='h-8 w-8 stroke-[1.5]' />
        </div>
        <h3 className='mt-4 text-base font-semibold text-slate-800 dark:text-white'>
          Menu Tidak Ditemukan
        </h3>
        <p className='mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400 sm:text-sm'>
          Tidak ada menu yang sesuai dengan kata kunci pencarian atau kategori
          yang dipilih.
        </p>
        {hasFilters && onResetFilters && (
          <Button
            variant='secondary'
            size='sm'
            onClick={onResetFilters}
            className='mt-4 gap-2 text-xs has-border !border !border-slate-200 dark:!border-slate-800 bg-white dark:bg-[#0a0a0a] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-none'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            Reset Filter &amp; Pencarian
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-3 p-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-4'>
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
