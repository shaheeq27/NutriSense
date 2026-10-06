export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"

export type BackendFoodOut = {
  id: number | null
  slug: string
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
  emoji: string
  image_url: string | null
  source: string
  estimated: boolean
}

export type FoodSearchResponse = {
  items: BackendFoodOut[]
  estimate: BackendFoodOut | null
}

export async function apiSearchFoods(
  q: string,
  signal?: AbortSignal,
): Promise<FoodSearchResponse> {
  const res = await fetch(
    `${API_BASE}/foods/search?q=${encodeURIComponent(q)}`,
    { signal },
  )
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}

export async function apiSearchPackagedFoods(
  q: string,
  signal?: AbortSignal,
): Promise<BackendFoodOut[]> {
  const res = await fetch(
    `${API_BASE}/foods/packaged/search?q=${encodeURIComponent(q)}`,
    { signal },
  )
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}

export async function apiGetBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<BackendFoodOut> {
  const res = await fetch(
    `${API_BASE}/foods/barcode/${encodeURIComponent(barcode)}`,
    { signal },
  )
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}

export type CalculateRequest = {
  food_id?: number
  slug?: string
  servings?: number
  portion_grams?: number
}

export type NutritionFacts = {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  servings: number
  unit: string
  portion_grams: number | null
  daily_values: Record<string, number>
}

export async function apiCalculateNutrition(
  req: CalculateRequest,
  signal?: AbortSignal,
): Promise<NutritionFacts> {
  const res = await fetch(`${API_BASE}/nutrition/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...req,
      slug: req.food_id != null ? undefined : req.slug,
    }),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API Error: ${res.status} ${text}`)
  }
  return res.json()
}

const TOKEN_KEY = "nutrisense_token"
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

async function parseErrorResponse(
  res: Response,
  fallbackPrefix: string,
): Promise<ApiError> {
  let msg = `${fallbackPrefix}: ${res.status}`
  let code: string | undefined
  try {
    const errJson = await res.json()
    if (errJson?.error?.message) msg = errJson.error.message
    if (errJson?.error?.code) code = errJson.error.code
  } catch {
    const text = await res.text().catch(() => "")
    if (text) msg = text
  }
  return new ApiError(res.status, msg, code)
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers || {})
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers })
  if (!res.ok) {
    throw await parseErrorResponse(res, "API Error")
  }
  return res
}

export type LoginRequest = { email: string password: string }
export type RegisterRequest = { email: string password: string name: string }
export type TokenResponse = {
  access_token: string
  token_type: string
  user: {
    id: number
    email: string
    name: string
    created_at?: string | null
  }
}

export type UserProfileOut = {
  goal: string
  sex: string
  birth_year: number | null
  height_cm: number
  weight_kg: number
  activity_level: string
  diet_style: string
  allergies: string[]
}

export type NutritionTargets = {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  bmr: number
  tdee: number
}

export type UserMe = {
  id: number
  email: string
  name: string
  created_at?: string | null
  profile?: UserProfileOut | null
  targets?: NutritionTargets | null
}

export async function apiGetMe(signal?: AbortSignal): Promise<UserMe> {
  const res = await authFetch("/users/me", { signal })
  return res.json()
}

export type ProfileIn = {
  goal?: "lose" | "maintain" | "gain"
  sex: "male" | "female" | "other"
  birth_year?: number | null
  age?: number | null
  height_cm: number
  weight_kg: number
  activity_level?: "sedentary" | "light" | "moderate" | "active" | "very_active"
  diet_style?: "any" | "eggetarian" | "vegetarian" | "vegan"
  allergies?: string[]
}

export type ProfileWithTargets = {
  profile: UserProfileOut
  targets: NutritionTargets
}

export async function apiPutProfile(
  data: ProfileIn,
  signal?: AbortSignal,
): Promise<ProfileWithTargets> {
  const res = await authFetch("/users/me/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal,
  })
  return res.json()
}

export async function apiUpdateMe(
  data: { name?: string },
  signal?: AbortSignal,
): Promise<UserMe> {
  const res = await authFetch("/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal,
  })
  return res.json()
}

