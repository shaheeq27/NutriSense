import Link from "next/link"
import { Badge } from "@/components/ui"
import type { Food } from "@/types"
import FoodThumb from "./FoodThumb"

export default function FoodRow({
  food,
  extra,
}: {
  food: Food
  extra?: string
}) {
  return (
    <Link
      href={`/foods/${encodeURIComponent(food.id)}`}
      className="flex items-center gap-4 p-3 rounded-3xl hover:bg-sand/50 transition"
    >
      <FoodThumb food={food} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-semibold truncate">{food.name}</span>
          {food.estimated && <Badge tone="golden">Estimate</Badge>}
        </span>
        <span className="block text-sm text-ink-soft truncate">
          {food.tag} · per {food.unit}
          {extra ? ` · ${extra}` : ""}
        </span>
      </span>
      <span className="text-right">
        <span className="block font-mono font-medium">
          {Math.round(food.kcal)}
        </span>
        <span className="block text-[11px] text-ink-soft">kcal</span>
      </span>
    </Link>
  )
}
