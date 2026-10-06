import { StreakCard, backendProgressToStreak } from "./streaks"
import {
  apiGetToday,
  apiGetMealPlans,
  apiGenerateMealPlan,
  apiGetMealPlanOptions,
  apiSwapMeal,
  apiGetRecommendations,
  apiLogFood,
  apiRemoveFromMealPlan,
  apiRemoveTrackingLog,
  apiGetProgress,
  apiPutProfile,
  apiUpdateMe,
  apiGetMe,
  type DailySummary,
  type MealPlanWindow,
  type MealOption,
  type Insight,
  type ProgressRange,
  type ProgressResponse,
  type LogOut,
} from "./api"
import { useState, useEffect } from "react"
import {
  DEFAULT_PROFILE,
  SLOT_ICONS,
  SWAPS,
  TARGET,
  WEEK,
  bmiOf,
  backendProfileToFrontend,
  toBackendProfile,
  isEmptySlot,
  type Ctx,
  type Meal,
} from "./data"
import { todayKey } from "./day"
import {
  getFoodEmoji,
  getFoodImageForMeal,
  resolveFoodImage,
  toSlug,
} from "./foodImages"
import {
  Bar,
  Button,
  Card,
  Chip,
  Empty,
  Eyebrow,
  Ring,
  Title,
  FoodImage,
} from "./ui"

export type RenderMeal = Meal & { pm_id?: number log_id?: number }

export const getConsumedSet = (): Set<string> => {
  try {
    const raw = localStorage.getItem(`nutrisense-consumed-${todayKey()}`)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export const saveConsumedKey = (key: string) => {
  try {
    const set = getConsumedSet()
    set.add(key)
    localStorage.setItem(
      `nutrisense-consumed-${todayKey()}`,
      JSON.stringify([...set]),
    )
    window.dispatchEvent(new Event("nutrisense-consumed-updated"))
  } catch {}
}

export const removeConsumedKey = (key: string) => {
  try {
    const set = getConsumedSet()
    set.delete(key)
    localStorage.setItem(
      `nutrisense-consumed-${todayKey()}`,
      JSON.stringify([...set]),
    )
    window.dispatchEvent(new Event("nutrisense-consumed-updated"))
  } catch {}
}

export const clearConsumedKeys = () => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith("nutrisense-consumed-")) {
        localStorage.removeItem(k)
      }
    }
    window.dispatchEvent(new Event("nutrisense-consumed-updated"))
  } catch {}
}

export function mapTodaySlots(
  win: MealPlanWindow | null,
  todayTrack: DailySummary | null,
  consumedKeys: Set<string>,
): RenderMeal[] {
  const slots = ["Breakfast", "Lunch", "Snack", "Dinner"] as const

  const backendMeals = win?.days?.[0]?.meals ?? []

  return slots.map((slotName) => {
    const bMeal = backendMeals.find((m) => m.slot === slotName.toLowerCase())
    let tMeal
    if (todayTrack) {
      const tSlot = todayTrack.slots.find(
        (s) => s.slot === slotName.toLowerCase(),
      )
      if (tSlot && tSlot.entries.length > 0) tMeal = tSlot.entries[0]
    }

    if (bMeal) {
      const key = `pm-${bMeal.id}`
      const matchingLog = todayTrack?.slots
        .flatMap((s) => s.entries)
        .find((e) => (e as any).planned_meal_id === bMeal.id)
      const isConsumed =
        Boolean(bMeal.eaten) || Boolean(matchingLog) || consumedKeys.has(key)
      const mealSlug = bMeal.slug || toSlug(bMeal.name)
      return {
        slot: slotName,
        name: bMeal.name,
        kcal: bMeal.kcal,
        protein: bMeal.protein,
        carbs: bMeal.carbs,
        fat: bMeal.fat,
        desc: "",
        why: "",
        tags: isConsumed ? "Consumed" : "Planned",
        icon: getFoodEmoji({ slug: mealSlug, name: bMeal.name }),
        done: isConsumed,
        slug: mealSlug,
        pm_id: bMeal.id,
        log_id: matchingLog?.id,
      }
    }

    if (tMeal) {
      const mealSlug = tMeal.slug || toSlug(tMeal.name)
      return {
        slot: slotName,
        name: tMeal.name,
        kcal: tMeal.kcal,
        protein: tMeal.protein,
        carbs: tMeal.carbs,
        fat: tMeal.fat,
        desc: "",
        why: "",
        tags: "Consumed",
        icon: getFoodEmoji({ slug: mealSlug, name: tMeal.name }),
        done: true,
        slug: mealSlug,
        log_id: tMeal.id,
        pm_id: (tMeal as any).planned_meal_id ?? undefined,
      }
    }

    return {
      slot: slotName,
      name: "",
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      desc: "",
      why: "",
      tags: "",
      icon: SLOT_ICONS[slotName],
      done: false,
      img: "",
    }
  })
}

