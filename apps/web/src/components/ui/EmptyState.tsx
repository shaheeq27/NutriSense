import type { ReactNode } from "react"
import { cn } from "@/lib/format"

export default function EmptyState({
  icon = "🥣",
  title,
  description,
  action,
  tone = "empty",
  className,
}: {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
  tone?: "empty" | "error"
  className?: string
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "text-center py-12 px-6 rounded-3xl border border-dashed",
        tone === "error" ? "border-tomato/40 bg-tomato/5" : "border-sand-deep",
        className,
      )}
    >
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <p className="font-display text-2xl mt-3 display-soft">{title}</p>
      {description && (
        <p className="text-sm text-ink-soft mt-2 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
