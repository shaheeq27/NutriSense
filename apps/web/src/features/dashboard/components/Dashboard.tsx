"use client"

/** Order: goals → today's plan → actual food → nutrition → progress → insights. */

import Link from "next/link"
import type { ReactNode } from "react"
import { Eyebrow, Title } from "@/components/ui"
import ProgressOverview from "@/features/progress/components/ProgressOverview"
import Insights from "@/features/recommendations/components/Insights"
import TodaySummary from "@/features/tracking/components/TodaySummary"
import { useAuthStore } from "@/stores/auth-store"
import GoalsCard from "./GoalsCard"
import TodaysPlan from "./TodaysPlan"

function Section({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string
  href?: string
  linkLabel?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display display-soft text-2xl">{title}</h2>
        {href && (
          <Link
            href={href}
            className="text-sm font-semibold text-primary hover:underline underline-offset-4"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function greeting(h: number) {
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}
export default function Dashboard() {
  const name = useAuthStore((s) => s.user?.name?.split(" ")[0])
  return (
    <div className="space-y-12">
      <div>
        <Eyebrow>
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Eyebrow>
        <Title className="mt-3">
          {greeting(new Date().getHours())}
          {name ? `, ${name}` : ""}.
        </Title>
      </div>
      <GoalsCard />
      <Section title="Today's plan" href="/plan" linkLabel="Open meal plan →">
        <TodaysPlan />
      </Section>
      <Section
        title="What you've eaten"
        href="/today"
        linkLabel="Today's log →"
      >
        <TodaySummary compact />
      </Section>
      <ProgressOverview compact />
      <Section title="Insights for you">
        <Insights />
      </Section>
    </div>
  )
}
