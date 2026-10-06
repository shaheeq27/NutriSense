"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { Card, EmptyState, Eyebrow, Title, useToast } from "@/components/ui"
import { errorMessage } from "@/lib/api"
import {
  formatDay,
  isWithinWindow,
  planningWindow,
  toISODate,
} from "@/lib/dates"
import { useAuthStore } from "@/stores/auth-store"
import { usePlanWindow } from "../hooks/useMealPlans"
import DayPlan from "./DayPlan"
import DayStrip from "./DayStrip"

export default function PlanView({ date }: { date?: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const today = toISODate(new Date())
  const days = useMemo(() => planningWindow(new Date()), [])
  const selected = date && isWithinWindow(date) ? date : today
  const plans = usePlanWindow(today)
  const targets = useAuthStore((s) => s.user?.targets)
  const day = plans.data?.find((d) => d.date === selected)

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Your plan</Eyebrow>
        <Title className="mt-3">Know what&apos;s next.</Title>
        <p className="mt-3 text-ink-soft">
          Plan up to three days ahead. Swap anything that doesn&apos;t feel
          right.
        </p>
      </div>
      {date && date !== selected && (
        <p role="status" className="rounded-2xl bg-peach px-4 py-3 text-sm">
          {formatDay(date)} isn&apos;t open for planning yet — showing today
          instead.
        </p>
      )}
      <DayStrip
        days={days}
        selected={selected}
        onSelect={(d) => router.push(d === today ? "/plan" : `/plan/${d}`)}
        onLocked={(d) =>
          toast(`Planning for ${formatDay(d.date)} opens tomorrow`)
        }
      />
      {day && (
        <Card
          tone="mint"
          className="p-5 flex flex-wrap gap-x-8 gap-y-2 font-mono text-sm"
        >
          <span>
            <strong className="font-display text-2xl font-normal">
              {Math.round(day.totals.kcal)}
            </strong>{" "}
            / {(day.targets ?? targets)?.kcal ?? "—"} kcal
          </span>
          <span>P {Math.round(day.totals.protein)}g</span>
          <span>C {Math.round(day.totals.carbs)}g</span>
          <span>F {Math.round(day.totals.fat)}g</span>
        </Card>
      )}
      {plans.isError ? (
        <EmptyState
          tone="error"
          icon="🥲"
          title="We couldn't load your plan"
          description={errorMessage(plans.error)}
        />
      ) : (
        <DayPlan
          date={selected}
          day={day}
          isToday={selected === today}
          loading={plans.isPending}
        />
      )}
    </div>
  )
}
