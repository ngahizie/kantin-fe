import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  ref?: React.Ref<HTMLInputElement>
}

export function PasswordInput({
  className,
  disabled,
  ref,
  id,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div
      className={cn(
        'relative flex h-9 w-full items-center rounded-md border-0 bg-card dark:bg-input/30 overflow-hidden outline-none',
        className
      )}
    >
      <input
        type={showPassword ? 'text' : 'password'}
        id={id}
        className='h-full w-full bg-transparent px-3 py-1 pr-10 text-sm outline-none focus:outline-none focus-visible:outline-none border-0 focus:ring-0 focus-visible:ring-0 shadow-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden'
        ref={ref}
        disabled={disabled}
        {...props}
      />
      <button
        type='button'
        tabIndex={-1}
        disabled={disabled}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        className='absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none border-0 bg-transparent cursor-pointer disabled:pointer-events-none disabled:opacity-50'
        onClick={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
        <span className='sr-only'>
          {showPassword ? 'Hide password' : 'Show password'}
        </span>
      </button>
    </div>
  )
}
