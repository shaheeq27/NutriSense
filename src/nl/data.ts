import type { StreakState } from "./streaks"
import type { UserMe, ProfileIn } from "./api"
const u = (id: string, w = 800, h = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`

export type Food = {
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
  img?: string
}

export const FOODS: Food[] = [
  {
    id: "biryani",
    name: "Chicken Biryani",
    tag: "Indian • Main course",
    unit: "plate",
    kcal: 680,
    protein: 28,
    carbs: 76,
    fat: 27,
    fiber: 4,
    sugar: 5,
    sodium: 1120,
    img: "https://authenticroyal.com/wp-content/uploads/2024/10/royal-rice-may-220461.jpg",
  },
  {
    id: "banana",
    name: "Banana",
    tag: "Fruit",
    unit: "medium",
    kcal: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    fiber: 3.1,
    sugar: 14,
    sodium: 1,
    img: u("1571771894821-ce9b6c11b08e"),
  },
  {
    id: "tikka",
    name: "Chicken Tikka",
    tag: "Indian • Main course",
    unit: "portion",
    kcal: 340,
    protein: 42,
    carbs: 8,
    fat: 15,
    fiber: 1,
    sugar: 3,
    sodium: 860,
    img: u("1599487488170-d11ec9c172f0"),
  },
  {
    id: "paneer",
    name: "Paneer Butter Masala",
    tag: "Indian • Curry",
    unit: "bowl",
    kcal: 480,
    protein: 18,
    carbs: 20,
    fat: 37,
    fiber: 3,
    sugar: 9,
    sodium: 940,
    img: u("1631452180519-c014fe946bc7"),
  },
  {
    id: "eggs",
    name: "2 Eggs + 2 Rotis",
    tag: "Breakfast • Combo",
    unit: "serving",
    kcal: 380,
    protein: 19,
    carbs: 42,
    fat: 14,
    fiber: 5,
    sugar: 2,
    sodium: 420,
  },
]

export type Meal = {
  slot: "Breakfast" | "Lunch" | "Snack" | "Dinner"
  icon: string
  name: string
  desc: string
  tags: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  done: boolean
  img?: string
  slug?: string
  why: string
}

export const SLOT_ICONS: Record<Meal["slot"], string> = {
  Breakfast: "🌅",
  Lunch: "☀️",
  Snack: "☕",
  Dinner: "🌙",
}

/** A day with nothing planned or logged yet: one blank card per slot. */
export const isEmptySlot = (m: Meal) => !m.name
export const emptyPlan = (): Meal[] =>
  (["Breakfast", "Lunch", "Snack", "Dinner"] as const).map((slot) => ({
    slot,
    icon: SLOT_ICONS[slot],
    name: "",
    desc: "",
    tags: "",
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    done: false,
    img: "",
    why: "",
  }))

export const PLAN: Meal[] = [
  {
    slot: "Breakfast",
    slug: "oats-banana-eggs",
    icon: "🥣",
    name: "Oats + Banana + Eggs",
    desc: "Rolled oats, sliced banana and two soft-boiled eggs.",
    tags: "Slow carbs • Protein start",
    kcal: 420,
    protein: 24,
    carbs: 58,
    fat: 12,
    done: true,
    why: "Gives you a steady morning and a head start on protein.",
  },
  {
    slot: "Lunch",
    slug: "chicken-rice-bowl",
    icon: "🍗",
    name: "Chicken Rice Bowl",
    desc: "Grilled chicken, jeera rice, cucumber and mint yoghurt.",
    tags: "Balanced • High Protein",
    kcal: 620,
    protein: 38,
    carbs: 72,
    fat: 18,
    done: true,
    why: "Fits your lunch target and supports your selected nutrition goal.",
  },
  {
    slot: "Snack",
    slug: "greek-yogurt-fruit",
    icon: "🥛",
    name: "Greek Yogurt + Fruit",
    desc: "Thick yogurt with berries and a drizzle of honey.",
    tags: "Light • Calcium",
    kcal: 220,
    protein: 14,
    carbs: 28,
    fat: 5,
    done: false,
    why: "A light protein bridge between lunch and dinner.",
  },
  {
    slot: "Dinner",
    slug: "paneer-roti",
    icon: "🧀",
    name: "Paneer + Roti",
    desc: "Palak paneer with two whole-wheat rotis.",
    tags: "Vegetarian • Fiber",
    kcal: 540,
    protein: 26,
    carbs: 52,
    fat: 24,
    done: false,
    why: "Rounds out your day with fiber and iron from spinach.",
  },
]

export const SWAPS = [
  {
    name: "Chicken Wrap",
    slug: "chicken-wrap",
    kcal: 520,
    protein: 34,
    why: "Lighter • Similar protein",
  },
  {
    name: "Paneer Rice Bowl",
    slug: "paneer-rice-bowl",
    kcal: 590,
    protein: 27,
    why: "Similar calories • Vegetarian",
  },
  {
    name: "Dal + Rice + Vegetables",
    slug: "dal-rice-vegetables",
    kcal: 540,
    protein: 22,
    why: "Higher fiber • Comfort pick",
  },
  {
    name: "Grilled Chicken Bowl",
    slug: "grilled-chicken-bowl",
    kcal: 480,
    protein: 44,
    why: "Fewer calories • Higher protein",
  },
]

export type Profile = {
  name: string
  email: string
  height: number
  weight: number
  age: number
  goal: string
  style: string
  allergies: string
  kcal: number
  notifications: boolean
  sex?: "female" | "male" | "other"
}

export function backendProfileToFrontend(
  user: UserMe,
  existing?: Partial<Profile>,
): Profile {
  const p = user.profile
  const t = user.targets
  const currentYear = new Date().getFullYear()
  const age = p?.birth_year ? currentYear - p.birth_year : (existing?.age ?? 25)

  const goalMap: Record<string, string> = {
    lose: "Lose Weight",
    maintain: "Eat More Balanced",
    gain: "Support Fitness",
  }

  const styleMap: Record<string, string> = {
    any: "Non-Vegetarian",
    omnivore: "Non-Vegetarian",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    eggetarian: "Eggetarian",
    pescatarian: "Pescatarian",
  }

  return {
    name: user.name,
    email: user.email,
    height: p?.height_cm ?? existing?.height ?? 170,
    weight: p?.weight_kg ?? existing?.weight ?? 68,
    age,
    goal: p?.goal
      ? (goalMap[p.goal] ?? p.goal)
      : (existing?.goal ?? "Eat More Balanced"),
    style: p?.diet_style
      ? (styleMap[p.diet_style] ?? p.diet_style)
      : (existing?.style ?? "Non-Vegetarian"),
    allergies:
      p?.allergies && p.allergies.length > 0
        ? p.allergies.join(", ")
        : (existing?.allergies ?? "None"),
    kcal: t?.kcal ?? existing?.kcal ?? 2100,
    notifications: existing?.notifications ?? true,
    sex: p?.sex as any ?? existing?.sex ?? "female",
  }
}

export function toBackendProfile(
  draft: Partial<Profile>,
  fallbackSex: "male" | "female" | "other" = "female",
): ProfileIn {
  let goal: "lose" | "maintain" | "gain" = "maintain"
  const g = (draft.goal || "").toLowerCase()
  if (
    g.includes("lose") ||
    g.includes("deficit") ||
    g.includes("fat") ||
    g.includes("manage weight")
  ) {
    goal = "lose"
  } else if (
    g.includes("gain") ||
    g.includes("muscle") ||
    g.includes("fitness") ||
    g.includes("strength")
  ) {
    goal = "gain"
  } else {
    goal = "maintain"
  }

  let diet_style: "any" | "eggetarian" | "vegetarian" | "vegan" = "any"
  const s = (draft.style || "").toLowerCase()
  if (s.includes("vegan")) diet_style = "vegan"
  else if (s.includes("vegetarian") && !s.includes("non"))
    diet_style = "vegetarian"
  else if (s.includes("eggetarian")) diet_style = "eggetarian"
  else diet_style = "any"

  let allergies: string[] = []
  if (Array.isArray(draft.allergies)) {
    allergies = draft.allergies
      .map((a: string) => a.trim().toLowerCase())
      .filter(Boolean)
  } else if (typeof draft.allergies === "string") {
    allergies = draft.allergies
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a && a !== "none")
  }

  return {
    goal,
    sex: draft.sex || fallbackSex,
    age: draft.age ? Number(draft.age) : 25,
    height_cm: Number(draft.height || 170),
    weight_kg: Number(draft.weight || 68),
    activity_level: "moderate",
    diet_style,
    allergies,
  }
}

export const DEFAULT_PROFILE: Profile = {
  name: "Guest",
  email: "",
  height: 170,
  weight: 68,
  age: 25,
  goal: "Eat More Balanced",
  style: "Non-Vegetarian",
  allergies: "None",
  kcal: 2100,
  notifications: true,
  sex: "female",
}
export const bmiOf = (p?: Partial<Pick<Profile, "height" | "weight">>) => {
  const h = p?.height ?? 0,
    w = p?.weight ?? 0
  return h > 0 && w > 0 ? Math.round((w / (h / 100) ** 2) * 10) / 10 : 0
}

export const TARGET = { kcal: 2100, protein: 110, carbs: 250, fat: 70 }
export const TODAY = { kcal: 1420, protein: 72, carbs: 165, fat: 48 }

export const WEEK = [
  { d: "Mon", kcal: 1980, protein: 92 },
  { d: "Tue", kcal: 2140, protein: 101 },
  { d: "Wed", kcal: 1760, protein: 84 },
  { d: "Thu", kcal: 2050, protein: 108 },
  { d: "Fri", kcal: 0, protein: 0 },
  { d: "Sat", kcal: 2210, protein: 112 },
  { d: "Sun", kcal: 1420, protein: 72 },
]

export const HERO_IMG = u("1512621776951-a57141f2eefd", 1200, 1400)

export type Screen = "landing" | "analyze" | "camera" | "identified" | "result" | "bmi" | "auth" | "onboard" | "dashboard" | "plan" | "meal" | "today" | "progress" | "profile" | "streaks"

export type Ctx = {
  go: (s: Screen) => void
  back?: () => void
  canBack?: boolean
  authed: boolean
  currentUser: UserMe | null
  setCurrentUser?: (u: UserMe | null) => void
  food: Food
  setFood: (f: Food) => void
  plan: Meal[]
  setPlan: (p: Meal[]) => void
  mealIdx: number
  setMealIdx: (i: number) => void
  selectedMeal: Meal | null
  setSelectedMeal: (m: Meal | null) => void
  logged: { kcal: number protein: number carbs: number fat: number }
  logFood: (
    k: number,
    p: number,
    c: number,
    f: number,
    slot: Meal["slot"],
    name?: string,
    img?: string,
  ) => void
  /** Plans for upcoming days (1 = tomorrow, 2 = day after). Today uses `plan`. */
  future: Record<number, Meal[]>
  setFuture: (f: Record<number, Meal[]>) => void
  planFor: (day: number) => Meal[]
  addToPlan: (
    day: number,
    slot: Meal["slot"],
    m: Pick<Meal, "name" | "kcal" | "protein" | "carbs" | "fat"> & {
      img?: string
      slug?: string
    },
  ) => void
  analyzeTab: "search" | "identify" | "packaged"
  setAnalyzeTab: (t: "search" | "identify" | "packaged") => void
  login: (
    email?: string,
    password?: string,
    isRegister?: boolean,
    name?: string,
  ) => Promise<boolean>
  logout: () => void
  toast: (t: string) => void
  streak: StreakState
  profile: Profile
  setProfile: (p: Profile) => void
  setStreak: (s: StreakState) => void
}
