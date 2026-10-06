import type { HTMLAttributes } from "react"
import { cn } from "@/lib/format"

export default function Card({
  className,
  tone = "paper",
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "paper" | "mint" | "peach" | "ink"
}) {
  const tones = {
    paper: "bg-paper border border-line",
    mint: "bg-mint border border-transparent",
    peach: "bg-peach border border-transparent",
    ink: "bg-ink text-cream border border-transparent",
  }
  return (
    <div
      className={cn("rounded-[var(--radius-card)]", tones[tone], className)}
      {...rest}
    />
  )
}
