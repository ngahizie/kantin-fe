import * as React from 'react'
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import { type Column } from '@tanstack/react-table'
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react'
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
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import {
  type FilterOption,
  computeNextFilterValues,
  normalizeSelectedValues,
  resolveFacetedFilterLabels,
} from './faceted-filter-utils'

type DataTableFacetedFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>
  title?: string
  icon?: React.ComponentType<{ className?: string }>
  options: FilterOption[]
  selectedValues?: Set<string> | string[]
  onSelect?: (values: string[]) => void
  isSingleSelect?: boolean
  allLabel?: string
  searchPlaceholder?: string
  showSearch?: boolean
}

type SingleSelectTriggerProps = React.ComponentProps<typeof Button> & {
  title?: string
  leadingIcon?: React.ComponentType<{ className?: string }>
  selectedOption?: FilterOption
  placeholder: string
  open: boolean
}

function SingleSelectTrigger({
  title,
  leadingIcon: LeadingIcon,
  selectedOption,
  placeholder,
  open,
  className,
  ...buttonProps
}: SingleSelectTriggerProps) {
  const DisplayIcon = selectedOption?.icon ?? LeadingIcon
  return (
    <Button
      variant='secondary'
      size='sm'
      aria-expanded={open}
      aria-label={title}
      className={cn(
        'h-8 min-w-[130px] justify-between gap-2 px-3 text-xs border-0 bg-muted/70 hover:bg-muted dark:bg-muted/40 dark:hover:bg-muted/60 shadow-none font-normal',
        selectedOption
          ? 'text-foreground font-medium'
          : 'text-muted-foreground',
        className
      )}
      {...buttonProps}
    >
      <span className='flex items-center gap-1.5 truncate'>
        {DisplayIcon && (
          <DisplayIcon className='size-3.5 text-muted-foreground shrink-0' />
        )}
        <span className='truncate'>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </span>
      <ChevronDownIcon className='size-3.5 shrink-0 opacity-50' />
    </Button>
  )
}

type MultiSelectTriggerProps = React.ComponentProps<typeof Button> & {
  title?: string
  triggerIcon: React.ComponentType<{ className?: string }>
  selectedCount: number
  selectedOptions: FilterOption[]
}

