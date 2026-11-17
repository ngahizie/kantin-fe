'use client'

import * as React from 'react'
import { CheckIcon, MinusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      className,
      checked: checkedProp,
      defaultChecked = false,
      onCheckedChange,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] =
      React.useState<boolean | 'indeterminate'>(defaultChecked)
    const isControlled = checkedProp !== undefined
    const isChecked = isControlled ? checkedProp : uncontrolledChecked

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      const nextChecked = isChecked === 'indeterminate' ? true : !isChecked
      if (!isControlled) {
        setUncontrolledChecked(nextChecked)
      }
      onCheckedChange?.(nextChecked)
      onClick?.(e)
    }

    const state =
      isChecked === 'indeterminate'
        ? 'indeterminate'
        : isChecked
          ? 'checked'
          : 'unchecked'

    return (
      <button
        type='button'
        role='checkbox'
        aria-checked={isChecked === 'indeterminate' ? 'mixed' : isChecked}
        data-state={state}
        data-slot='checkbox'
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        className={cn(
          'peer size-4 shrink-0 rounded-[4px] border border-input bg-background shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary',
          className
        )}
        {...props}
      >
        {isChecked ? (
          <span
            data-slot='checkbox-indicator'
            data-state={state}
            className='flex items-center justify-center text-current transition-none'
          >
            {isChecked === 'indeterminate' ? (
              <MinusIcon className='size-3.5' />
            ) : (
              <CheckIcon className='size-3.5' />
            )}
          </span>
        ) : null}
      </button>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }

