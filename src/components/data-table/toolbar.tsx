import * as React from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableFacetedFilter } from './faceted-filter'
import { DataTableViewOptions } from './view-options'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchKey?: string
  filters?: {
    columnId: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  children?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Cari...',
  searchKey,
  filters = [],
  children,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 || table.getState().globalFilter

  return (
    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        <div className='relative'>
          <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none' />
          {searchKey ? (
            <Input
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
              }
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className='h-8 w-[180px] sm:w-[220px] lg:w-[260px] pl-8.5 text-xs bg-background'
            />
          ) : (
            <Input
              placeholder={searchPlaceholder}
              value={table.getState().globalFilter ?? ''}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              className='h-8 w-[180px] sm:w-[220px] lg:w-[260px] pl-8.5 text-xs bg-background'
            />
          )}
        </div>
        {filters.map(
          (filter) =>
            table.getColumn(filter.columnId) && (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={table.getColumn(filter.columnId)}
                title={filter.title}
                options={filter.options}
              />
            )
        )}
        {isFiltered && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
            }}
            className='h-8 px-2 lg:px-3 text-xs'
          >
            Reset
            <Cross2Icon className='ms-2 size-4' />
          </Button>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