function MultiSelectTrigger({
  title,
  triggerIcon: TriggerIcon,
  selectedCount,
  selectedOptions,
  className,
  ...buttonProps
}: MultiSelectTriggerProps) {
  return (
    <Button
      variant='secondary'
      size='sm'
      className={cn(
        'h-8 text-xs border-0 bg-muted/70 hover:bg-muted text-foreground shadow-none gap-1.5',
        className
      )}
      {...buttonProps}
    >
      <TriggerIcon className='size-3.5 shrink-0' />
      <span>{title}</span>
      {selectedCount > 0 && (
        <>
          <Separator orientation='vertical' className='mx-2 h-4' />
          <Badge
            variant='secondary'
            className='rounded-sm px-1 font-normal lg:hidden border-0 bg-background/80'
          >
            {selectedCount}
          </Badge>
          <div className='hidden space-x-1 lg:flex'>
            {selectedCount > 2 ? (
              <Badge
                variant='secondary'
                className='rounded-sm px-1 font-normal border-0 bg-background/80'
              >
                {selectedCount} selected
              </Badge>
            ) : (
              selectedOptions.map((option) => (
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
  )
}

type SingleSelectOptionRowProps = {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  isSelected: boolean
  facetCount?: number
  onSelect: () => void
}

function SingleSelectOptionRow({
  label,
  value,
  icon: Icon,
  isSelected,
  facetCount,
  onSelect,
}: SingleSelectOptionRowProps) {
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      className={cn(
        'cursor-pointer text-xs py-2 px-2.5',
        isSelected && 'bg-accent/50 font-medium text-foreground'
      )}
    >
      {Icon && <Icon className='text-muted-foreground size-3.5 shrink-0' />}
      <span className='truncate'>{label}</span>
      {facetCount !== undefined && (
        <span className='ms-auto ps-2 font-mono text-[11px] text-muted-foreground'>
          {facetCount}
        </span>
      )}
      <CheckIcon
        className={cn(
          facetCount !== undefined ? 'ms-2' : 'ms-auto',
          'size-4 shrink-0 text-primary',
          isSelected ? 'opacity-100' : 'opacity-0'
        )}
      />
    </CommandItem>
  )
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  icon: customIcon,
  options,
  selectedValues: propSelectedValues,
  onSelect: propOnSelect,
  isSingleSelect,
  allLabel,
  searchPlaceholder,
  showSearch = true,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const facets = column?.getFacetedUniqueValues()
  const columnFilterValue = column?.getFilterValue()

  const isSortTitle = React.useMemo(() => {
    const t = (title || '').toLowerCase()
    return t.includes('urutkan') || t.includes('sort')
  }, [title])

  const multiSelectIcon =
    customIcon || (isSortTitle ? ArrowUpDown : SlidersHorizontal)
  const singleSelectLeadingIcon =
    customIcon || (isSortTitle ? ArrowUpDown : undefined)

  const selectedValues = React.useMemo(
    () => normalizeSelectedValues(propSelectedValues, columnFilterValue),
    [propSelectedValues, columnFilterValue]
  )

  const selectedOptions = React.useMemo(
    () => options.filter((option) => selectedValues.has(option.value)),
    [options, selectedValues]
  )
  const selectedSingleOption = isSingleSelect ? selectedOptions[0] : undefined

  const {
    resetOptionLabel,
    triggerPlaceholder,
    resolvedSearchPlaceholder,
  } = resolveFacetedFilterLabels({
    title,
    allLabel,
    searchPlaceholder,
  })

  const applyFilterValues = (filterValues: string[]) => {
    if (propOnSelect) {
      propOnSelect(filterValues)
    } else {
      column?.setFilterValue(filterValues.length ? filterValues : undefined)
    }
  }

  const handleSelect = (value: string) => {
    const nextValues = computeNextFilterValues({
      currentValues: selectedValues,
      targetValue: value,
      isSingleSelect,
    })
    applyFilterValues(nextValues)
    if (isSingleSelect) {
      setOpen(false)
      setSearchQuery('')
    }
  }

  const handleClear = () => {
    applyFilterValues([])
    if (isSingleSelect) {
      setOpen(false)
      setSearchQuery('')
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSearchQuery('')
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {isSingleSelect ? (
          <SingleSelectTrigger
            title={title}
            leadingIcon={singleSelectLeadingIcon}
            selectedOption={selectedSingleOption}
            placeholder={triggerPlaceholder}
            open={open}
          />
        ) : (
          <MultiSelectTrigger
            title={title}
            triggerIcon={multiSelectIcon}
            selectedCount={selectedValues.size}
            selectedOptions={selectedOptions}
          />
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'p-0 has-border border border-slate-200 dark:border-slate-800 shadow-lg',
          isSingleSelect ? 'min-w-[200px] w-auto max-w-[260px]' : 'w-[200px]'
        )}
        align='start'
      >
        <Command>
          {showSearch && (
            <>
              <CommandInput
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder={resolvedSearchPlaceholder}
                className='h-9 text-xs'
              />
              <div className='h-px w-full bg-slate-200/80 dark:bg-slate-800' />
            </>
          )}
          <CommandList>
            <CommandEmpty className='py-4 text-center text-xs text-muted-foreground'>
              Tidak ada hasil.
            </CommandEmpty>
            <CommandGroup>
              {isSingleSelect && (
                <SingleSelectOptionRow
                  label={resetOptionLabel}
                  value={resetOptionLabel}
                  isSelected={selectedValues.size === 0}
                  onSelect={handleClear}
                />
              )}
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                const facetCount = facets?.get(option.value)
                if (isSingleSelect) {
                  return (
                    <SingleSelectOptionRow
                      key={option.value}
                      label={option.label}
                      value={option.label}
                      icon={option.icon}
                      isSelected={isSelected}
                      facetCount={facetCount}
                      onSelect={() => handleSelect(option.value)}
                    />
                  )
                }

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        'has-border border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
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
                    {facetCount !== undefined && (
                      <span className='ml-auto flex size-4 items-center justify-center font-mono text-xs'>
                        {facetCount}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {!isSingleSelect && selectedValues.size > 0 && (
              <>
                <div className='h-px w-full bg-slate-200/80 dark:bg-slate-800' />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleClear}
                    className='justify-center text-center text-xs'
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