const greet = () => {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

function Macros({
  c,
  dark,
  values,
  targets,
}: {
  c: Ctx
  dark?: boolean
  values?: { protein: number carbs: number fat: number }
  targets?: { protein?: number carbs?: number fat?: number }
}) {
  const p = values ? values.protein : c.logged.protein
  const cb = values ? values.carbs : c.logged.carbs
  const f = values ? values.fat : c.logged.fat
  const tg = targets ?? c.currentUser?.targets ?? TARGET
  const rows = [
    ["Protein", p, tg.protein || TARGET.protein, "leaf"],
    ["Carbs", cb, tg.carbs || TARGET.carbs, "saffron"],
    ["Fat", f, tg.fat || TARGET.fat, "clay"],
  ] as const
  return (
    <div className="space-y-4">
      {rows.map(([l, v, m, t]) => (
        <div key={l}>
          <div className="flex justify-between text-sm mb-1.5">
            <span className={dark ? "text-paper/70" : "text-ink-soft"}>
              {l}
            </span>
            <span className="font-mono">
              {Math.round(v)} / {m}g
            </span>
          </div>
          <Bar value={v} max={m} tone={t} />
        </div>
      ))}
    </div>
  )
}

const PLAN_DAYS = 3 // today + next 2 days
const dayDate = (d: number) => new Date(Date.now() + d * 864e5)
const dayName = (d: number) =>
  d === 0
    ? "Today"
    : d === 1
      ? "Tomorrow"
      : dayDate(d).toLocaleDateString("en-GB", { weekday: "long" })

function EmptySlot({
  m,
  c,
  big = false,
  note,
}: {
  m: Meal
  c: Ctx
  big?: boolean
  note?: string
}) {
  return (
    <div
      className={`rounded-[28px] border-2 border-dashed border-sand-deep/70 bg-sand/25 p-6 flex flex-col items-center justify-center text-center gap-3 min-h-56 ${
        big ? "md:row-span-2" : ""
      }`}
    >
      <span
        className="size-12 rounded-2xl bg-paper grid place-items-center text-2xl"
        aria-hidden
      >
        {m.icon || SLOT_ICONS[m.slot]}
      </span>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[.18em] text-ink-soft">
          {m.slot}
        </p>
        <p className="font-display text-xl mt-1">Nothing here yet</p>
        <p className="text-sm text-ink-soft mt-1">
          {note ?? "Log what you ate or pick something to plan."}
        </p>
      </div>
      <button
        onClick={() => c.go("analyze")}
        className="mt-1 h-10 px-4 rounded-full bg-paper border border-line text-sm font-semibold hover:border-leaf transition cursor-pointer"
      >
        + Add food
      </button>
    </div>
  )
}

/* ---------- Dashboard ---------- */
export function Dashboard({ c }: { c: Ctx }) {
  const [win, setWin] = useState<MealPlanWindow | null>(null)
  const [todayTrack, setTodayTrack] = useState<DailySummary | null>(null)
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [consumedKeys, setConsumedKeys] = useState<Set<string>>(() =>
    getConsumedSet(),
  )
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)

  const refresh = async () => {
    if (!c.authed) return
    const ctrl = new AbortController()
    const start = todayKey()

    try {
      const [w, t, p, rec] = await Promise.all([
        apiGetMealPlans(start, ctrl.signal),
        apiGetToday(ctrl.signal),
        apiGetProgress("7d", ctrl.signal),
        apiGetRecommendations(ctrl.signal).catch(() => null),
      ])
      setWin(w)
      setTodayTrack(t)
      setProgress(p)
      if (rec?.insights && rec.insights.length > 0) {
        setInsight(rec.insights[0])
      }
      c.setStreak((prev) => backendProgressToStreak(p, prev))
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e)
    }
    return ctrl
  }

  useEffect(() => {
    let active = true
    const ctrl = refresh()
    const onUpdate = () => setConsumedKeys(new Set(getConsumedSet()))
    const onTrackingUpdate = () => {
      if (active) refresh()
    }
    window.addEventListener("nutrisense-consumed-updated", onUpdate)
    window.addEventListener("nutrisense-tracking-updated", onTrackingUpdate)
    return () => {
      active = false
      ctrl?.then((c) => c?.abort())
      window.removeEventListener("nutrisense-consumed-updated", onUpdate)
      window.removeEventListener(
        "nutrisense-tracking-updated",
        onTrackingUpdate,
      )
    }
  }, [c.authed])

  const todaySlots = c.authed
    ? mapTodaySlots(win, todayTrack, consumedKeys)
    : c.plan

  useEffect(() => {
    if (c.authed && (win || todayTrack)) {
      c.setPlan(todaySlots)
    }
  }, [win, todayTrack, consumedKeys])

  const handleToggleConsume = async (m: RenderMeal) => {
    const key = m.log_id
      ? `log-${m.log_id}`
      : m.pm_id
        ? `pm-${m.pm_id}`
        : `${m.slot}-${m.name}`
    if (submittingKey === key) return
    setSubmittingKey(key)

    try {
      if (m.done) {
        if (!c.authed) {
          removeConsumedKey(key)
          setConsumedKeys(new Set(getConsumedSet()))
          c.logFood(-m.kcal, -m.protein, -m.carbs, -m.fat, m.slot as any)
          c.toast(`Unmarked ${m.name}`)
          return
        }
        let logIdToRemove = m.log_id
        if (!logIdToRemove && m.pm_id && todayTrack) {
          const matchingLog = todayTrack.slots
            .flatMap((s) => s.entries)
            .find((e) => (e as any).planned_meal_id === m.pm_id)
          if (matchingLog) logIdToRemove = matchingLog.id
        }
        if (logIdToRemove) {
          await apiRemoveTrackingLog(logIdToRemove)
        }
        removeConsumedKey(key)
        setConsumedKeys(new Set(getConsumedSet()))
        window.dispatchEvent(new Event("nutrisense-tracking-updated"))
        c.toast(`Unmarked ${m.name}`)
        await refresh()
      } else {
        if (!c.authed) {
          saveConsumedKey(key)
          setConsumedKeys(new Set(getConsumedSet()))
          c.logFood(m.kcal, m.protein, m.carbs, m.fat, m.slot as any)
          c.toast(`${m.name} marked as consumed`)
          return
        }
        if (m.pm_id) {
          await apiLogFood({
            slot: m.slot.toLowerCase(),
            planned_meal_id: m.pm_id,
            date: todayKey(),
          })
        } else if ((m as any).food_id != null) {
          await apiLogFood({
            slot: m.slot.toLowerCase(),
            food_id: (m as any).food_id,
            date: todayKey(),
          })
        } else if (m.slug) {
          await apiLogFood({
            slot: m.slot.toLowerCase(),
            slug: m.slug,
            date: todayKey(),
          })
        } else {
          await apiLogFood({
            slot: m.slot.toLowerCase(),
            custom: {
              name: m.name,
              kcal: m.kcal,
              protein: m.protein,
              carbs: m.carbs,
              fat: m.fat,
            },
            date: todayKey(),
          })
        }
        saveConsumedKey(key)
        setConsumedKeys(new Set(getConsumedSet()))
        window.dispatchEvent(new Event("nutrisense-tracking-updated"))
        c.toast(`${m.name} marked as consumed`)
        await refresh()
      }
    } catch (e: any) {
      c.toast(e.message || "Failed to update consumed status")
    } finally {
      setSubmittingKey(null)
    }
  }

  const currentKcal = c.authed ? (todayTrack?.totals.kcal ?? 0) : c.logged.kcal
  const currentProtein = c.authed
    ? (todayTrack?.totals.protein ?? 0)
    : c.logged.protein
  const currentCarbs = c.authed
    ? (todayTrack?.totals.carbs ?? 0)
    : c.logged.carbs
  const currentFat = c.authed ? (todayTrack?.totals.fat ?? 0) : c.logged.fat

  const targetKcal = c.authed
    ? (todayTrack?.targets.kcal ?? prof(c).kcal)
    : prof(c).kcal
  const targetProtein = c.authed
    ? (todayTrack?.targets.protein ?? TARGET.protein)
    : TARGET.protein

  const pct = targetKcal > 0 ? Math.round((currentKcal / targetKcal) * 100) : 0
  const proteinPct =
    targetProtein > 0 ? Math.round((currentProtein / targetProtein) * 100) : 0
  return (
    <div className="rise space-y-10">
      <header>
        <Eyebrow>
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Eyebrow>
        <Title className="mt-3">
          {greet()},{" "}
          {(c.currentUser?.name || prof(c).name).split(" ")[0] || "there"} 👋
        </Title>
        <p className="text-ink-soft mt-2">
          Here's your nutrition plan for today.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card className="p-8 md:p-10 grid md:grid-cols-[auto_1fr] gap-10 items-center">
          <Ring value={currentKcal} max={targetKcal} size={200}>
            <div className="font-display text-5xl">
              {currentKcal.toLocaleString()}
            </div>
            <div className="font-mono text-xs text-ink-soft">
              / {targetKcal.toLocaleString()} kcal
            </div>
          </Ring>
          <div>
            <Eyebrow>Today's nutrition</Eyebrow>
            <p className="font-display text-2xl mt-2 mb-6">
              {pct}% of your day,{" "}
              <em className="text-leaf">
                {Math.max(0, targetKcal - currentKcal).toLocaleString()} kcal
              </em>{" "}
              to go.
            </p>
            <Macros
              c={c}
              values={{
                protein: currentProtein,
                carbs: currentCarbs,
                fat: currentFat,
              }}
              targets={todayTrack?.targets ?? c.currentUser?.targets}
            />
          </div>
        </Card>
        <div className="rounded-[28px] p-8 bg-[linear-gradient(140deg,var(--color-leaf-deep),var(--color-leaf)_60%,#5c8a4e)] text-paper flex flex-col relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-saffron/30 blur-2xl" />
          <Eyebrow className="text-paper/70">✨ NutriSense Insight</Eyebrow>
          <div className="mt-4 relative">
            {insight ? (
              <>
                <span className="font-semibold block text-base text-mint mb-1">
                  {insight.title}
                </span>
                <p className="font-display text-xl leading-snug">
                  {insight.message}
                </p>
              </>
            ) : (
              <p className="font-display text-2xl leading-snug">
                You've already reached {proteinPct}% of today's protein target.
                Your remaining meals can focus on vegetables, fiber and balanced
                carbohydrates.
              </p>
            )}
          </div>
          <button
            onClick={() => c.go("today")}
            className="mt-auto pt-6 text-left font-semibold text-saffron cursor-pointer relative"
          >
            See why →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          [
            "🔍",
            "Search Food",
            () => {
              c.setAnalyzeTab("search")
              c.go("analyze")
            },
          ],
          ["📸", "Identify", () => c.go("camera")],
          ["🍽️", "Meal Plan", () => c.go("plan")],
          ["⚖️", "BMI", () => c.go("bmi")],
        ] as const).map(([i, l, f]) => (
          <button
            key={l}
            onClick={f}
            className="h-16 rounded-2xl bg-sand/60 hover:bg-sand flex items-center gap-3 px-5 font-semibold transition cursor-pointer"
          >
            <span className="text-xl">{i}</span>
            {l}
          </button>
        ))}
      </div>

      <StreakCard c={c} progress={progress} />

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-3xl">Today's meals</h2>
          <button
            onClick={() => c.go("plan")}
            className="text-sm font-semibold text-leaf cursor-pointer"
          >
            Open planner →
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {todaySlots.map((m, i) => {
            return isEmptySlot(m) ? (
              <EmptySlot key={m.slot} m={m} c={c} />
            ) : (
              <Card
                key={m.slot + m.name}
                className={`overflow-hidden flex flex-col ${
                  m.done ? "" : "border-dashed"
                }`}
              >
                <div className="h-32 bg-sand relative">
                  <FoodImage
                    src={getFoodImageForMeal(m)}
                    name={m.name}
                    emoji={m.icon || getFoodEmoji(m)}
                    dim={!m.done}
                  />
                  <span className="absolute top-3 left-3 bg-paper/90 rounded-full px-3 py-1 text-xs font-semibold">
                    {m.icon || getFoodEmoji(m)} {m.slot}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="font-semibold">{m.name}</div>
                  <div className="font-mono text-sm text-ink-soft mt-1">
                    {m.kcal} kcal
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                    <Button
                      variant={m.done ? "secondary" : "primary"}
                      className={
                        m.done ? "!bg-mint/40 !text-leaf !border-leaf/50" : ""
                      }
                      onClick={() => handleToggleConsume(m)}
                      title={
                        m.done
                          ? "Click to unmark as consumed"
                          : "Click to mark as consumed"
                      }
                    >
                      {m.done ? "✓ Consumed" : "Consumed"}
                    </Button>
                    <button
                      className="text-sm font-semibold underline cursor-pointer"
                      onClick={() => {
                        c.setSelectedMeal(m)
                        c.setMealIdx(i)
                        c.go("meal")
                      }}
                    >
                      View meal
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/* ---------- Planner ---------- */
export function Planner({ c }: { c: Ctx }) {
  const [day, setDay] = useState(0)
  const [swap, setSwap] = useState<number | null>(null)
  const [swapOptions, setSwapOptions] = useState<MealOption[]>([])
  const [loadingSwap, setLoadingSwap] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const [win, setWin] = useState<MealPlanWindow | null>(null)
  const [todayTrack, setTodayTrack] = useState<DailySummary | null>(null)
  const [consumedKeys, setConsumedKeys] = useState<Set<string>>(() =>
    getConsumedSet(),
  )

  const [submittingKey, setSubmittingKey] = useState<string | null>(null)

  const refresh = async () => {
    if (!c.authed) return
    const ctrl = new AbortController()
    const start = todayKey()

    try {
      const [w, t] = await Promise.all([
        apiGetMealPlans(start, ctrl.signal),
        apiGetToday(ctrl.signal),
      ])
      setWin(w)
      setTodayTrack(t)
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e)
    }
    return ctrl
  }

  useEffect(() => {
    let active = true
    const ctrl = refresh()
    const onUpdate = () => setConsumedKeys(new Set(getConsumedSet()))
    const onTrackingUpdate = () => {
      if (active) refresh()
    }
    window.addEventListener("nutrisense-consumed-updated", onUpdate)
    window.addEventListener("nutrisense-tracking-updated", onTrackingUpdate)
    window.addEventListener("nutrisense-plan-updated", onTrackingUpdate)
    return () => {
      active = false
      ctrl?.then((c) => c?.abort())
      window.removeEventListener("nutrisense-consumed-updated", onUpdate)
      window.removeEventListener(
        "nutrisense-tracking-updated",
        onTrackingUpdate,
      )
      window.removeEventListener("nutrisense-plan-updated", onTrackingUpdate)
    }
  }, [c.authed])

  const mapDay = (dIdx: number): RenderMeal[] => {
    if (!c.authed) return c.planFor(dIdx)
    if (dIdx === 0) {
      return mapTodaySlots(win, todayTrack, consumedKeys)
    }
    const slots = ["Breakfast", "Lunch", "Snack", "Dinner"] as const

    if (!win || !win.days[dIdx]) {
      return slots.map((slotName) => ({
        slot: slotName,
        name: "",
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        desc: "",
        why: "",
        tags: "",
        icon: SLOT_ICONS[slotName],
        done: false,
        img: "",
      }))
    }

    const backendMeals = win.days[dIdx].meals
    return slots.map((slotName) => {
      const bMeal = backendMeals.find((m) => m.slot === slotName.toLowerCase())
      if (bMeal) {
        const mealSlug = bMeal.slug || toSlug(bMeal.name)
        return {
          slot: slotName,
          name: bMeal.name,
          kcal: bMeal.kcal,
          protein: bMeal.protein,
          carbs: bMeal.carbs,
          fat: bMeal.fat,
          desc: "",
          why: "",
          tags: "Planned",
          icon: getFoodEmoji({ slug: mealSlug, name: bMeal.name }),
          done: bMeal.eaten,
          slug: mealSlug,
          pm_id: bMeal.id,
        }
      }
      return {
        slot: slotName,
        name: "",
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        desc: "",
        why: "",
        tags: "",
        icon: SLOT_ICONS[slotName],
        done: false,
        img: "",
      }
    })
  }

  const plan = mapDay(day)
  const future: Record<number, typeof c.plan> = {}
  for (let i = 0; i < PLAN_DAYS; i++) {
    future[i] = mapDay(i)
  }

  useEffect(() => {
    if (swap === null || !c.authed || !plan[swap]) {
      setSwapOptions([])
      return
    }
    const currentMeal = plan[swap]
    const d = new Date()
    d.setDate(d.getDate() + day)
    const dateStr = todayKey(d)
    setLoadingSwap(true)
    apiGetMealPlanOptions(dateStr, currentMeal.slot)
      .then((opts) => setSwapOptions(opts))
      .catch((err) => {
        console.error("Failed to load swap options:", err)
        setSwapOptions([])
      })
      .finally(() => setLoadingSwap(false))
  }, [swap, day, c.authed])

  useEffect(() => {
    if (c.authed && (win || todayTrack) && day === 0) {
      c.setPlan(plan)
    }
  }, [win, todayTrack, consumedKeys, day])

  const setPlan = (p: typeof c.plan) =>
    day === 0 ? c.setPlan(p) : c.setFuture({ ...c.future, [day]: p })
  const total =
    c.authed && win?.days[day]
      ? win.days[day].total_kcal
      : plan.reduce((s, m) => s + m.kcal, 0)

  const handleToggleConsume = async (m: RenderMeal) => {
    const key = m.log_id
      ? `log-${m.log_id}`
      : m.pm_id
        ? `pm-${m.pm_id}`
        : `${m.slot}-${m.name}`
    if (submittingKey === key) return
    setSubmittingKey(key)

    try {
      if (m.done) {
        if (!c.authed) {
          removeConsumedKey(key)
          setConsumedKeys(new Set(getConsumedSet()))
          c.logFood(-m.kcal, -m.protein, -m.carbs, -m.fat, m.slot as any)
          c.toast(`Unmarked ${m.name}`)
          return
        }
        let logIdToRemove = m.log_id
        if (!logIdToRemove && m.pm_id && todayTrack) {
          const matchingLog = todayTrack.slots
            .flatMap((s) => s.entries)
            .find((e) => (e as any).planned_meal_id === m.pm_id)
          if (matchingLog) logIdToRemove = matchingLog.id
        }
        if (logIdToRemove) {
          await apiRemoveTrackingLog(logIdToRemove)
        }
        removeConsumedKey(key)
        setConsumedKeys(new Set(getConsumedSet()))
        window.dispatchEvent(new Event("nutrisense-tracking-updated"))
        c.toast(`Unmarked ${m.name}`)
        await refresh()
      } else {
        if (!c.authed) {
          saveConsumedKey(key)
          setConsumedKeys(new Set(getConsumedSet()))
          c.logFood(m.kcal, m.protein, m.carbs, m.fat, m.slot as any)
          c.toast(`${m.name} marked as consumed`)
          return
        }
        if (m.pm_id) {
          await apiLogFood({
            slot: m.slot.toLowerCase(),
            planned_meal_id: m.pm_id,
            date: todayKey(),
          })
        } else if ((m as any).food_id != null) {
          await apiLogFood({
            slot: m.slot.toLowerCase(),
            food_id: (m as any).food_id,
            date: todayKey(),
          })
        } else if (m.slug) {
          await apiLogFood({
            slot: m.slot.toLowerCase(),
            slug: m.slug,
            date: todayKey(),
          })
        } else {
          await apiLogFood({
            slot: m.slot.toLowerCase(),
            custom: {
              name: m.name,
              kcal: m.kcal,
              protein: m.protein,
              carbs: m.carbs,
              fat: m.fat,
            },
            date: todayKey(),
          })
        }
        saveConsumedKey(key)
        setConsumedKeys(new Set(getConsumedSet()))
        window.dispatchEvent(new Event("nutrisense-tracking-updated"))
        c.toast(`${m.name} marked as consumed`)
        await refresh()
      }
    } catch (e: any) {
      c.toast(e.message || "Failed to update consumed status")
    } finally {
      setSubmittingKey(null)
    }
  }

  const handleRemove = async (m: RenderMeal) => {
    const key = m.log_id
      ? `log-${m.log_id}`
      : m.pm_id
        ? `pm-${m.pm_id}`
        : `${m.slot}-${m.name}`
    if (submittingKey === key) return
    setSubmittingKey(key)

    try {
      if (m.done && !c.authed) {
        removeConsumedKey(key)
        setConsumedKeys(new Set(getConsumedSet()))
        c.logFood(-m.kcal, -m.protein, -m.carbs, -m.fat, m.slot as any)
      }
      if (c.authed) {
        let logIdToRemove = m.log_id
        if (!logIdToRemove && m.pm_id && todayTrack) {
          const matchingLog = todayTrack.slots
            .flatMap((s) => s.entries)
            .find((e) => (e as any).planned_meal_id === m.pm_id)
          if (matchingLog) logIdToRemove = matchingLog.id
        }
        if (logIdToRemove) {
          await apiRemoveTrackingLog(logIdToRemove)
        }
        if (m.pm_id) {
          const d = new Date()
          d.setDate(d.getDate() + day)
          const dateStr = todayKey(d)
          await apiRemoveFromMealPlan(dateStr, m.slot, m.pm_id)
        }
        removeConsumedKey(key)
        setConsumedKeys(new Set(getConsumedSet()))
        window.dispatchEvent(new Event("nutrisense-tracking-updated"))
        c.toast(`Removed ${m.name}`)
        await refresh()
      } else {
        const p = [...c.planFor(day)]
        const idx = p.findIndex((x) => x.slot === m.slot)
        if (idx !== -1) {
          p[idx] = {
            slot: m.slot as any,
            name: "",
            kcal: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            desc: "",
            why: "",
            tags: "",
            icon: SLOT_ICONS[(m.slot as Meal["slot"])],
            done: false,
            img: "",
          }
          setPlan(p)
        }
      }
    } catch (e: any) {
      c.toast(e.message || "Failed to remove meal")
    } finally {
      setSubmittingKey(null)
    }
  }
  const go = (d: number) => {
    if (d < 0)
      return c.toast(
        "Past days can't be planned — you can review them in Progress.",
      )
    if (d >= PLAN_DAYS)
      return c.toast(
        `You can plan up to ${PLAN_DAYS} days ahead. ${dayName(d)} unlocks tomorrow.`,
      )
    setDay(d)
  }
  const lockedOn = dayDate(PLAN_DAYS).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>
            {dayName(day)} · {total.toLocaleString()} of{" "}
            {(c.currentUser?.targets?.kcal ?? prof(c).kcal).toLocaleString()}{" "}
            kcal planned
          </Eyebrow>
          <Title className="mt-3">Your Meal Plan</Title>
          <p className="text-ink-soft mt-2">
            Plan up to {PLAN_DAYS} days at a time, so your meals stay fresh and
            realistic.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {c.authed && (
            <Button
              variant="secondary"
              size="md"
              disabled={regenerating}
              onClick={async () => {
                setRegenerating(true)
                const d = new Date()
                d.setDate(d.getDate() + day)
                const dateStr = todayKey(d)
                try {
                  await apiGenerateMealPlan(dateStr)
                  c.toast(`Personalized plan generated for ${dayName(day)}`)
                  window.dispatchEvent(new Event("nutrisense-tracking-updated"))
                  await refresh()
                } catch (err: any) {
                  c.toast(err?.message || "Failed to regenerate meal plan")
                } finally {
                  setRegenerating(false)
                }
              }}
            >
              {regenerating ? "Regenerating..." : "✨ Regenerate"}
            </Button>
          )}
          <div className="flex items-center gap-2 bg-paper border border-line rounded-full p-1">
            <button
              aria-label="Previous day"
              disabled={day === 0}
              onClick={() => go(day - 1)}
              className="size-10 rounded-full hover:bg-sand cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <span className="w-32 text-center font-semibold">
              {dayName(day)}
            </span>
            <button
              aria-label="Next day"
              aria-disabled={day === PLAN_DAYS - 1}
              onClick={() => go(day + 1)}
              className={`size-10 rounded-full cursor-pointer ${
                day === PLAN_DAYS - 1 ? "opacity-30" : "hover:bg-sand"
              }`}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div
        className="mt-8 grid grid-cols-4 gap-2 sm:gap-3"
        role="tablist"
        aria-label="Planning days"
      >
        {Array.from({ length: PLAN_DAYS }, (_, d) => {
          const dt = dayDate(d)
          const on = d === day
          return (
            <button
              key={d}
              role="tab"
              aria-selected={on}
              onClick={() => go(d)}
              className={`rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-left border transition cursor-pointer ${
                on
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper border-line hover:border-leaf"
              }`}
            >
              <span
                className={`font-mono text-[10px] sm:text-xs uppercase tracking-widest ${
                  on ? "text-paper/60" : "text-ink-soft"
                }`}
              >
                {dayName(d)}
              </span>
              <span className="block font-display text-2xl sm:text-3xl mt-1">
                {dt.getDate()}
              </span>
              <span className={`text-xs ${on ? "text-mint" : "text-leaf"}`}>
                {d === 0
                  ? "Today"
                  : future[d]?.some((m) => m.name)
                    ? "Planned"
                    : "Empty"}
              </span>
            </button>
          )
        })}
        <button
          onClick={() => go(PLAN_DAYS)}
          aria-label={`Locked — opens ${lockedOn}`}
          className="rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-left border border-dashed border-sand-deep bg-sand/40 text-ink-soft cursor-not-allowed"
        >
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest">
            Locked
          </span>
          <span className="block text-2xl mt-1" aria-hidden>
            🔒
          </span>
          <span className="text-xs">Opens {lockedOn}</span>
        </button>
      </div>

      {
        <div className="mt-8 grid md:grid-cols-2 gap-5">
          {plan.map((m, i) => {
            return isEmptySlot(m) ? (
              <EmptySlot
                key={m.slot}
                m={m}
                c={c}
                big={i === 1}
                note={day === 0 ? undefined : `Plan it for ${dayName(day)}`}
              />
            ) : (
              <Card
                key={m.slot + m.name}
                className={`overflow-hidden grid ${
                  i === 1
                    ? "md:row-span-2 grid-rows-[1fr_auto]"
                    : "sm:grid-cols-[200px_1fr]"
                }`}
              >
                <div
                  className={`bg-sand ${
                    i === 1 ? "min-h-72" : "h-48 sm:h-auto"
                  }`}
                >
                  <FoodImage
                    src={getFoodImageForMeal(m)}
                    name={m.name}
                    emoji={m.icon || getFoodEmoji(m)}
                  />
                </div>
                <div className="p-6 flex flex-col">
                  <div className="flex justify-between">
                    <Eyebrow>
                      {m.icon || getFoodEmoji(m)} {m.slot}
                    </Eyebrow>
                    {m.done && (
                      <span className="text-xs text-leaf font-semibold">
                        ✓ Consumed
                      </span>
                    )}
                  </div>
                  <h3
                    className={`font-display mt-3 ${
                      i === 1 ? "text-4xl" : "text-2xl"
                    }`}
                  >
                    {m.name}
                  </h3>
                  <p className="text-sm text-ink-soft mt-1">{m.tags}</p>
                  {i === 1 && <p className="text-ink-soft mt-3">{m.desc}</p>}
                  <div className="flex gap-6 mt-4 font-mono text-sm">
                    <span>{m.kcal} kcal</span>
                    <span className="text-leaf">{m.protein}g protein</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto pt-5 items-center">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        c.setSelectedMeal(m)
                        c.setMealIdx(i)
                        c.go("meal")
                      }}
                    >
                      View
                    </Button>
                    {day === 0 ? (
                      <Button
                        variant={m.done ? "secondary" : "primary"}
                        className={
                          m.done ? "!bg-mint/40 !text-leaf !border-leaf/50" : ""
                        }
                        onClick={() => handleToggleConsume(m)}
                        title={
                          m.done
                            ? "Click to unmark as consumed"
                            : "Click to mark as consumed"
                        }
                      >
                        {m.done ? "✓ Consumed" : "Consumed"}
                      </Button>
                    ) : null}
                    <Button variant="secondary" onClick={() => handleRemove(m)}>
                      Remove
                    </Button>
                    <Button variant="ghost" onClick={() => setSwap(i)}>
                      ⇄ Swap
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      }
      {swap !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40 backdrop-blur-sm"
          onClick={() => setSwap(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rise w-full md:max-w-lg bg-paper rounded-t-[32px] md:rounded-[32px] p-7"
          >
            <div className="w-10 h-1 rounded-full bg-sand-deep mx-auto md:hidden mb-5" />
            <Eyebrow>
              Replacing {plan[swap].name} · {dayName(day)}
            </Eyebrow>
            <h3 className="font-display text-3xl mt-2">Choose another meal</h3>
            {c.authed ? (
              loadingSwap ? (
                <div className="py-8 text-center text-ink-soft">
                  Finding meals that match your diet and targets...
                </div>
              ) : swapOptions.length === 0 ? (
                <div className="py-8 text-center text-ink-soft">
                  No alternative meals found matching your diet and allergies.
                </div>
              ) : (
                <ul className="mt-6 space-y-2 max-h-96 overflow-y-auto pr-1">
                  {swapOptions.map((opt) => (
                    <li key={opt.template_id}>
                      <button
                        onClick={async () => {
                          const currentMeal = plan[swap]
                          const d = new Date()
                          d.setDate(d.getDate() + day)
                          const dateStr = todayKey(d)
                          try {
                            await apiSwapMeal(
                              dateStr,
                              currentMeal.slot,
                              opt.template_id,
                            )
                            c.toast(
                              `Swapped to ${opt.name} for ${dayName(day).toLowerCase()}`,
                            )
                            setSwap(null)
                            window.dispatchEvent(
                              new Event("nutrisense-tracking-updated"),
                            )
                            await refresh()
                          } catch (err: any) {
                            c.toast(err?.message || "Failed to swap meal")
                          }
                        }}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-cream text-left cursor-pointer transition"
                      >
                        <div className="size-14 shrink-0 rounded-xl overflow-hidden bg-sand">
                          <FoodImage
                            src={opt.image_url || getFoodImageForMeal(opt)}
                            name={opt.name}
                            emoji={getFoodEmoji(opt)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">
                            {opt.name}
                          </div>
                          <div className="text-xs text-leaf line-clamp-1">
                            {opt.why || opt.description}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm block">
                            {Math.round(opt.kcal)} kcal
                          </span>
                          <span className="text-xs text-ink-soft">
                            {Math.round(opt.protein)}g pro
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <ul className="mt-6 space-y-2">
                {SWAPS.map((s) => (
                  <li key={s.name}>
                    <button
                      onClick={() => {
                        const p = [...plan]
                        p[swap] = {
                          ...p[swap],
                          name: s.name,
                          kcal: s.kcal,
                          protein: s.protein,
                          tags: s.why,
                          slug: (s as any).slug,
                          icon: getFoodEmoji({
                            slug: (s as any).slug,
                            name: s.name,
                          }),
                          done: false,
                        }
                        setPlan(p)
                        setSwap(null)
                        c.toast(
                          `Swapped to ${s.name} for ${dayName(day).toLowerCase()}`,
                        )
                      }}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-cream text-left cursor-pointer"
                    >
                      <div className="size-14 shrink-0 rounded-xl overflow-hidden">
                        <FoodImage
                          src={getFoodImageForMeal(s)}
                          name={s.name}
                          emoji={getFoodEmoji(s)}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-leaf">{s.why}</div>
                      </div>
                      <span className="font-mono text-sm">{s.kcal} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Meal detail ---------- */
export function MealDetail({ c }: { c: Ctx }) {
  const m = (c.selectedMeal ?? c.plan[c.mealIdx] ?? c.plan[0]) as RenderMeal
  const [submitting, setSubmitting] = useState(false)

  const handleConsume = async () => {
    if (submitting || m.done) return

    if (!c.authed) {
      const p = [...c.plan]
      p[c.mealIdx] = { ...m, done: true }
      c.setPlan(p)
      c.logFood(m.kcal, m.protein, m.carbs, m.fat, m.slot)
      c.toast(`${m.name} marked as consumed`)
      c.go("dashboard")
      return
    }

    setSubmitting(true)
    try {
      let logRes: LogOut
      if (m.pm_id) {
        logRes = await apiLogFood({
          slot: m.slot.toLowerCase(),
          planned_meal_id: m.pm_id,
          date: todayKey(),
        })
      } else if ((m as any).food_id != null) {
        logRes = await apiLogFood({
          slot: m.slot.toLowerCase(),
          food_id: (m as any).food_id,
          date: todayKey(),
        })
      } else if (m.slug) {
        logRes = await apiLogFood({
          slot: m.slot.toLowerCase(),
          slug: m.slug,
          date: todayKey(),
        })
      } else {
        logRes = await apiLogFood({
          slot: m.slot.toLowerCase(),
          custom: {
            name: m.name,
            kcal: m.kcal,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
          },
          date: todayKey(),
        })
      }

      const p = [...c.plan]
      if (p[c.mealIdx]) {
        p[c.mealIdx] = { ...m, done: true, log_id: logRes.id }
        c.setPlan(p)
      }
      if (c.selectedMeal) {
        c.setSelectedMeal({ ...m, done: true, log_id: logRes.id })
      }

      const key = m.pm_id ? `pm-${m.pm_id}` : `log-${logRes.id}`
      saveConsumedKey(key)
      window.dispatchEvent(new Event("nutrisense-consumed-updated"))
      window.dispatchEvent(new Event("nutrisense-tracking-updated"))

      c.toast(`${m.name} marked as consumed`)
      c.go("dashboard")
    } catch (err: any) {
      c.toast(err.message || "Failed to mark meal as consumed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rise grid lg:grid-cols-2 gap-10 items-start">
      <div className="aspect-square rounded-[40px] overflow-hidden bg-sand">
        <FoodImage
          src={getFoodImageForMeal(m)}
          name={m.name}
          emoji={m.icon || getFoodEmoji(m)}
        />
      </div>
      <div className="lg:pt-8">
        <button
          onClick={() => (c.back ? c.back() : c.go("plan"))}
          className="text-sm text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5 transition"
        >
          ← Back
        </button>
        <Eyebrow className="mt-6">
          {m.icon || getFoodEmoji(m)} {m.slot}
        </Eyebrow>
        <Title className="mt-3">{m.name}</Title>
        <div className="font-display text-3xl text-leaf mt-3">
          {m.kcal} kcal
        </div>
        <div className="grid grid-cols-3 gap-3 mt-8">
          {[
            ["Protein", m.protein, "bg-mint"],
            ["Carbs", m.carbs, "bg-saffron-soft"],
            ["Fat", m.fat, "bg-sand"],
          ].map(([l, v, bg]) => (
            <div key={l as string} className={`${bg} rounded-3xl p-5`}>
              <div className="text-sm text-ink-soft">{l}</div>
              <div className="font-display text-3xl mt-1">{v}g</div>
            </div>
          ))}
        </div>
        <Card className="p-6 mt-6">
          <div className="font-semibold">Why NutriSense picked this</div>
          <p className="text-ink-soft mt-1">
            {m.why ||
              (m.done
                ? "Logged by you for today."
                : "Planned by you for this slot.")}
          </p>
        </Card>
        <Button
          size="lg"
          className="mt-8 w-full"
          disabled={m.done || submitting}
          onClick={handleConsume}
        >
          {submitting
            ? "Marking as consumed..."
            : m.done
              ? "✓ Consumed for today"
              : "Mark as consumed"}
        </Button>
      </div>
    </div>
  )
}

/* ---------- Today ---------- */
export function Today({ c }: { c: Ctx }) {
  const [data, setData] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(c.authed)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!c.authed) return
    let active = true
    setLoading(true)
    setError(null)
    apiGetToday()
      .then((d) => {
        if (active) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load tracking data")
          c.toast(err.message)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [c.authed, c.toast])

  const isAuth = c.authed
  const isPending = isAuth && loading

  const totals = isAuth
    ? (data?.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
    : c.logged
  const targetKcal = isAuth
    ? (data?.targets.kcal ?? prof(c).kcal)
    : prof(c).kcal
  const targetPro = isAuth
    ? (data?.targets.protein ?? TARGET.protein)
    : TARGET.protein
  const targetCarb = isAuth
    ? (data?.targets.carbs ?? TARGET.carbs)
    : TARGET.carbs
  const targetFat = isAuth ? (data?.targets.fat ?? TARGET.fat) : TARGET.fat
  const pct = targetKcal > 0 ? Math.round((totals.kcal / targetKcal) * 100) : 0

  return (
    <div
      className={`rise ${
        isPending
          ? "opacity-60 pointer-events-none transition-opacity"
          : "transition-opacity"
      }`}
    >
      <button
        onClick={() => (c.back ? c.back() : c.go("dashboard"))}
        className="text-sm text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5 transition mb-6"
      >
        ← Back
      </button>
      <Eyebrow>Live</Eyebrow>
      <Title className="mt-3">Today's Nutrition</Title>
      <div className="grid lg:grid-cols-[auto_1fr] gap-10 mt-10 items-center">
        <Ring
          value={isPending ? 0 : totals.kcal}
          max={targetKcal}
          size={280}
          stroke={20}
        >
          <div className="font-display text-6xl">
            {isPending ? "—" : totals.kcal.toLocaleString()}
          </div>
          <div className="font-mono text-sm text-ink-soft">
            / {targetKcal.toLocaleString()}
          </div>
          <div className="mt-2 px-3 py-0.5 rounded-full bg-mint text-leaf-deep text-sm font-semibold">
            {isPending ? "—" : `${pct}%`}
          </div>
        </Ring>
        <div className="grid sm:grid-cols-3 gap-4">
          {([
            ["Protein", totals.protein, targetPro, "leaf", "bg-mint"],
            ["Carbs", totals.carbs, targetCarb, "saffron", "bg-saffron-soft"],
            ["Fat", totals.fat, targetFat, "clay", "bg-sand"],
          ] as const).map(([l, v, m, t, bg]) => (
            <div key={l} className={`${bg} rounded-[28px] p-6`}>
              <div className="text-sm text-ink-soft">{l}</div>
              <div className="font-display text-4xl mt-2">
                {isPending ? "—" : Math.round(v)}
                <span className="text-lg text-ink-soft">/{m}g</span>
              </div>
              <div className="mt-5">
                <Bar value={isPending ? 0 : v} max={m} tone={t as any} />
              </div>
              <div className="font-mono text-xs text-ink-soft mt-2">
                {isPending ? "—" : `${Math.max(0, Math.round(m - v))}g left`}
              </div>
            </div>
          ))}
        </div>
      </div>
      <h2 className="font-display text-3xl mt-14 mb-4">Meals</h2>
      <ul className="divide-y divide-line border-y border-line">
        {isAuth
          ? (["Breakfast", "Lunch", "Snack", "Dinner"] as const).map(
              (slotName) => {
                const slotData = data?.slots.find(
                  (s) => s.slot === slotName.toLowerCase(),
                )
                const entries = slotData?.entries || []
                const done = entries.length > 0
                const name = entries.map((e) => e.name).join(" + ")
                const kcal = Math.round(slotData?.kcal || 0)
                const itemEmoji =
                  done && entries[0]
                    ? getFoodEmoji({
                        slug: entries[0].slug,
                        name: entries[0].name,
                      })
                    : SLOT_ICONS[slotName] || "🍽️"
                const subtitle = done
                  ? name
                  : isPending
                    ? "Loading..."
                    : error
                      ? "Could not load meals"
                      : "Not logged yet"
                return (
                  <li key={slotName} className="flex items-center gap-4 py-5">
                    <span className="text-2xl">{itemEmoji}</span>
                    <span className="w-28 font-semibold">{slotName}</span>
                    <span className="flex-1 text-ink-soft hidden sm:block">
                      {subtitle}
                    </span>
                    <span className="font-mono">
                      {done ? `${kcal} kcal` : "—"}
                    </span>
                    <span
                      className={`size-7 rounded-full grid place-items-center text-sm ${
                        done ? "bg-leaf text-paper" : "border-2 border-line"
                      }`}
                    >
                      {done ? "✓" : ""}
                    </span>
                  </li>
                )
              },
            )
          : c.plan.map((m) => (
              <li key={m.slot} className="flex items-center gap-4 py-5">
                <span className="text-2xl">
                  {m.done
                    ? m.icon || getFoodEmoji(m)
                    : SLOT_ICONS[m.slot] || "🍽️"}
                </span>
                <span className="w-28 font-semibold">{m.slot}</span>
                <span className="flex-1 text-ink-soft hidden sm:block">
                  {m.done ? m.name : "Not logged yet"}
                </span>
                <span className="font-mono">
                  {m.done ? `${m.kcal} kcal` : "—"}
                </span>
                <span
                  className={`size-7 rounded-full grid place-items-center text-sm ${
                    m.done ? "bg-leaf text-paper" : "border-2 border-line"
                  }`}
                >
                  {m.done ? "✓" : ""}
                </span>
              </li>
            ))}
      </ul>
    </div>
  )
}
/* ---------- Progress ---------- */
export function Progress({ c }: { c: Ctx }) {
  const [rangeLabel, setRangeLabel] =
    useState<"7 Days" | "30 Days" | "3 Months">("7 Days")
  const [data, setData] = useState<ProgressResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rangeMap: Record<"7 Days" | "30 Days" | "3 Months", ProgressRange> = {
    "7 Days": "7d",
    "30 Days": "30d",
    "3 Months": "90d",
  }

  const rangeBackend = rangeMap[rangeLabel]

  useEffect(() => {
    if (!c.authed) {
      setData(null)
      return
    }
    let active = true
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    setData(null)

    apiGetProgress(rangeBackend, ctrl.signal)
      .then((res) => {
        if (active) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active && err.name !== "AbortError") {
          setError(err.message || "Failed to load progress data")
          setLoading(false)
        }
      })

    const onUpdate = () => {
      apiGetProgress(rangeBackend)
        .then((res) => {
          if (active) setData(res)
        })
        .catch(() => {})
    }
    window.addEventListener("nutrisense-consumed-updated", onUpdate)
    window.addEventListener("nutrisense-tracking-updated", onUpdate)

    return () => {
      active = false
      ctrl.abort()
      window.removeEventListener("nutrisense-consumed-updated", onUpdate)
      window.removeEventListener("nutrisense-tracking-updated", onUpdate)
    }
  }, [c.authed, rangeBackend])

  const isAuth = c.authed
  const targetKcal = data?.target_kcal ?? prof(c).kcal ?? 2100
  const targetProtein = data?.target_protein ?? TARGET.protein ?? 110

  const daysData = data
    ? data.days.map((d) => {
        const dt = new Date(d.date + "T00:00:00")
        const weekday = dt.toLocaleDateString("en-GB", { weekday: "short" })
        const dayMonth = dt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })
        return {
          label: rangeBackend === "7d" ? weekday : dayMonth,
          shortDay: weekday.charAt(0),
          kcal: d.kcal,
          protein: d.protein,
          logged: d.logged,
          dateStr: d.date,
        }
      })
    : isAuth
      ? []
      : WEEK.map((d, i) => ({
          label: d.d,
          shortDay: d.d.charAt(0),
          kcal: d.kcal,
          protein: d.protein,
          logged: d.kcal > 0,
          dateStr: `Day ${i + 1}`,
        }))

  const W = 640,
    H = 200
  const maxKcal = Math.max(
    targetKcal * 1.25,
    ...daysData.map((d) => d.kcal),
    1000,
  )
  const maxProtein = Math.max(
    targetProtein * 1.2,
    ...daysData.map((d) => d.protein),
    50,
  )

  const numDays = daysData.length
  const pts = daysData.map((d, i) => {
    const x = numDays > 1 ? (i / (numDays - 1)) * W : W / 2
    const y = Math.max(10, Math.min(H, H - (d.kcal / maxKcal) * H))
    return [x, y] as const
  })

  const path =
    pts.length > 0
      ? pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")
      : `M0,${H} L${W},${H}`
  const yTarget = Math.max(10, Math.min(H, H - (targetKcal / maxKcal) * H))

  const avgKcal = data ? Math.round(data.avg_kcal) : isAuth ? 0 : 1937
  const totalMeals = data ? data.total_meals_logged : isAuth ? 0 : 23
  const daysLogged = data ? data.days_logged : isAuth ? 0 : 6
  const adherencePct = data ? Math.round(data.adherence_pct) : isAuth ? 0 : 71
  const topSlot = data?.top_slot
    ? data.top_slot.charAt(0).toUpperCase() + data.top_slot.slice(1)
    : null
  const mealsLoggedSubtitle =
    rangeLabel === "7 Days"
      ? "this week"
      : rangeLabel === "30 Days"
        ? "last 30 days"
        : "last 3 months"

  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Trends</Eyebrow>
          <Title className="mt-3">Your Progress</Title>
        </div>
        <div
          className="flex bg-sand/60 rounded-full p-1"
          role="tablist"
          aria-label="Time range"
        >
          {(["7 Days", "30 Days", "3 Months"] as const).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={rangeLabel === r}
              onClick={() => setRangeLabel(r)}
              className={`px-4 h-9 rounded-full text-sm font-semibold cursor-pointer transition ${
                rangeLabel === r ? "bg-paper shadow-sm" : "text-ink-soft"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!isAuth && (
        <div className="mt-6 rounded-2xl bg-sand/50 border border-sand-deep/40 p-4 flex items-center justify-between gap-4">
          <div className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">
              Previewing sample trends.
            </span>{" "}
            Sign in to track and sync your actual nutrition progress with the
            backend.
          </div>
          <Button onClick={() => c.go("auth")}>Sign in</Button>
        </div>
      )}

      {loading && isAuth && (
        <div className="mt-4 text-xs font-mono text-ink-soft animate-pulse">
          Updating progress from backend...
        </div>
      )}

      {error && isAuth && <div className="mt-4 text-xs text-clay">{error}</div>}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mt-8">
        <Card className="p-7">
          <div className="flex justify-between items-baseline">
            <span className="font-semibold">Calories</span>
            <span className="font-mono text-sm text-ink-soft">
              {daysLogged > 0
                ? `avg ${avgKcal.toLocaleString()} kcal`
                : isAuth
                  ? "No logs yet"
                  : "avg 1,937 kcal"}
            </span>
          </div>
          <svg
            viewBox={`-10 -10 ${W + 20} ${H + 45}`}
            className="w-full mt-6 overflow-visible"
          >
            <line
              x1={0}
              x2={W}
              y1={yTarget}
              y2={yTarget}
              stroke="var(--color-saffron)"
              strokeDasharray="4 6"
            />
            <text
              x={W}
              y={yTarget - 8}
              textAnchor="end"
              className="fill-ink-soft font-mono text-[11px]"
            >
              target {targetKcal.toLocaleString()}
            </text>
            <path
              d={`${path} L${W},${H} L0,${H} Z`}
              fill="var(--color-mint)"
              opacity=".6"
            />
            <path
              d={path}
              fill="none"
              stroke="var(--color-leaf)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {pts.map(([x, y], i) => {
              const d = daysData[i]
              if (numDays > 14 && !d.logged && i % 3 !== 0) return null
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={numDays > 14 ? 3 : 4.5}
                  fill={d.logged ? "var(--color-paper)" : "var(--color-sand)"}
                  stroke="var(--color-leaf)"
                  strokeWidth="2"
                >
                  <title>{`${d.dateStr}: ${Math.round(d.kcal)} kcal`}</title>
                </circle>
              )
            })}
            {daysData.map((d, i) => {
              if (numDays > 14) {
                const step = numDays > 31 ? 14 : 5
                if (i !== 0 && i !== numDays - 1 && i % step !== 0) return null
              }
              return (
                <text
                  key={i}
                  x={pts[i][0]}
                  y={H + 24}
                  textAnchor="middle"
                  className="fill-ink-soft font-mono text-[11px]"
                >
                  {d.label}
                </text>
              )
            })}
          </svg>
        </Card>
        <div className="grid gap-4">
          <Card className="p-7">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold">Protein</span>
              <span className="font-mono text-sm text-ink-soft">
                target {targetProtein}g
              </span>
            </div>
            <div className="flex items-end gap-1.5 sm:gap-2 h-32 mt-6">
              {daysData.map((d, i) => {
                const heightPct =
                  d.protein > 0
                    ? Math.min(100, Math.max(4, (d.protein / maxProtein) * 100))
                    : 3
                const meetsTarget = d.protein >= targetProtein * 0.9
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0"
                    title={`${d.dateStr}: ${Math.round(d.protein)}g protein`}
                  >
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        d.protein === 0
                          ? "bg-sand"
                          : meetsTarget
                            ? "bg-leaf"
                            : "bg-sand-deep"
                      }`}
                      style={{ height: `${heightPct}%`, minHeight: 3 }}
                    />
                    {numDays <= 14 && (
                      <span className="font-mono text-[10px] text-ink-soft">
                        {d.shortDay}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
          <Card className="p-7 flex items-center justify-between">
            <div>
              <span className="font-semibold">Meals logged</span>
              <p className="text-sm text-ink-soft">{mealsLoggedSubtitle}</p>
            </div>
            <span className="font-display text-6xl">{totalMeals}</span>
          </Card>
        </div>
      </div>

      <h2 className="font-display text-3xl mt-14 mb-5">Your patterns</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          [
            "🗓️",
            daysLogged > 0
              ? `You logged meals on ${daysLogged} of the last ${numDays} days.`
              : isAuth
                ? `No meals logged yet in the last ${numDays} days.`
                : "You logged meals on 6 of the last 7 days.",
          ],
          [
            "📈",
            adherencePct > 0
              ? `You met your daily calorie target on ${adherencePct}% of days.`
              : (data?.avg_protein ?? 0) > 0
                ? `Your average protein intake was ${Math.round(data?.avg_protein ?? 0)}g on logged days.`
                : isAuth
                  ? "Start logging daily to build your nutrition trends."
                  : "Your average protein intake increased this week.",
          ],
          [
            "☀️",
            data && totalMeals > 0 && topSlot
              ? `${topSlot} is your most frequently logged meal.`
              : isAuth
                ? "Log breakfast, lunch, or dinner to discover your peak meal time."
                : "Lunch is your most frequently logged meal.",
          ],
        ].map(([i, t]) => (
          <div
            key={i}
            className="rounded-[28px] bg-paper border border-line p-6 border-l-4 border-l-leaf"
          >
            <span className="text-2xl">{i}</span>
            <p className="font-display text-xl mt-4 leading-snug">{t}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Profile ---------- */
function Row({
  l,
  v,
  open,
  onToggle,
  children,
}: {
  l: string
  v: string
  open?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-4 py-4 px-3 rounded-xl text-left transition ${
          children ? "hover:bg-cream cursor-pointer" : "cursor-default"
        }`}
      >
        <span className="font-semibold">{l}</span>
        <span className="text-ink-soft text-sm text-right truncate">
          {v}{" "}
          {children && (
            <span
              className={`inline-block transition ${open ? "rotate-90" : ""}`}
            >
              ›
            </span>
          )}
        </span>
      </button>
      {open && <div className="rise px-3 pb-5 space-y-4">{children}</div>}
    </div>
  )
}

const prof = (c: Ctx) => {
  if (c.currentUser) {
    const cp = c.currentUser.profile
    const ct = c.currentUser.targets
    const currentYear = new Date().getFullYear()
    const age = cp?.birth_year
      ? currentYear - cp.birth_year
      : c.profile?.age || 25

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
      name: c.currentUser.name,
      email: c.currentUser.email,
      height: cp?.height_cm ?? c.profile?.height ?? 170,
      weight: cp?.weight_kg ?? c.profile?.weight ?? 68,
      age,
      goal: cp?.goal
        ? (goalMap[cp.goal] ?? cp.goal)
        : (c.profile?.goal ?? "Eat More Balanced"),
      style: cp?.diet_style
        ? (styleMap[cp.diet_style] ?? cp.diet_style)
        : (c.profile?.style ?? "Non-Vegetarian"),
      allergies:
        cp?.allergies && cp.allergies.length > 0
          ? cp.allergies.join(", ")
          : c.profile?.allergies || "None",
      kcal: ct?.kcal ?? c.profile?.kcal ?? 2100,
      notifications: c.profile?.notifications ?? true,
      sex: cp?.sex as any ?? c.profile?.sex ?? "female",
    }
  }
  return {
    ...DEFAULT_PROFILE,
    ...(c.profile ?? {}),
  }
}

const GOAL_OPTS = [
  "Eat More Balanced",
  "Lose Weight",
  "Gain Weight",
  "Build Muscle",
  "Improve Energy",
  "Eat Healthier",
]
const STYLE_OPTS = [
  "Non-Vegetarian",
  "Vegetarian",
  "Vegan",
  "Eggetarian",
  "Pescatarian",
]
const field =
  "h-12 w-full rounded-2xl border border-line bg-cream px-4 outline-none focus:border-leaf focus:ring-4 focus:ring-mint transition"

export function Profile({ c }: { c: Ctx }) {
  const p = prof(c)
  const [open, setOpen] = useState<string | null>(null)
  const [draft, setDraft] = useState(p)
  const [saving, setSaving] = useState(false)

  // Keep draft in sync when profile updates
  useEffect(() => {
    setDraft(p)
  }, [c.currentUser, c.profile])

  const bmi = bmiOf(p)
  const initials =
    p.name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "🙂"
  const edit = (k: string) => {
    setDraft(p)
    setOpen(open === k ? null : k)
  }
  const valid =
    draft.name.trim() &&
    /\S+@\S+\.\S+/.test(draft.email) &&
    draft.height >= 100 &&
    draft.height <= 250 &&
    draft.weight >= 25 &&
    draft.weight <= 300 &&
    draft.age >= 10 &&
    draft.age <= 110 &&
    draft.kcal >= 1000 &&
    draft.kcal <= 5000
  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      if (c.authed && c.currentUser) {
        if (draft.name.trim() !== c.currentUser.name) {
          await apiUpdateMe({ name: draft.name.trim() })
        }
        const backendProf = toBackendProfile(
          draft,
          c.currentUser.profile?.sex as any || draft.sex || "female",
        )
        await apiPutProfile(backendProf)
        const updatedMe = await apiGetMe()
        if (c.setCurrentUser) {
          c.setCurrentUser(updatedMe)
        }
        const updatedFront = backendProfileToFrontend(updatedMe, draft)
        c.setProfile(updatedFront)
      } else {
        c.setProfile({
          ...draft,
          name: draft.name.trim(),
          email: draft.email.trim(),
        })
      }
      setOpen(null)
      c.toast("Profile updated")
    } catch (err: any) {
      console.error("Failed to update profile:", err)
      c.toast(err?.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }
  const set = <K extends keyof typeof p>(k: K, v: typeof p[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))
  const num = (
    k: "height" | "weight" | "age" | "kcal",
    label: string,
    unit: string,
  ) => (
    <label className="block">
      <span className="text-xs font-semibold text-ink-soft">{label}</span>
      <div className="relative mt-1.5">
        <input
          type="number"
          inputMode="numeric"
          value={draft[k] || ""}
          onChange={(e) => set(k, Number(e.target.value))}
          className={`${field} pr-12`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
          {unit}
        </span>
      </div>
    </label>
  )
  const actions = (
    <div className="flex gap-2 pt-2">
      <Button onClick={save} disabled={!valid || saving}>
        {saving ? "Saving..." : "Save changes"}
      </Button>
      <Button variant="ghost" onClick={() => setOpen(null)} disabled={saving}>
        Cancel
      </Button>
      {!valid && (
        <span className="self-center text-xs text-clay">
          Some values look off. Check and try again
        </span>
      )}
    </div>
  )
  return (
    <div className="rise max-w-3xl mx-auto">
      <Eyebrow>Account</Eyebrow>
      <Title className="mt-3">Your Profile</Title>
      <Card className="p-7 mt-8 flex items-center gap-5">
        <div className="size-20 shrink-0 rounded-full bg-leaf text-paper grid place-items-center font-display text-3xl">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl truncate">{p.name}</div>
          <div className="text-ink-soft text-sm truncate">
            {p.email} · BMI {bmi}
          </div>
        </div>
        <Button variant="secondary" onClick={() => edit("account")}>
          Edit
        </Button>
      </Card>
      <Card className="p-3 mt-4 divide-y divide-line">
        <Row
          open={open === "account"}
          onToggle={() => edit("account")}
          l="Name & Email"
          v={p.email}
        >
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft">
              Full name
            </span>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              className={`${field} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft">Email</span>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              className={`${field} mt-1.5`}
            />
          </label>
          {actions}
        </Row>
        <Row
          open={open === "body"}
          onToggle={() => edit("body")}
          l="Personal Details"
          v={`${p.height} cm · ${p.weight} kg · ${p.age} yrs`}
        >
          <div className="grid grid-cols-3 gap-3">
            {num("height", "Height", "cm")}
            {num("weight", "Weight", "kg")}
            {num("age", "Age", "yrs")}
          </div>
          <div>
            <span className="text-xs font-semibold text-ink-soft">
              Biological Sex
            </span>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {([
                ["female", "Female"],
                ["male", "Male"],
                ["other", "Other"],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("sex", val)}
                  className={`h-10 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    (draft.sex || "female") === val
                      ? "border-leaf bg-mint/40 text-leaf-deep"
                      : "border-line bg-sand/30 hover:bg-sand/60 text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {draft.height > 0 && draft.weight > 0 && (
            <p className="text-sm text-ink-soft">
              New BMI:{" "}
              <span className="font-semibold text-ink">{bmiOf(draft)}</span>
            </p>
          )}
          {actions}
        </Row>
        <Row
          open={open === "goal"}
          onToggle={() => edit("goal")}
          l="Nutrition Goal"
          v={p.goal}
        >
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTS.map((g) => (
              <Chip
                key={g}
                on={draft.goal === g}
                onClick={() => set("goal", g)}
              >
                {g}
              </Chip>
            ))}
          </div>
          {actions}
        </Row>
        <Row
          open={open === "style"}
          onToggle={() => edit("style")}
          l="Food Preferences"
          v={p.style}
        >
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTS.map((g) => (
              <Chip
                key={g}
                on={draft.style === g}
                onClick={() => set("style", g)}
              >
                {g}
              </Chip>
            ))}
          </div>
          {actions}
        </Row>
        <Row
          open={open === "allergy"}
          onToggle={() => edit("allergy")}
          l="Allergies & Restrictions"
          v={p.allergies || "None"}
        >
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft">
              Separate with commas
            </span>
            <input
              value={draft.allergies}
              onChange={(e) => set("allergies", e.target.value)}
              placeholder="e.g. Peanuts, Lactose"
              className={`${field} mt-1.5`}
            />
          </label>
          {actions}
        </Row>
        <Row
          open={open === "kcal"}
          onToggle={() => edit("kcal")}
          l="Daily Calorie Target"
          v={`${p.kcal.toLocaleString()} kcal`}
        >
          {num("kcal", "Calories per day", "kcal")}
          <p className="text-xs text-ink-soft">
            Updates your dashboard ring and planner totals.
          </p>
          {actions}
        </Row>
        <Row
          l="BMI"
          v={`${bmi} · ${
            bmi < 18.5
              ? "Underweight"
              : bmi < 25
                ? "Healthy range"
                : bmi < 30
                  ? "Overweight"
                  : "Obese"
          }`}
        />
      </Card>
      <Eyebrow className="mt-10 mb-3">Settings</Eyebrow>
      <Card className="p-3">
        <div className="flex items-center justify-between py-4 px-3">
          <span className="font-semibold">Notifications</span>
          <button
            role="switch"
            aria-checked={p.notifications}
            onClick={() =>
              c.setProfile({ ...p, notifications: !p.notifications })
            }
            className={`relative h-7 w-12 rounded-full transition cursor-pointer ${
              p.notifications ? "bg-leaf" : "bg-sand-deep"
            }`}
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-paper shadow transition-all ${
                p.notifications ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
      </Card>
      <Button
        variant="danger"
        className="mt-6"
        onClick={() => {
          c.logout()
          c.go("landing")
        }}
      >
        Log out
      </Button>
    </div>
  )
}
