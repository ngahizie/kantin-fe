'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
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
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked)
    const isControlled = checkedProp !== undefined
    const isChecked = isControlled ? checkedProp : uncontrolledChecked

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      const nextChecked = !isChecked
      if (!isControlled) {
        setUncontrolledChecked(nextChecked)
      }
      onCheckedChange?.(nextChecked)
      onClick?.(e)
    }

    return (
      <button
        type='button'
        role='switch'
        aria-checked={isChecked}
        data-state={isChecked ? 'checked' : 'unchecked'}
        data-slot='switch'
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        className={cn(
          'peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
          className
        )}
        {...props}
      >
        <span
          data-slot='switch-thumb'
          data-state={isChecked ? 'checked' : 'unchecked'}
          className={cn(
            'pointer-events-none block size-4 rounded-full bg-background ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 rtl:data-[state=checked]:-translate-x-[calc(100%-2px)] dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground'
          )}
        />
      </button>
    )
  }
)

Switch.displayName = 'Switch'

export { Switch }