export async function apiLogin(req: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    throw await parseErrorResponse(res, "Login failed")
  }
  return res.json()
}

export async function apiRegister(
  req: RegisterRequest,
): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    throw await parseErrorResponse(res, "Registration failed")
  }
  return res.json()
}

export type CustomFoodIn = {
  name: string
  kcal: number
  protein?: number
  carbs?: number
  fat?: number
}

export type LogCreateRequest = {
  slot: string
  food_id?: number
  slug?: string
  planned_meal_id?: number
  custom?: CustomFoodIn
  servings?: number
  portion_grams?: number
  date?: string
}

export type LogOut = {
  id: number
  date: string
  slot: string
  name: string
  food_id?: number
  slug?: string
  image_url?: string
  planned_meal_id?: number
  servings: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  created_at?: string
}

export async function apiLogFood(
  req: LogCreateRequest,
  signal?: AbortSignal,
): Promise<LogOut> {
  const payload: any = { ...req, slot: req.slot.toLowerCase() }

  if (payload.planned_meal_id != null) {
    delete payload.food_id
    delete payload.slug
    delete payload.custom
  } else if (payload.food_id != null) {
    delete payload.slug
    delete payload.custom
    delete payload.planned_meal_id
  } else if (payload.slug != null) {
    delete payload.food_id
    delete payload.custom
    delete payload.planned_meal_id
  } else if (payload.custom != null) {
    delete payload.food_id
    delete payload.slug
    delete payload.planned_meal_id
  }

  if (payload.portion_grams != null) {
    delete payload.servings
  } else if (payload.servings != null) {
    delete payload.portion_grams
  }

  // Remove undefined fields so they aren't sent
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k]
  }

  const res = await authFetch("/tracking/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  })

  return res.json()
}

export type DailyTotals = {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export type Targets = {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  bmr: number
  tdee: number
}

export type SlotSummary = {
  slot: string
  entries: LogOut[]
  kcal: number
}

export type DailySummary = {
  date: string
  totals: DailyTotals
  targets: Targets
  remaining_kcal: number
  percent: Record<string, number>
  slots: SlotSummary[]
}

export async function apiGetToday(signal?: AbortSignal): Promise<DailySummary> {
  const res = await authFetch("/tracking/today", { signal })
  return res.json()
}

export type PlannedMealOut = {
  id: number
  slot: string
  name: string
  food_id?: number
  slug?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  servings: number
  template_id: number | null
  custom: boolean
  eaten: boolean
}

export type MealPlanDayOut = {
  date: string
  meals: PlannedMealOut[]
  total_kcal: number
  target_kcal: number
}

export type AddItemRequest = {
  food_id?: number
  slug?: string
  servings?: number
  portion_grams?: number
}

export async function apiAddToMealPlan(
  day: string,
  slot: string,
  req: AddItemRequest,
  signal?: AbortSignal,
): Promise<MealPlanDayOut> {
  const payload: any = { ...req }
  if (payload.food_id != null) {
    delete payload.slug
  } else if (payload.slug != null) {
    delete payload.food_id
  }

  if (payload.portion_grams != null) {
    delete payload.servings
  } else if (payload.servings != null) {
    delete payload.portion_grams
  }

  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k]
  }

  const s = slot.toLowerCase()
  const res = await authFetch(`/meal-plans/${day}/slots/${s}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  })
  return res.json()
}

export type MealPlanWindow = {
  days: MealPlanDayOut[]
  window_start: string
  window_end: string
}

export async function apiGetMealPlans(
  start: string,
  signal?: AbortSignal,
): Promise<MealPlanWindow> {
  const res = await authFetch(`/meal-plans?start=${start}`, { signal })
  return res.json()
}

export async function apiRemoveFromMealPlan(
  day: string,
  slot: string,
  itemId: number,
  signal?: AbortSignal,
): Promise<MealPlanDayOut> {
  const s = slot.toLowerCase()
  const res = await authFetch(`/meal-plans/${day}/slots/${s}/items/${itemId}`, {
    method: "DELETE",
    signal,
  })
  return res.json()
}

export type MealOption = {
  template_id: number
  slot: string
  name: string
  description: string
  tags: string
  why: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  image_url: string | null
}

export async function apiGenerateMealPlan(
  day: string,
  signal?: AbortSignal,
): Promise<MealPlanDayOut> {
  const res = await authFetch(`/meal-plans/${day}/generate`, {
    method: "POST",
    signal,
  })
  return res.json()
}

export async function apiGetMealPlanOptions(
  day: string,
  slot: string,
  signal?: AbortSignal,
): Promise<MealOption[]> {
  const s = slot.toLowerCase()
  const res = await authFetch(`/meal-plans/${day}/slots/${s}/options`, {
    signal,
  })
  return res.json()
}

export async function apiSwapMeal(
  day: string,
  slot: string,
  templateId: number,
  signal?: AbortSignal,
): Promise<MealPlanDayOut> {
  const s = slot.toLowerCase()
  const res = await authFetch(`/meal-plans/${day}/slots/${s}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template_id: templateId }),
    signal,
  })
  return res.json()
}

