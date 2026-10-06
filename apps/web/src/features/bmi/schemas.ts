import { z } from "zod"
import { boundedNumber } from "@/lib/validation"

export const bmiSchema = z.object({
  height_cm: boundedNumber("Height", 100, 250),
  weight_kg: boundedNumber("Weight", 30, 300),
})
export type BmiInput = z.input<typeof bmiSchema>
export type BmiValues = z.output<typeof bmiSchema>
