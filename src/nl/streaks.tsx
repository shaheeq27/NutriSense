import { useState, useEffect } from "react"
import type { Ctx } from "./data"
import { Button, Card, Eyebrow, Title } from "./ui"
import { apiGetProgress, type ProgressResponse } from "./api"

/* ---------- Model ---------- */
export type Habit = "protein" | "fiber" | "veg" | "breakfast" | "water"
export type DayRecord = {
  checkin: boolean // logged at least one meal
  balanced: boolean // broadly followed the plan
  level: 0 | 1 | 2 | 3 // how full the day was (0 none → 3 all meals)
  shielded?: boolean
  habits: Record<Habit, boolean>
}
export type StreakState = { history: DayRecord[] shields: number focus: Habit } // history[0] = today

export const HABITS: Record<Habit, {
  icon: string
  label: string
  verb: string
}> = {
  protein: {
    icon: "💪",
    label: "Protein goal",
    verb: "hit your protein target",
  },
  fiber: { icon: "🌾", label: "Fiber goal", verb: "reached 25 g+ fiber" },
  veg: { icon: "🥦", label: "Fruit & veg", verb: "ate 5 portions of plants" },
  breakfast: {
    icon: "🌅",
    label: "Breakfast rhythm",
    verb: "had breakfast before 10",
  },
  water: { icon: "💧", label: "Hydration", verb: "drank 8 glasses" },
}

export const MILESTONES = [
  [3, "Getting started"],
  [7, "Building momentum"],
  [14, "Finding your rhythm"],
  [30, "Strong routine"],
  [60, "Consistency pro"],
  [100, "Nutrition mastery"],
] as const

