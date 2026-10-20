import * as React from 'react'
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons'
import { type Column } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

type DataTableFacetedFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  selectedValues?: Set<string> | string[]
  onSelect?: (values: string[]) => void
  isSingleSelect?: boolean
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  selectedValues: propSelectedValues,
  onSelect: propOnSelect,
  isSingleSelect,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()

  const selectedValues = React.useMemo(() => {
    if (propSelectedValues !== undefined) {
      if (propSelectedValues instanceof Set) return new Set(propSelectedValues)
      if (Array.isArray(propSelectedValues)) return new Set(propSelectedValues)
      if (propSelectedValues) return new Set([String(propSelectedValues)])
      return new Set<string>()
    }
    return new Set(column?.getFilterValue() as string[])
  }, [propSelectedValues, column])

  const handleSelect = (value: string) => {
    const next = new Set(selectedValues)
    if (isSingleSelect) {
      if (next.has(value)) {
        next.clear()
      } else {
        next.clear()
        next.add(value)
      }
    } else {
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
    }
    const filterValues = Array.from(next)
    if (propOnSelect) {
      propOnSelect(filterValues)
    } else {
      column?.setFilterValue(filterValues.length ? filterValues : undefined)
    }
  }

  const handleClear = () => {
    if (propOnSelect) {
      propOnSelect([])
    } else {
      column?.setFilterValue(undefined)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='secondary'
          size='sm'
          className='h-8 text-xs border-0 bg-muted/70 hover:bg-muted text-foreground shadow-none'
        >
          <PlusCircledIcon className='size-4' />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation='vertical' className='mx-2 h-4' />
              <Badge
                variant='secondary'
                className='rounded-sm px-1 font-normal lg:hidden border-0 bg-background/80'
              >
                {selectedValues.size}
              </Badge>
              <div className='hidden space-x-1 lg:flex'>
                {selectedValues.size > 2 ? (
                  <Badge
                    variant='secondary'
                    className='rounded-sm px-1 font-normal border-0 bg-background/80'
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant='secondary'
                        key={option.value}
                        className='rounded-sm px-1 font-normal border-0 bg-background/80'
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[200px] p-0 border-0 shadow-lg' align='start'>
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>Tidak ada hasil.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className={cn('size-4')} />
                    </div>
                    {option.icon && (
                      <option.icon className='text-muted-foreground mr-2 size-4' />
                    )}
                    <span>{option.label}</span>
                    {facets?.get(option.value) && (
                      <span className='ml-auto flex size-4 items-center justify-center font-mono text-xs'>
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleClear}
                    className='justify-center text-center'
                  >
                    Hapus filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
