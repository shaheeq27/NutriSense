import { ProgressBar } from "@/components/ui"
import type { Targets } from "@/types"

const MACROS = [
  { key: "protein", label: "Protein", tone: "primary" },
  { key: "carbs", label: "Carbs", tone: "golden" },
  { key: "fat", label: "Fat", tone: "accent" },
] as const

export default function MacroSummary({
  consumed,
  targets,
}: {
  consumed: Targets
  targets: Targets
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {MACROS.map((m) => (
        <div key={m.key}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold">{m.label}</span>
            <span className="font-mono text-ink-soft">
              {Math.round(consumed[m.key])}/{Math.round(targets[m.key])}g
            </span>
          </div>
          <ProgressBar
            value={consumed[m.key]}
            max={targets[m.key]}
            tone={m.tone}
            label={`${m.label} consumed`}
          />
        </div>
      ))}
    </div>
  )
}
