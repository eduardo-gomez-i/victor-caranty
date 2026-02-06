'use client'

import { forwardRef, SelectHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string
}

const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      {...props}
      className={twMerge(
        'ui-select h-11 w-full rounded-xl border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900',
        'control-light',
        className
      )}
    >
      {children}
    </select>
  )
})

export default Select
