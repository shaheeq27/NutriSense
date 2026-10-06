/** Typed models mirroring the NutriSense API (/api/v1). */

export type Slot = "breakfast" | "lunch" | "snack" | "dinner"
export const SLOTS: readonly Slot[] = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
] as const

export type Goal = "lose" | "maintain" | "gain" | "eat_healthier"
export type Sex = "female" | "male" | "other"
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active"
export type DietStyle = "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "eggetarian"

export interface User {
  id: string
  email: string
  name: string
  created_at?: string
  profile?: Profile | null
  targets?: Targets | null
}

export interface Profile {
  goal: Goal
  sex: Sex
  age: number
  height_cm: number
  weight_kg: number
  activity_level: ActivityLevel
  diet_style: DietStyle
  allergies: string[]
}

export interface Targets {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Food {
  id: string
  name: string
  tag: string
  unit: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  emoji?: string | null
  image_url?: string | null
  source?: string
  slug?: string
  estimated?: boolean
}

export interface FoodSearchResponse {
  items: Food[]
  estimate: Food | null
}

export interface NutritionFacts {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  servings: number
  unit: string
  /** Percent of daily value keyed by nutrient. */
  daily_values: Record<string, number>
}

export interface ParsedItem {
  food: Food
  quantity: number
  nutrition: NutritionFacts
}

export interface ParseResponse {
  items: ParsedItem[]
  totals: NutritionFacts
}

export interface ScanCandidate {
  food: Food
  confidence: number
}

export interface ScanResponse {
  candidates: ScanCandidate[]
}

export type BmiCategory = "underweight" | "healthy" | "overweight" | "obese"

export interface BmiResult {
  bmi: number
  category: BmiCategory | string
  healthy_weight_min_kg: number
  healthy_weight_max_kg: number
  message: string
}

export interface PlannedMeal {
  id: string
  slot: Slot
  template_id?: string | null
  name: string
  description?: string
  tags?: string[]
  kcal: number
  protein: number
  carbs: number
  fat: number
  image_url?: string | null
  emoji?: string | null
  why?: string
  logged?: boolean
}

export interface MealPlanDay {
  date: string // YYYY-MM-DD
  meals: PlannedMeal[]
  totals: Targets
  targets?: Targets
}

export interface SwapOption {
  template_id: string
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  reason?: string
  image_url?: string | null
  emoji?: string | null
}

export interface FoodLog {
  id: string
  slot: Slot
  name: string
  servings: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  food_id?: string | null
  planned_meal_id?: string | null
  logged_at: string
}

export interface CustomFoodInput {
  name: string
  kcal: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface CreateLogInput {
  slot: Slot
  servings: number
  food_id?: string
  planned_meal_id?: string
  custom?: CustomFoodInput
}

export interface DailySummary {
  date: string
  consumed: Targets
  targets: Targets
  remaining: Targets
  logs: FoodLog[]
}

export type ProgressRange = "7d" | "30d" | "90d"

export interface ProgressPoint {
  date: string
  kcal: number
  protein: number
  weight_kg?: number | null
}

export interface ProgressSeries {
  range: ProgressRange
  points: ProgressPoint[]
  averages: { kcal: number protein: number }
  streak_days: number
  adherence_pct: number
}

export interface Recommendation {
  id: string
  kind: "tip" | "warning" | "win" | string
  title: string
  body: string
  action?: { label: string href: string } | null
}

export interface ApiErrorBody {
  error: { code: string message: string details?: unknown }
}
