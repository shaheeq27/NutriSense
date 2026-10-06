import { Badge, Card } from "@/components/ui"
import { SLOT_META } from "@/features/tracking/slots"
import type { PlannedMeal } from "@/types"

export default function MealCard({
  meal,
  onSwap,
  onLog,
  canLog,
}: {
  meal: PlannedMeal
  onSwap: () => void
  onLog: () => void
  canLog: boolean
}) {
  const s = SLOT_META[meal.slot]
  return (
    <Card className="p-4 flex gap-4">
      <span className="shrink-0 size-24 rounded-3xl bg-sand overflow-hidden grid place-items-center text-4xl">
        {meal.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.image_url}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <span aria-hidden>{meal.emoji ?? s.icon}</span>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] uppercase tracking-[.16em] text-ink-soft">
            <span aria-hidden>{s.icon}</span> {s.label}
          </span>
          {meal.logged && <Badge tone="green">✓ Eaten</Badge>}
        </div>
        <h3 className="font-semibold text-lg mt-1 truncate">{meal.name}</h3>
        {meal.why && (
          <p className="text-sm text-ink-soft line-clamp-2">{meal.why}</p>
        )}
        <p className="mt-2 font-mono text-xs text-ink-soft">
          {Math.round(meal.kcal)} kcal · P {Math.round(meal.protein)} · C{" "}
          {Math.round(meal.carbs)} · F {Math.round(meal.fat)}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onSwap}
            className="h-8 px-3 rounded-full border border-line text-sm font-semibold hover:border-ink/30 cursor-pointer"
          >
            ⇄ Swap
          </button>
          {canLog && !meal.logged && (
            <button
              type="button"
              onClick={onLog}
              className="h-8 px-3 rounded-full bg-primary text-on-primary text-sm font-semibold cursor-pointer"
            >
              ✓ I ate this
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
