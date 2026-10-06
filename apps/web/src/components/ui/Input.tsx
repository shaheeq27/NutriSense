import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/format"

const Input =
  forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & {
    invalid?: boolean
  }>(function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-12 w-full rounded-2xl border bg-paper px-4 text-[15px] text-ink placeholder:text-ink-soft/70 transition focus:outline-none focus:ring-2 focus:ring-secondary/40",
          invalid ? "border-tomato" : "border-line focus:border-secondary",
          className,
        )}
        {...rest}
      />
    )
  })

export default Input
