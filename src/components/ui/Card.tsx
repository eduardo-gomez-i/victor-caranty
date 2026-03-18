import * as React from "react"
import { twMerge } from "tailwind-merge"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={twMerge("rounded-xl border border-border bg-white", className)} {...props} />
})

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardHeader(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={twMerge("flex flex-col gap-1.5 p-6 pb-2", className)} {...props} />
})

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(function CardTitle(
  { className, ...props },
  ref
) {
  return <h3 ref={ref} className={twMerge("text-base font-semibold leading-none tracking-tight text-gray-900", className)} {...props} />
})

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={twMerge("text-sm text-gray-700", className)} {...props} />
  }
)

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={twMerge("p-6 pt-2", className)} {...props} />
})

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardFooter(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={twMerge("flex items-center p-6 pt-2", className)} {...props} />
})
