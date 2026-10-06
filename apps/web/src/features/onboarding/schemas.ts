import { z } from "zod"
import { boundedNumber } from "@/lib/validation"

export const profileSchema = z.object({
  goal: z.enum(["lose", "maintain", "gain", "eat_healthier"], {
    message: "Pick a goal",
  }),
  sex: z.enum(["female", "male", "other"], { message: "Choose one" }),
  age: boundedNumber("Age", 13, 100),
  height_cm: boundedNumber("Height", 100, 250),
  weight_kg: boundedNumber("Weight", 30, 300),
  activity_level: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  diet_style: z.enum([
    "omnivore",
    "vegetarian",
    "vegan",
    "pescatarian",
    "eggetarian",
  ]),
  allergies: z.array(z.string().trim().min(1)).max(12),
})

export type ProfileInput = z.input<typeof profileSchema>
export type ProfileValues = z.output<typeof profileSchema>

export const GOALS = [
  {
    value: "lose",
    icon: "🌿",
    title: "Lose weight gently",
    desc: "A steady, sustainable deficit.",
  },
  {
    value: "maintain",
    icon: "⚖️",
    title: "Maintain",
    desc: "Keep things balanced.",
  },
  {
    value: "gain",
    icon: "💪",
    title: "Build strength",
    desc: "More protein, more fuel.",
  },
  {
    value: "eat_healthier",
    icon: "🥗",
    title: "Eat healthier",
    desc: "Better food, no number obsession.",
  },
] as const

export const ACTIVITY = [
  { value: "sedentary", label: "Mostly sitting" },
  { value: "light", label: "Lightly active" },
  { value: "moderate", label: "Moderately active" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very active" },
] as const

export const DIETS = [
  { value: "omnivore", label: "Everything" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
] as const

export const COMMON_ALLERGIES = [
  "Peanuts",
  "Tree nuts",
  "Dairy",
  "Gluten",
  "Eggs",
  "Soy",
  "Shellfish",
]
