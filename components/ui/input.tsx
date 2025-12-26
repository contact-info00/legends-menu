import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-white/20 backdrop-blur-sm bg-white/10',
          'px-3 py-2 text-sm text-white',
          'placeholder:text-white/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:border-white/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }

