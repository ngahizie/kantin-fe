import * as React from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './faceted-filter'

export type TableToolbarFilterOption = {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

export type TableToolbarFilter = {
  title: string
  options: TableToolbarFilterOption[]
  selectedValues?: Set<string> | string[]
  onSelect?: (values: string[]) => void
  isSingleSelect?: boolean
}

export type TableToolbarProps = {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: TableToolbarFilter[]
  isFiltered?: boolean
  onReset?: () => void
  extraLeft?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function TableToolbar({
  searchPlaceholder = 'Cari...',
  searchValue,
  onSearchChange,
  filters = [],
  isFiltered,
  onReset,
  extraLeft,
  children,
  className,
}: TableToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        {onSearchChange !== undefined && (
          <div className='relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none' />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className='h-8 w-[180px] sm:w-[220px] lg:w-[260px] pl-8.5 text-xs bg-background'
            />
          </div>
        )}
        {extraLeft}
        {filters.map((filter) => (
          <DataTableFacetedFilter
            key={filter.title}
            title={filter.title}
            options={filter.options}
            selectedValues={filter.selectedValues}
            onSelect={filter.onSelect}
            isSingleSelect={filter.isSingleSelect}
          />
        ))}
        {isFiltered && onReset && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onReset}
            className='h-8 px-2 lg:px-3 text-xs'
          >
            Reset
            <Cross2Icon className='ms-2 size-4' />
          </Button>
        )}
      </div>
      {children && (
        <div className='flex items-center gap-2 max-sm:w-full max-sm:justify-end'>
          {children}
        </div>
      )}
    </div>
  )
}
