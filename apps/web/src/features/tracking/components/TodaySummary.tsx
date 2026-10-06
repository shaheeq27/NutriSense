"use client"

import Link from "next/link"
import { Card, EmptyState, Eyebrow, Ring, Skeleton } from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { useToday } from "../hooks/useTracking"
import MacroSummary from "./MacroSummary"

export default function TodaySummary({ compact }: { compact?: boolean }) {
  const { data, isPending, isError, error, refetch } = useToday()
  if (isPending) return <Skeleton className="h-64" />
  if (isError)
    return (
      <EmptyState
        tone="error"
        icon="🥲"
        title="Couldn't load today"
        description={errorMessage(error)}
        action={
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        }
      />
    )

  const { consumed, targets, remaining } = data
  const over = remaining.kcal < 0
  return (
    <Card className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        <Ring
          value={consumed.kcal}
          max={targets.kcal}
          size={compact ? 160 : 190}
          label={`${Math.round(consumed.kcal)} of ${targets.kcal} kcal eaten`}
        >
          <span className="font-display text-4xl">
            {Math.round(consumed.kcal).toLocaleString()}
          </span>
          <span className="text-xs text-ink-soft">
            of {targets.kcal.toLocaleString()} kcal
          </span>
        </Ring>
        <div className="flex-1 w-full">
          <Eyebrow>Actual food</Eyebrow>
          <p className="font-display display-soft text-2xl mt-2">
            {over
              ? `${Math.abs(Math.round(remaining.kcal))} kcal over — that's okay.`
              : `${Math.round(remaining.kcal)} kcal left for your day.`}
          </p>
          <div className="mt-5">
            <MacroSummary consumed={consumed} targets={targets} />
          </div>
          {compact && (
            <Link
              href="/today"
              className="inline-block mt-5 text-sm font-semibold text-primary hover:underline underline-offset-4"
            >
              See everything you logged →
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