// Deterministic demo history: a 12-day run, then yesterday was missed.
const wave = (i: number, k: number) =>
  (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1
const pseudo = (i: number, k: number) => Math.abs(wave(i, k))
export function seedStreak(): StreakState {
  const history: DayRecord[] = Array.from({ length: 70 }, (_, i) => {
    const missed = i === 1 || i === 14 || i === 15 || i === 33 || i === 47
    const level = missed ? 0 : (1 + Math.floor(pseudo(i, 1) * 3)) as 1 | 2 | 3
    return {
      checkin: !missed,
      balanced: !missed && pseudo(i, 2) > 0.3,
      level,
      habits: {
        protein: !missed && (i < 6 ? i !== 5 : pseudo(i, 3) > 0.35),
        fiber: !missed && pseudo(i, 4) > 0.45,
        veg: !missed && pseudo(i, 5) > 0.4,
        breakfast: !missed && pseudo(i, 6) > 0.2,
        water: !missed && pseudo(i, 7) > 0.5,
      },
    }
  })
  history[0] = { ...history[0], checkin: false, balanced: false, level: 0 }
  return { history, shields: 1, focus: "protein" }
}

export function emptyStreak(): StreakState {
  const history: DayRecord[] = Array.from({ length: 70 }, () => ({
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
  }))
  return { history, shields: 1, focus: "protein" }
}

export function backendProgressToStreak(
  progress: ProgressResponse,
  prevStreak?: StreakState,
): StreakState {
  const reversed = [...progress.days].reverse()
  const history: DayRecord[] = Array.from({ length: 70 }, (_, i) => {
    const existing = prevStreak?.history?.[i]
    if (i < reversed.length) {
      const d = reversed[i]
      const targetKcal = progress.target_kcal || 2000
      const ratio = targetKcal > 0 ? d.kcal / targetKcal : 0
      const level: DayRecord["level"] = !d.logged
        ? 0
        : ratio >= 0.85
          ? 3
          : ratio >= 0.4
            ? 2
            : 1
      const balanced = d.logged && ratio >= 0.75 && ratio <= 1.25
      return {
        checkin: d.logged,
        balanced,
        level,
        shielded: existing?.shielded ?? false,
        habits: {
          protein:
            d.logged && d.protein >= (progress.target_protein || 100) * 0.7,
          fiber: d.logged,
          veg: d.logged,
          breakfast: d.logged,
          water: d.logged,
        },
      }
    }
    return {
      checkin: false,
      balanced: false,
      level: 0,
      shielded: existing?.shielded ?? false,
      habits: {
        protein: false,
        fiber: false,
        veg: false,
        breakfast: false,
        water: false,
      },
    }
  })

  return {
    history,
    shields: prevStreak?.shields ?? progress.shields_available ?? 1,
    focus: prevStreak?.focus ?? "protein",
  }
}

/* ---------- Derived stats ---------- */
const kept = (d: DayRecord) => d.checkin || !!d.shielded
function run(h: DayRecord[], ok: (d: DayRecord) => boolean) {
  // Today doesn't break a streak until it's over.
  let n = 0
  for (let i = ok(h[0]) ? 0 : 1; i < h.length && ok(h[i]); i++) n++
  return n
}
export function streakStats(
  s: StreakState,
  todayCheckedIn: boolean,
  overrides?: {
    current?: number
    best?: number
    lifetime?: number
  },
) {
  const h = s.history.map((d, i) =>
    i === 0
      ? {
          ...d,
          checkin: todayCheckedIn || d.checkin,
          level: todayCheckedIn ? Math.max(d.level, 2) as 2 : d.level,
        }
      : d,
  )
  const calcCurrent = run(h, kept)
  const current =
    overrides?.current !== undefined
      ? Math.max(overrides.current, calcCurrent)
      : calcCurrent
  // Yesterday missed but the run before it was alive → recoverable.
  const prior = run(h.slice(1), kept)
  const atRisk = !kept(h[1]) ? run(h.slice(2), kept) : 0
  const lifetime =
    overrides?.lifetime !== undefined
      ? Math.max(overrides.lifetime, h.filter((d) => d.checkin).length)
      : h.filter((d) => d.checkin).length
  const calcBest = h.reduce(
    (acc, d) =>
      kept(d)
        ? { cur: acc.cur + 1, max: Math.max(acc.max, acc.cur + 1) }
        : { cur: 0, max: acc.max },
    { cur: 0, max: 0 },
  ).max
  const best =
    overrides?.best !== undefined
      ? Math.max(overrides.best, calcBest, current)
      : Math.max(calcBest, current)
  const week = h.slice(0, 7).reverse()
  const balancedWeek = h.slice(0, 7).filter((d) => d.balanced).length
  const habitRun = run(h, (d) => d.habits[s.focus])
  const display = current || 0
  const next = MILESTONES.find(([n]) => n > display)
  return {
    h,
    current: display,
    prior,
    atRisk,
    lifetime,
    best,
    week,
    balancedWeek,
    habitRun,
    next,
  }
}

export const flameTier = (n: number) =>
  n >= 30 ? "rooted" : n >= 7 ? "warm" : "ember"

/* ---------- Flame ---------- */
export function Flame({
  days,
  size = 64,
  still = false,
}: {
  days: number
  size?: number
  still?: boolean
}) {
  const tier = flameTier(days)
  const [a, b] =
    tier === "rooted"
      ? ["#4CAF50", "#1B5E20"]
      : tier === "warm"
        ? ["#FBC02D", "#FF8F3D"]
        : ["#FFD8A8", "#E9A23B"]
  const id = `fl-${tier}`
  return (
    <svg
      viewBox="0 0 64 80"
      width={size}
      height={size * 1.25}
      className={still ? "" : "flame"}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx=".5" cy=".7" r=".5">
          <stop offset="0" stopColor="#FFF8EC" />
          <stop offset="1" stopColor="#FFF8EC" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M32 2C36 18 54 28 54 50a22 22 0 0 1-44 0c0-10 5-17 10-22 1 7 4 11 8 12-3-14 2-26 8-38Z"
        fill={`url(#${id})`}
      />
      <ellipse
        cx="32"
        cy="56"
        rx="11"
        ry="14"
        fill={`url(#${id}-core)`}
        opacity=".85"
      />
      {tier === "rooted" && (
        <path
          d="M32 62c-6-4-8-10-6-16 4 2 6 6 6 16Zm0 0c6-4 8-10 6-16-4 2-6 6-6 16Z"
          fill="#FFF8EC"
          opacity=".9"
        />
      )}
    </svg>
  )
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"]
const dowOf = (offset: number) =>
  DOW[new Date(Date.now() - offset * 864e5).getDay()]
const tone = (d: DayRecord) =>
  d.shielded
    ? "bg-sky-100 dark:bg-sky-900/40 ring-1 ring-sky-300/70"
    : !d.checkin
      ? "bg-sand/70"
      : d.level === 1
        ? "bg-saffron-soft"
        : d.level === 2
          ? "bg-[#ffb36b]"
          : "bg-gradient-to-br from-[#7cc47f] to-leaf"

/* ---------- Week dots (shared) ---------- */
function WeekDots({
  week,
  dark = false,
}: {
  week: DayRecord[]
  dark?: boolean
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {week.map((d, i) => {
        const off = 6 - i
        const today = off === 0
        return (
          <div key={off} className="flex flex-col items-center gap-2">
            <span
              className={`font-mono text-[11px] ${
                dark ? "text-paper/50" : "text-ink-soft"
              }`}
            >
              {dowOf(off)}
            </span>
            <span
              className={`size-8 md:size-9 rounded-full grid place-items-center text-xs font-bold transition
              ${
                d.shielded
                  ? "bg-sky-200 text-sky-900"
                  : d.checkin
                    ? "bg-gradient-to-br from-saffron to-[#ff8f3d] text-ink"
                    : today
                      ? `border-2 border-dashed ${
                          dark ? "border-paper/30" : "border-sand-deep"
                        }`
                      : dark
                        ? "bg-paper/10"
                        : "bg-sand"
              }`}
            >
              {d.shielded ? "🛡" : d.checkin ? "✓" : ""}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Dashboard card ---------- */
export function StreakCard({
  c,
  progress,
}: {
  c: Ctx
  progress?: ProgressResponse | null
}) {
  const [prog, setProg] = useState<ProgressResponse | null>(progress ?? null)

  useEffect(() => {
    if (progress !== undefined) setProg(progress)
  }, [progress])

  useEffect(() => {
    if (!c.authed) return
    let active = true
    const load = () => {
      apiGetProgress("7d")
        .then((res) => {
          if (active) {
            setProg(res)
            c.setStreak((prev) => backendProgressToStreak(res, prev))
          }
        })
        .catch(() => {})
    }
    if (!progress) load()
    const onTrackingUpdate = () => {
      if (active) load()
    }
    window.addEventListener("nutrisense-tracking-updated", onTrackingUpdate)
    return () => {
      active = false
      window.removeEventListener(
        "nutrisense-tracking-updated",
        onTrackingUpdate,
      )
    }
  }, [c.authed, progress])

  const effectiveProg = prog || progress
  const st = streakStats(
    c.streak,
    c.plan.some((m) => m.done) || (c.authed && c.logged.kcal > 0),
    c.authed && effectiveProg
      ? {
          current: effectiveProg.current_streak,
          best: effectiveProg.best_streak,
          lifetime: effectiveProg.lifetime_logged_days,
        }
      : undefined,
  )
  const paused = st.atRisk > 0 && !st.current
  const n = st.current || st.atRisk
  const prev = st.next
    ? (MILESTONES[MILESTONES.indexOf(st.next) - 1]?.[0] ?? 0)
    : 0
  const pct = st.next ? ((st.current - prev) / (st.next[0] - prev)) * 100 : 100
  return (
    <button
      onClick={() => c.go("streaks")}
      className="group relative w-full text-left overflow-hidden rounded-[28px] border border-line bg-paper p-5 md:p-6 cursor-pointer transition hover:border-saffron/50 hover:shadow-[0_18px_40px_-24px_rgba(255,143,61,.55)]"
    >
      <div
        className="pointer-events-none absolute -left-10 -top-16 size-48 rounded-full bg-saffron/20 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8">
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-saffron-soft/70">
            <Flame days={n} size={34} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-ink-soft">
              {paused ? "Streak paused" : "Check-in streak"}
            </p>
            <p className="font-display text-4xl leading-none mt-1 tabular-nums">
              {n}
              <span className="ml-1.5 text-base text-ink-soft">days</span>
            </p>
          </div>
        </div>

        <div className="min-w-0 md:border-l md:border-line md:pl-8">
          <div className="flex gap-1.5 md:gap-2">
            {st.week.map((d, i) => {
              const today = i === 6
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span
                    className={`h-2 w-full rounded-full ${
                      d.shielded
                        ? "bg-sky-300"
                        : d.checkin
                          ? "bg-gradient-to-r from-saffron to-[#ff8f3d]"
                          : today
                            ? "bg-transparent border border-dashed border-sand-deep"
                            : "bg-sand"
                    }`}
                  />
                  <span
                    className={`font-mono text-[10px] ${
                      today ? "text-ink font-semibold" : "text-ink-soft"
                    }`}
                  >
                    {dowOf(6 - i)}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-sm text-ink-soft truncate">
            {paused ? (
              "Missed yesterday — a shield can restore it."
            ) : st.next ? (
              <>
                <span className="text-ink font-semibold">
                  {st.next[0] - st.current} days
                </span>{" "}
                to {st.next[1].toLowerCase()}
              </>
            ) : (
              "You have built something lasting."
            )}
          </p>
          {!paused && st.next && (
            <div className="mt-2 h-1 rounded-full bg-sand overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-saffron to-leaf"
                style={{ width: `${Math.max(6, pct)}%` }}
              />
            </div>
          )}
        </div>

        <span
          className={`inline-flex h-10 items-center justify-center gap-1 rounded-full px-4 text-sm font-semibold transition ${
            paused
              ? "bg-saffron text-[#23241f]"
              : "bg-sand/70 text-ink group-hover:bg-sand"
          }`}
        >
          {paused ? "Restore" : "View streaks"}{" "}
          <span className="transition group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </button>
  )
}

/* ---------- Hub ---------- */
export function StreaksHub({ c }: { c: Ctx }) {
  const [prog, setProg] = useState<ProgressResponse | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (!c.authed) return
    let active = true
    const load = () => {
      apiGetProgress("30d")
        .then((res) => {
          if (active) {
            setProg(res)
            c.setStreak((prev) => backendProgressToStreak(res, prev))
          }
        })
        .catch(() => {})
    }
    load()
    const onTrackingUpdate = () => {
      if (active) load()
    }
    window.addEventListener("nutrisense-tracking-updated", onTrackingUpdate)
    return () => {
      active = false
      window.removeEventListener(
        "nutrisense-tracking-updated",
        onTrackingUpdate,
      )
    }
  }, [c.authed])

  const st = streakStats(
    c.streak,
    c.plan.some((m) => m.done) || (c.authed && c.logged.kcal > 0),
    c.authed && prog
      ? {
          current: prog.current_streak,
          best: prog.best_streak,
          lifetime: prog.lifetime_logged_days,
        }
      : undefined,
  )
  const s = c.streak
  const restore = () => {
    if (s.shields < 1) return
    const history = s.history.map((d, i) =>
      i === 1 ? { ...d, shielded: true } : d,
    )
    c.setStreak({ ...s, history, shields: s.shields - 1 })
    setCelebrate(true)
    c.toast("Streak restored with a shield")
    setTimeout(() => setCelebrate(false), 1800)
  }
  const shown = st.current
  const pct = st.next
    ? Math.round(
        ((shown - (MILESTONES[MILESTONES.indexOf(st.next) - 1]?.[0] ?? 0)) /
          (st.next[0] -
            (MILESTONES[MILESTONES.indexOf(st.next) - 1]?.[0] ?? 0))) *
          100,
      )
    : 100

  return (
    <div className="rise space-y-6">
      <div>
        <button
          onClick={() => (c.back ? c.back() : c.go("dashboard"))}
          className="text-sm text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5 transition"
        >
          ← Back
        </button>
        <Eyebrow className="mt-6">Your rhythm</Eyebrow>
        <Title className="mt-3">Streaks</Title>
        <p className="text-ink-soft mt-2 max-w-lg">
          We reward showing up, not perfection.
        </p>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[36px] md:rounded-[44px] bg-ink text-paper p-8 md:p-12">
        <div
          className="absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_110%,rgba(255,143,61,.35),transparent_70%),radial-gradient(500px_260px_at_90%_-10%,rgba(76,175,80,.25),transparent_70%)]"
          aria-hidden
        />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-10 items-center">
          <div className="flex items-center gap-6 md:gap-8">
            <div className={celebrate ? "flame-burst" : ""}>
              <Flame days={shown || st.atRisk} size={96} />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[.24em] text-paper/55">
                Check-in streak
              </p>
              <p className="font-display text-[clamp(72px,12vw,128px)] leading-[.85] tracking-[-.04em] mt-1 tabular-nums">
                {shown}
              </p>
              <p className="text-paper/70 mt-2">
                {shown
                  ? `You've checked in with your nutrition ${shown} day${
                      shown === 1 ? "" : "s"
                    } in a row.`
                  : "Log any meal today to start a new run."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:min-w-52">
            <div className="rounded-3xl bg-paper/[.06] border border-paper/10 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-paper/50">
                Lifetime check-ins
              </p>
              <p className="font-display text-3xl mt-1">{st.lifetime}</p>
              <p className="text-[11px] text-paper/50">Never resets</p>
            </div>
            <div className="rounded-3xl bg-paper/[.06] border border-paper/10 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-paper/50">
                Best run
              </p>
              <p className="font-display text-3xl mt-1">
                {Math.max(st.best, shown)}{" "}
                <span className="text-sm text-paper/50">days</span>
              </p>
            </div>
          </div>
        </div>

        {st.atRisk > 0 && !shown && (
          <div className="relative mt-8 rounded-3xl bg-paper text-ink p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5">
            <span className="text-3xl" aria-hidden>
              🛡️
            </span>
            <div className="flex-1">
              <p className="font-display text-2xl">
                Your {st.atRisk}-day streak paused. Your progress didn’t.
              </p>
              <p className="text-sm text-ink-soft mt-1">
                You missed yesterday, and that’s okay. Use a shield to keep your
                run going{s.shields ? "" : " — or simply start again today"}.
              </p>
            </div>
            <Button size="lg" disabled={!s.shields} onClick={restore}>
              {s.shields
                ? `Restore streak · ${s.shields} shield`
                : "No shields left this month"}
            </Button>
          </div>
        )}
        {!st.atRisk && !c.plan.some((m) => m.done) && shown > 0 && (
          <p className="relative mt-8 text-sm text-paper/70">
            Today’s still open. Log any meal to make it day {shown + 1}.
          </p>
        )}

        <div className="relative mt-10 pt-8 border-t border-paper/10">
          <p className="font-mono text-[11px] uppercase tracking-[.22em] text-paper/50 mb-4">
            This week
          </p>
          <WeekDots week={st.week} dark />
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-6">
        {/* Rhythm ribbon */}
        <Card className="p-7 md:p-8">
          <div className="flex items-baseline justify-between">
            <div>
              <Eyebrow>Rhythm · last 5 weeks</Eyebrow>
              <p className="font-display text-2xl mt-2">
                Every square is a day you showed up.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 md:gap-2 mt-6">
            {st.h
              .slice(0, 35)
              .reverse()
              .map((d, i) => (
                <span
                  key={i}
                  title={
                    d.shielded
                      ? "Protected by a shield"
                      : d.checkin
                        ? `Check-in · ${["", "light", "steady", "full"][d.level]} day`
                        : "No check-in"
                  }
                  className={`rhythm-cell aspect-square rounded-lg md:rounded-xl ${tone(d)} ${
                    i === 34
                      ? "ring-2 ring-offset-2 ring-offset-paper ring-ink/70"
                      : ""
                  }`}
                  style={{ animationDelay: `${i * 18}ms` }}
                />
              ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-xs text-ink-soft">
            {[
              ["bg-sand/70", "Rest"],
              ["bg-saffron-soft", "Light"],
              ["bg-[#ffb36b]", "Steady"],
              ["bg-gradient-to-br from-[#7cc47f] to-leaf", "Full day"],
              ["bg-sky-200", "Shielded"],
            ].map(([b, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className={`size-3 rounded ${b}`} />
                {l}
              </span>
            ))}
          </div>
        </Card>

        {/* Shields */}
        <Card className="p-7 md:p-8 flex flex-col">
          <Eyebrow>Streak shield</Eyebrow>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex gap-1.5">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={`size-12 rounded-2xl grid place-items-center text-2xl ${
                    i < s.shields
                      ? "bg-sky-100 dark:bg-sky-900/40"
                      : "bg-sand/60 grayscale opacity-40"
                  }`}
                >
                  🛡️
                </span>
              ))}
            </div>
            <div>
              <p className="font-display text-3xl">
                {s.shields}{" "}
                <span className="text-base text-ink-soft">available</span>
              </p>
            </div>
          </div>
          <p className="text-ink-soft mt-4 text-sm leading-relaxed">
            Protect your streak when life gets busy. You earn one shield each
            month by checking in on 20+ days. You can hold up to 2.
          </p>
          <div className="mt-auto pt-6">
            <div className="flex justify-between text-xs text-ink-soft mb-2">
              <span>Next shield</span>
              <span>
                {Math.min(
                  20,
                  st.h.slice(0, 30).filter((d) => d.checkin).length,
                )}
                /20 days
              </span>
            </div>
            <div className="h-2 rounded-full bg-sand overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-saffron to-leaf"
                style={{
                  width: `${Math.min(100, (st.h.slice(0, 30).filter((d) => d.checkin).length / 20) * 100)}%`,
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Habits */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <Eyebrow>Your habits</Eyebrow>
            <h2 className="font-display text-3xl mt-2">
              Built around your goals.
            </h2>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <span className="text-2xl">🍽️</span>
              <span className="font-mono text-xs text-leaf">MAIN</span>
            </div>
            <p className="font-semibold mt-4">Meal check-ins</p>
            <p className="font-display text-4xl mt-1">
              {shown} <span className="text-base text-ink-soft">days</span>
            </p>
            <p className="text-sm text-ink-soft mt-2">
              At least one meal logged each day.
            </p>
          </Card>
          <Card className="p-6">
            <span className="text-2xl">🥗</span>
            <p className="font-semibold mt-4">Balanced days</p>
            <p className="font-display text-4xl mt-1">
              {st.balancedWeek}
              <span className="text-base text-ink-soft">/7 this week</span>
            </p>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 7 }, (_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i < st.balancedWeek ? "bg-leaf" : "bg-sand"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-ink-soft mt-3">
              Broadly aligned with your plan. Off days are part of it.
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <span className="text-2xl">{HABITS[s.focus].icon}</span>
              <select
                aria-label="Choose focus habit"
                value={s.focus}
                onChange={(e) =>
                  c.setStreak({ ...s, focus: e.target.value as Habit })
                }
                className="text-xs font-semibold bg-sand/70 rounded-full px-3 h-8 outline-none cursor-pointer"
              >
                {(Object.keys(HABITS) as Habit[]).map((k) => (
                  <option key={k} value={k}>
                    {HABITS[k].label}
                  </option>
                ))}
              </select>
            </div>
            <p className="font-semibold mt-4">{HABITS[s.focus].label}</p>
            <p className="font-display text-4xl mt-1">
              {st.habitRun}{" "}
              <span className="text-base text-ink-soft">days</span>
            </p>
            <p className="text-sm text-ink-soft mt-2">
              Days in a row you {HABITS[s.focus].verb}.
            </p>
          </Card>
        </div>
      </section>

      {/* Consistency insight */}
      <Card className="p-7 md:p-8 grid md:grid-cols-[auto_1fr] gap-6 items-center bg-[radial-gradient(circle_at_0%_0%,var(--color-mint),transparent_55%)]">
        <span
          className="size-14 rounded-2xl bg-mint grid place-items-center text-2xl"
          aria-hidden
        >
          📈
        </span>
        <div>
          <Eyebrow>Beyond the number</Eyebrow>
          <p className="font-display text-2xl mt-2">
            Your meal timing has become more consistent over the last 2 weeks.
          </p>
          <p className="text-ink-soft mt-2 text-sm">
            Lunch now lands within a 45-minute window on most days — down from 2
            hours. Steady timing helps keep energy and hunger predictable.
          </p>
        </div>
      </Card>

      {/* Milestones */}
      <section>
        <Eyebrow>Milestones</Eyebrow>
        <div className="mt-4 rounded-[28px] border border-line bg-paper p-6 md:p-8">
          {st.next && (
            <div className="mb-8">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Next: {st.next[1]}</span>
                <span className="text-ink-soft">
                  {st.next[0] - shown} days to go
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-sand overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-saffron via-[#ffb36b] to-leaf transition-[width] duration-700"
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
            </div>
          )}
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MILESTONES.map(([n, label]) => {
              const done = Math.max(st.best, shown) >= n
              const isNext = st.next?.[0] === n
              return (
                <li
                  key={n}
                  className={`rounded-3xl p-5 flex items-center gap-4 border ${
                    done
                      ? "bg-saffron-soft/60 border-transparent"
                      : isNext
                        ? "border-saffron/60 border-dashed"
                        : "border-line opacity-60"
                  }`}
                >
                  <Flame days={n} size={30} still />
                  <div className="flex-1">
                    <p className="font-display text-xl">{n} days</p>
                    <p className="text-sm text-ink-soft">{label}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      done ? "text-leaf" : "text-ink-soft"
                    }`}
                  >
                    {done ? "✓ Reached" : isNext ? `${n - shown} to go` : "🔒"}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <p className="text-center font-display text-xl md:text-2xl text-ink-soft py-6">
        Your streak can reset.{" "}
        <em className="text-leaf">Your progress doesn’t.</em>
      </p>
    </div>
  )
}
