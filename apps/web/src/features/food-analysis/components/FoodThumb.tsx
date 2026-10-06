import { cn } from "@/lib/format"
import type { Food } from "@/types"

export default function FoodThumb({
  food,
  className,
}: {
  food: Pick<Food, "name" | "emoji" | "image_url">
  className?: string
}) {
  return (
    <span
      className={cn(
        "shrink-0 grid place-items-center rounded-2xl bg-sand overflow-hidden size-14 text-2xl",
        className,
      )}
    >
      {food.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={food.image_url}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span aria-hidden>{food.emoji ?? "🍽️"}</span>
      )}
    </span>
  )
}
