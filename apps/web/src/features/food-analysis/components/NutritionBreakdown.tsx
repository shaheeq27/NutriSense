import { ProgressBar } from "@/components/ui"
import { round } from "@/lib/format"
import type { NutritionFacts } from "@/types"

const ROWS: {
  key: keyof NutritionFacts
  label: string
  unit: string
  tone: "primary" | "accent" | "golden" | "secondary" | "tomato"
}[] = [
  { key: "protein", label: "Protein", unit: "g", tone: "primary" },
  { key: "carbs", label: "Carbs", unit: "g", tone: "golden" },
  { key: "fat", label: "Fat", unit: "g", tone: "accent" },
  { key: "fiber", label: "Fiber", unit: "g", tone: "secondary" },
  { key: "sugar", label: "Sugar", unit: "g", tone: "tomato" },
  { key: "sodium", label: "Sodium", unit: "mg", tone: "tomato" },
]

export default function NutritionBreakdown({
  facts,
}: {
  facts: NutritionFacts
}) {
  return (
    <dl className="space-y-4">
      {ROWS.map((r) => {
        const v = facts[r.key] as number
        const dv = facts.daily_values?.[r.key]
        return (
          <div key={r.key}>
            <div className="flex justify-between text-sm mb-1.5">
              <dt className="font-semibold">{r.label}</dt>
              <dd className="font-mono">
                {round(v, 1)}
                {r.unit}
                {dv !== undefined && (
                  <span className="text-ink-soft"> · {Math.round(dv)}% DV</span>
                )}
              </dd>
            </div>
            <ProgressBar
              value={dv ?? 0}
              max={100}
              tone={r.tone}
              label={`${r.label} percent of daily value`}
            />
          </div>
        )
      })}
    </dl>
  )
}
