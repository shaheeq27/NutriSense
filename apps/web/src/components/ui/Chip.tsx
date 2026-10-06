import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/format"

export default function Chip({
  on,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={on}
      className={cn(
        "h-9 px-4 rounded-full text-sm border transition cursor-pointer whitespace-nowrap",
        on
          ? "bg-ink text-paper border-ink"
          : "bg-paper border-line hover:border-ink/30",
        className,
      )}
      {...rest}
    />
  )
}
