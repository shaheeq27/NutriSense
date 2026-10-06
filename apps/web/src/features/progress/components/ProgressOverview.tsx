"use client"

import { useState } from "react"
import {
  Card,
  EmptyState,
  Eyebrow,
  SegmentedControl,
  Skeleton,
  Title,
} from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import type { ProgressRange } from "@/types"
import { useProgress } from "../hooks/useProgress"
import KcalChart from "./KcalChart"

const RANGES: { value: ProgressRange label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "3 months" },
]

export default function ProgressOverview({ compact }: { compact?: boolean }) {
  const [range, setRange] = useState<ProgressRange>("7d")
  const { data, isPending, isError, error } = useProgress(range)
  const target = useAuthStore((s) => s.user?.targets?.kcal) ?? 2000

  const body = isPending ? (
    <Skeleton className="h-64" />
  ) : isError ? (
    <EmptyState
      tone="error"
      icon="📉"
      title="Progress is taking a breather"
      description={errorMessage(error)}
    />
  ) : data.points.every((p) => p.kcal === 0) ? (
    <EmptyState
      icon="🌱"
      title="Your story starts today"
      description="Log a few meals and your trends will grow here."
    />
  ) : (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Avg kcal", Math.round(data.averages.kcal).toLocaleString()],
          ["Avg protein", `${Math.round(data.averages.protein)}g`],
          ["Streak", `${data.streak_days}d`],
        ].map(([l, v]) => (
          <Card key={l} tone="mint" className="p-4">
            <Eyebrow>{l}</Eyebrow>
            <p className="font-display text-3xl mt-1">{v}</p>
          </Card>
        ))}
      </div>
      <Card className="p-6 mt-4">
        <KcalChart points={data.points} target={target} />
        <p className="mt-4 text-sm text-ink-soft">
          You were on track{" "}
          <strong className="text-ink">
            {Math.round(data.adherence_pct)}%
          </strong>{" "}
          of days.
        </p>
      </Card>
    </>
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        {compact ? (
          <h2 className="font-display display-soft text-2xl">Progress</h2>
        ) : (
          <div>
            <Eyebrow>Progress</Eyebrow>
            <Title className="mt-3">Small steps, adding up.</Title>
          </div>
        )}
        <SegmentedControl
          label="Time range"
          idPrefix="progress"
          options={RANGES}
          value={range}
          onChange={setRange}
        />
      </div>
      <div
        role="tabpanel"
        id={`progress-panel-${range}`}
        aria-labelledby={`progress-tab-${range}`}
      >
        {body}
      </div>
    </div>
  )
}