export type Insight = {
  code: string
  severity: "info" | "tip" | "warning"
  title: string
  message: string
}

export type RecommendationsResponse = {
  insights: Insight[]
}

export async function apiGetRecommendations(
  signal?: AbortSignal,
): Promise<RecommendationsResponse> {
  const res = await authFetch("/recommendations/today", { signal })
  return res.json()
}

export async function apiRemoveTrackingLog(
  logId: number,
  signal?: AbortSignal,
): Promise<void> {
  await authFetch(`/tracking/logs/${logId}`, {
    method: "DELETE",
    signal,
  })
}

export type ProgressRange = "7d" | "30d" | "90d"

export type DailyPoint = {
  date: string
  kcal: number
  protein: number
  logged: boolean
  on_target: boolean
}

export type ProgressResponse = {
  range: ProgressRange
  start: string
  end: string
  days: DailyPoint[]
  points: DailyPoint[]
  avg_kcal: number
  avg_protein: number
  averages?: { kcal: number protein: number }
  days_logged: number
  total_meals_logged: number
  top_slot: string | null
  adherence_pct: number
  current_streak: number
  streak_days: number
  best_streak?: number
  lifetime_logged_days?: number
  shields_available?: number
  target_kcal: number
  target_protein: number
}

export async function apiGetProgress(
  range: ProgressRange = "7d",
  signal?: AbortSignal,
): Promise<ProgressResponse> {
  const res = await authFetch(`/progress?range=${range}`, { signal })
  return res.json()
}

// ── Scan ──────────────────────────────────────────────────────────────

export type ScanCandidate = {
  food: BackendFoodOut
  confidence: number
}

export type ScanResponse = {
  candidates: ScanCandidate[]
  provider: string
}

export async function apiScanImage(
  image: Blob,
  filename?: string,
  signal?: AbortSignal,
): Promise<ScanResponse> {
  const form = new FormData()
  form.append("image", image, filename || "scan.jpg")

  const res = await fetch(`${API_BASE}/scan/identify`, {
    method: "POST",
    body: form,
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API Error: ${res.status} ${text}`)
  }
  return res.json()
}

// ── AI Meal Assistant ─────────────────────────────────────────────────

export type AIMealSuggestion = {
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  ingredients: string[]
  meal_type: string
  food_id?: number | null
  slug?: string | null
}

export type AIChatResponse = {
  message: string
  meal: AIMealSuggestion | null
}

export async function apiAIChat(
  message: string,
  signal?: AbortSignal,
): Promise<AIChatResponse> {
  const res = await authFetch("/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  })
  return res.json()
}

/**
 * Add an AI-suggested meal to the user's meal plan.
 * Reuses the existing meal-plan add-item endpoint.
 */
export async function apiAddAISuggestionToPlan(
  day: string,
  meal: AIMealSuggestion,
  signal?: AbortSignal,
): Promise<MealPlanDayOut> {
  const req: AddItemRequest = {}
  if (meal.food_id != null) {
    req.food_id = meal.food_id
  } else if (meal.slug) {
    req.slug = meal.slug
  }
  return apiAddToMealPlan(day, meal.meal_type, req, signal)
}
