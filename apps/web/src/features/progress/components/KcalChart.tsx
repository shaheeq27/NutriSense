import { formatDay } from "@/lib/dates"
import { cn } from "@/lib/format"
import type { ProgressPoint } from "@/types"

/** Lightweight bar chart; bars within ±10% of target read as on-track. */
export default function KcalChart({
  points,
  target,
}: {
  points: ProgressPoint[]
  target: number
}) {
  const max = Math.max(target * 1.25, ...points.map((p) => p.kcal), 1)
  const dense = points.length > 14
  return (
    <figure>
      <div
        className="relative h-48 flex items-end gap-1"
        role="img"
        aria-label={`Daily calories over ${points.length} days against a ${target} kcal target`}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 border-t border-dashed border-ink/30"
          style={{ bottom: `${(target / max) * 100}%` }}
        >
          <span className="absolute right-0 -top-5 font-mono text-[10px] text-ink-soft">
            target {target}
          </span>
        </div>
        {points.map((p) => {
          const ok = p.kcal > 0 && Math.abs(p.kcal - target) <= target * 0.1
          return (
            <div
              key={p.date}
              className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
              title={`${formatDay(p.date)}: ${Math.round(p.kcal)} kcal`}
            >
              <div
                className={cn(
                  "w-full rounded-t-lg transition-all",
                  p.kcal === 0
                    ? "bg-sand h-1"
                    : ok
                      ? "bg-primary"
                      : "bg-accent/80",
                )}
                style={
                  p.kcal ? { height: `${(p.kcal / max) * 100}%` } : undefined
                }
              />
            </div>
          )
        })}
      </div>
      {!dense && (
        <div aria-hidden className="flex gap-1 mt-2">
          {points.map((p) => (
            <span
              key={p.date}
              className="flex-1 text-center font-mono text-[10px] text-ink-soft"
            >
              {formatDay(p.date, { weekday: "narrow" })}
            </span>
          ))}
        </div>
      )}
      <figcaption className="mt-3 flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> On track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-accent/80" /> Off target
        </span>
      </figcaption>
    </figure>
  )
}
