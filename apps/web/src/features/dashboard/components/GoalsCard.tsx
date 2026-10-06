"use client"

import Link from "next/link"
import { Badge, Card, Eyebrow } from "@/components/ui"
import { GOALS } from "@/features/onboarding/schemas"
import { useMe } from "@/features/profile/hooks/useProfile"

export default function GoalsCard() {
  const { data: user } = useMe()
  const p = user?.profile
  const t = user?.targets
  const goal = GOALS.find((g) => g.value === p?.goal)
  if (!p || !t)
    return (
      <Card
        tone="peach"
        className="p-6 flex flex-wrap items-center justify-between gap-4"
      >
        <p className="font-semibold">
          Finish your profile to unlock personal targets.
        </p>
        <Link
          href="/onboarding"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Set my goals →
        </Link>
      </Card>
    )
  return (
    <Card
      tone="ink"
      className="p-6 md:p-7 flex flex-wrap items-center gap-6 justify-between"
    >
      <div>
        <Eyebrow className="text-cream/60">Your goal</Eyebrow>
        <p className="font-display display-soft text-3xl mt-2">
          <span aria-hidden>{goal?.icon}</span> {goal?.title}
        </p>
      </div>
      <dl className="flex gap-6 font-mono text-sm">
        {([
          ["kcal", t.kcal],
          ["protein", `${t.protein}g`],
          ["carbs", `${t.carbs}g`],
          ["fat", `${t.fat}g`],
        ] as const).map(([k, v]) => (
          <div key={k}>
            <dt className="text-cream/60 text-[11px] uppercase tracking-widest">
              {k}
            </dt>
            <dd className="text-lg text-cream">
              {typeof v === "number" ? v.toLocaleString() : v}
            </dd>
          </div>
        ))}
      </dl>
      <Badge tone="orange" className="hidden lg:inline-flex">
        Daily targets
      </Badge>
    </Card>
  )
}
