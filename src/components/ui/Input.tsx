'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  className?: string
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      className={twMerge(
        'ui-input h-11 w-full rounded-xl border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-gray-400',
        className
      )}
    />
  )
})

export default Input
