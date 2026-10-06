"use client"

import Link from "next/link"
import { Card, Skeleton } from "@/components/ui"
import { cn } from "@/lib/format"
import { useRecommendations } from "../hooks/useRecommendations"

const ICON: Record<string, string> = { tip: "💡", warning: "⚠️", win: "🎉" }

export default function Insights() {
  const { data, isPending, isError } = useRecommendations()
  if (isPending) return <Skeleton className="h-28" />
  if (isError || !data.length)
    return (
      <p className="text-sm text-ink-soft rounded-3xl border border-dashed border-sand-deep p-5">
        Insights appear once you&apos;ve logged a little. No pressure.
      </p>
    )
  return (
    <ul className="grid md:grid-cols-2 gap-4">
      {data.map((r) => (
        <li key={r.id}>
          <Card
            tone={
              r.kind === "warning"
                ? "peach"
                : r.kind === "win"
                  ? "mint"
                  : "paper"
            }
            className={cn("p-5 h-full flex gap-4")}
          >
            <span aria-hidden className="text-2xl">
              {ICON[r.kind] ?? "✨"}
            </span>
            <div>
              <h3 className="font-semibold">{r.title}</h3>
              <p className="text-sm text-ink-soft mt-1">{r.body}</p>
              {r.action && (
                <Link
                  href={r.action.href}
                  className="inline-block mt-3 text-sm font-semibold text-primary hover:underline underline-offset-4"
                >
                  {r.action.label} →
                </Link>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
