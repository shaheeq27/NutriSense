import { api } from "../client"
import type { MealPlanDay, PlannedMeal, Slot, SwapOption } from "@/types"

const slotPath = (date: string, slot: Slot) =>
  `/meal-plans/${date}/slots/${slot}`

export const mealPlanEndpoints = {
  list: (start: string) =>
    api.get<MealPlanDay[]>("/meal-plans", { query: { start } }),
  generate: (date: string) =>
    api.post<MealPlanDay>(`/meal-plans/${date}/generate`),
  options: (date: string, slot: Slot) =>
    api.get<SwapOption[]>(`${slotPath(date, slot)}/options`),
  swap: (date: string, slot: Slot, template_id: string) =>
    api.post<PlannedMeal>(`${slotPath(date, slot)}/swap`, { template_id }),
  addItem: (date: string, slot: Slot, food_id: string, servings: number) =>
    api.post<PlannedMeal>(`${slotPath(date, slot)}/items`, {
      food_id,
      servings,
    }),
}
