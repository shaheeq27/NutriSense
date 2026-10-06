"use client"

import { formatDay, type WindowDay } from "@/lib/dates"
import { cn } from "@/lib/format"

export default function DayStrip({
  days,
  selected,
  onSelect,
  onLocked,
}: {
  days: WindowDay[]
  selected: string
  onSelect: (date: string) => void
  onLocked: (d: WindowDay) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Plan days"
      className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
    >
      {days.map((d) => {
        const active = d.date === selected
        if (d.locked)
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={false}
              aria-disabled
              aria-label={`Locked — opens ${formatDay(d.date)}`}
              onClick={() => onLocked(d)}
              className="shrink-0 min-w-28 rounded-3xl border border-dashed border-sand-deep px-4 py-3 text-left text-ink-soft cursor-not-allowed"
            >
              <span aria-hidden className="block text-sm">
                🔒 {d.label}
              </span>
              <span className="block text-xs mt-0.5">
                Opens {formatDay(d.date, { day: "numeric", month: "short" })}
              </span>
            </button>
          )
        return (
          <button
            key={d.date}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(d.date)}
            className={cn(
              "shrink-0 min-w-28 rounded-3xl border px-4 py-3 text-left transition cursor-pointer",
              active
                ? "bg-ink text-paper border-ink"
                : "bg-paper border-line hover:border-ink/30",
            )}
          >
            <span className="block text-sm font-semibold">{d.label}</span>
            <span
              className={cn(
                "block text-xs mt-0.5",
                active ? "text-paper/70" : "text-ink-soft",
              )}
            >
              {formatDay(d.date, { day: "numeric", month: "short" })}
            </span>
          </button>
        )
      })}
    </div>
  )
}
