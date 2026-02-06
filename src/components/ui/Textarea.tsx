'use client'

import { forwardRef, TextareaHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={twMerge(
        'ui-textarea w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-gray-400 bg-white text-gray-900',
        className
      )}
    />
  )
})

export default Textarea
