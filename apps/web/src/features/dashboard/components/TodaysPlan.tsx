"use client"

import Link from "next/link"
import { EmptyState, Skeleton } from "@/components/ui"
import { usePlanWindow } from "@/features/meal-planning/hooks/useMealPlans"
import { SLOT_META } from "@/features/tracking/slots"
import { toISODate } from "@/lib/dates"
import { cn } from "@/lib/format"
import { SLOTS } from "@/types"

export default function TodaysPlan() {
  const today = toISODate(new Date())
  const { data, isPending, isError } = usePlanWindow(today)
  if (isPending) return <Skeleton className="h-40" />
  const day = data?.find((d) => d.date === today)
  if (isError || !day || !day.meals.length)
    return (
      <EmptyState
        icon="🧺"
        title="No plan for today yet"
        action={
          <Link
            href="/plan"
            className="font-semibold text-primary underline underline-offset-4"
          >
            Build today&apos;s plan →
          </Link>
        }
      />
    )

  const meals = [...day.meals].sort(
    (a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot),
  )
  return (
    <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {meals.map((m) => (
        <li key={m.id}>
          <Link
            href="/plan"
            className={cn(
              "block h-full rounded-3xl border p-4 transition hover:border-ink/30",
              m.logged ? "bg-mint border-transparent" : "bg-paper border-line",
            )}
          >
            <span className="font-mono text-[11px] uppercase tracking-[.16em] text-ink-soft">
              <span aria-hidden>{SLOT_META[m.slot].icon}</span>{" "}
              {SLOT_META[m.slot].label}
            </span>
            <span className="block font-semibold mt-2 line-clamp-2">
              {m.name}
            </span>
            <span className="block font-mono text-xs text-ink-soft mt-2">
              {Math.round(m.kcal)} kcal {m.logged && "· ✓ eaten"}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
