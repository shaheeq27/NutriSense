import type { Slot } from "@/types"

export const SLOT_META: Record<Slot, { label: string icon: string }> = {
  breakfast: { label: "Breakfast", icon: "🌅" },
  lunch: { label: "Lunch", icon: "☀️" },
  snack: { label: "Snack", icon: "☕" },
  dinner: { label: "Dinner", icon: "🌙" },
}

/** Best-guess slot from the local time of day. */
export function slotForHour(h: number): Slot {
  if (h < 11) return "breakfast"
  if (h < 15) return "lunch"
  if (h < 18) return "snack"
  return "dinner"
}
