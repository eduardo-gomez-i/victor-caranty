import * as React from "react"
import { twMerge } from "tailwind-merge"

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline"
}

export default function Badge({ variant = "default", className, ...props }: Props) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
  const variants: Record<NonNullable<Props["variant"]>, string> = {
    default: "bg-gray-900 text-white",
    secondary: "bg-gray-100 text-gray-800",
    outline: "border border-border text-gray-900",
  }

  return <span className={twMerge(base, variants[variant], className)} {...props} />
}

