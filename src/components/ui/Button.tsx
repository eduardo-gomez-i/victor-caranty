'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { Loader2 } from 'lucide-react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  isLoading?: boolean
  className?: string
}

const variants: Record<string, string> = {
  primary:
    'inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed',
  outline:
    'inline-flex items-center justify-center rounded-xl border border-border bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizes: Record<string, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4',
  lg: 'h-12 px-5 text-base',
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', fullWidth, isLoading, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      {...props}
      className={twMerge(variants[variant], sizes[size], fullWidth ? 'w-full' : '', className)}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
})

export default Button
