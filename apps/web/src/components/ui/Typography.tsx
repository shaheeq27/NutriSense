import type { ReactNode } from "react"
import { cn } from "@/lib/format"

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "font-mono text-[11px] uppercase tracking-[.18em] text-ink-soft",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Title({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h1
      className={cn(
        "font-display display-soft text-4xl md:text-5xl leading-[1.04] tracking-[-.02em] font-[420]",
        className,
      )}
    >
      {children}
    </h1>
  )
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h2
      className={cn(
        "font-display display-soft text-2xl md:text-3xl leading-tight tracking-[-.015em] font-[400]",
        className,
      )}
    >
      {children}
    </h2>
  )
}
