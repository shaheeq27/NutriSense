import { z } from "zod"
import { servings } from "@/lib/validation"

export const slotSchema = z.enum(["breakfast", "lunch", "snack", "dinner"])

export const customFoodSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(80),
  kcal: z.coerce
    .number()
    .min(0, "Can't be negative")
    .max(5000, "That seems high"),
  protein: z.coerce.number().min(0).max(500).optional(),
  carbs: z.coerce.number().min(0).max(1000).optional(),
  fat: z.coerce.number().min(0).max(500).optional(),
})

/** Exactly one source: a food, a planned meal, or a custom entry. */
export const createLogSchema = z
  .object({
    slot: slotSchema,
    servings,
    food_id: z.string().min(1).optional(),
    planned_meal_id: z.string().min(1).optional(),
    custom: customFoodSchema.optional(),
  })
  .refine(
    (v) =>
      [v.food_id, v.planned_meal_id, v.custom].filter((x) => x !== undefined)
        .length === 1,
    {
      message: "Choose exactly one food source",
    },
  )

export type CreateLogValues = z.output<typeof createLogSchema>
