import { emptyPlan, SLOT_ICONS, type Meal } from "./data"
import { seedStreak, type DayRecord, type StreakState } from "./streaks"
import { getFoodEmoji, toSlug } from "./foodImages"

/** Everything that belongs to "a day". Persisted so reloads and midnight stay in sync. */
export type DayState = {
  date: string // local YYYY-MM-DD the state belongs to
  plan: Meal[]
  future: Record<number, Meal[]>
  logged: { kcal: number protein: number carbs: number fat: number }
  streak: StreakState
}

const KEY = "nutrisense-day-v2"
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const daysBetween = (a: string, b: string) =>
  Math.round(
    (new Date(b + "T00:00").getTime() - new Date(a + "T00:00").getTime()) /
      864e5,
  )
export const ZERO = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
const emptyDay = (): DayRecord => ({
  checkin: false,
  balanced: false,
  level: 0,
  habits: {
    protein: false,
    fiber: false,
    veg: false,
    breakfast: false,
    water: false,
  },
})

function sanitizeMeal(m: Meal): void {
  // Strip legacy / unverified img URLs
  delete m.img

  // Derive stable slug if missing
  if (!m.slug && m.name) {
    m.slug = toSlug(m.name)
  }

  // Canonicalize icon/emoji: food identity takes precedence over arbitrary slot icon
  if (m.name) {
    m.icon = getFoodEmoji({ slug: m.slug, name: m.name })
  } else if (m.slot && SLOT_ICONS[m.slot]) {
    m.icon = SLOT_ICONS[m.slot]
  }
}

/** Advance one calendar day: tomorrow's plan becomes today, logs reset, yesterday is sealed into the streak. */
function advance(s: DayState): DayState {
  const eaten = s.plan.filter((m) => m.done).length
  const [today, ...rest] = s.streak.history
  const sealed: DayRecord = {
    ...today,
    checkin: today.checkin || eaten > 0,
    level: Math.max(today.level, Math.min(3, eaten)) as DayRecord["level"],
  }
  const future: Record<number, Meal[]> = {}
  for (const [k, v] of Object.entries(s.future)) if (+k > 1) future[+k - 1] = v
  return {
    ...s,
    plan: (s.future[1] ?? emptyPlan()).map((m) => ({ ...m, done: false })),
    future,
    logged: ZERO,
    streak: {
      ...s.streak,
      history: [emptyDay(), sealed, ...rest].slice(0, 120),
    },
  }
}

/** Bring any saved state up to `date`, applying one rollover per elapsed day. */
export function syncTo(s: DayState, date = todayKey()): DayState {
  const gap = daysBetween(s.date, date)
  if (gap <= 0) return s
  let next = s
  for (let i = 0; i < Math.min(gap, 120); i++) next = advance(next)
  return { ...next, date }
}

export function loadDay(): DayState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DayState
      // ONE-TIME MIGRATION: clear legacy `.img` and re-derive canonical emojis
      if (parsed.plan) parsed.plan.forEach(sanitizeMeal)
      if (parsed.future)
        Object.values(parsed.future).forEach((arr) => arr.forEach(sanitizeMeal))
      return syncTo(parsed)
    }
  } catch {
    /* corrupted storage → start fresh */
  }
  return {
    date: todayKey(),
    plan: emptyPlan(),
    future: {},
    logged: ZERO,
    streak: seedStreak(),
  }
}

export const saveDay = (s: DayState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* quota / private mode */
  }
}

export const clearDayState = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
