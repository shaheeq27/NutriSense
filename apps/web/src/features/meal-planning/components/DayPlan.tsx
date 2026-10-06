"use client"

import { useState } from "react"
import { Button, EmptyState, Skeleton, useToast } from "@/components/ui"
import LogSheet from "@/features/tracking/components/LogSheet"
import { errorMessage } from "@/lib/api"
import { SLOTS, type MealPlanDay, type PlannedMeal, type Slot } from "@/types"
import { useGeneratePlan } from "../hooks/useMealPlans"
import MealCard from "./MealCard"
import SwapSheet from "./SwapSheet"

export default function DayPlan({
  date,
  day,
  isToday,
  loading,
}: {
  date: string
  day?: MealPlanDay
  isToday: boolean
  loading?: boolean
}) {
  const [swapSlot, setSwapSlot] = useState<Slot | null>(null)
  const [logMeal, setLogMeal] = useState<PlannedMeal | null>(null)
  const generate = useGeneratePlan()
  const { error } = useToast()

  if (loading)
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {SLOTS.map((s) => (
          <Skeleton key={s} className="h-36" />
        ))}
      </div>
    )

  if (!day || day.meals.length === 0)
    return (
      <EmptyState
        icon="🧺"
        title="No plan for this day yet"
        description="We'll build four balanced meals around your goals and preferences."
        action={
          <Button
            loading={generate.isPending}
            onClick={() =>
              generate.mutate(date, { onError: (e) => error(errorMessage(e)) })
            }
          >
            Build this day →
          </Button>
        }
      />
    )

  const meals = [...day.meals].sort(
    (a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot),
  )
  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        {meals.map((m) => (
          <MealCard
            key={m.id}
            meal={m}
            canLog={isToday}
            onSwap={() => setSwapSlot(m.slot)}
            onLog={() => setLogMeal(m)}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          loading={generate.isPending}
          onClick={() =>
            generate.mutate(date, { onError: (e) => error(errorMessage(e)) })
          }
        >
          ↻ Regenerate day
        </Button>
      </div>
      <SwapSheet
        date={date}
        slot={swapSlot}
        onClose={() => setSwapSlot(null)}
      />
      {logMeal && (
        <LogSheet
          key={logMeal.id}
          open
          onClose={() => setLogMeal(null)}
          meal={logMeal}
        />
      )}
    </>
  )
}
