import { useEffect, useRef, useState } from "react"
import {
  DEFAULT_PROFILE,
  FOODS,
  emptyPlan,
  backendProfileToFrontend,
  type Ctx,
  type Profile as UserProfile,
  type Food,
  type Screen,
  type Meal,
} from "./nl/data"
import {
  Analyzer,
  Auth,
  BMI,
  Camera,
  Identified,
  Landing,
  Onboarding,
  Result,
} from "./nl/guest"
import {
  clearConsumedKeys,
  Dashboard,
  MealDetail,
  Planner,
  Profile,
  Progress,
  Today,
} from "./nl/member"
import {
  emptyStreak,
  seedStreak,
  backendProgressToStreak,
  StreaksHub,
} from "./nl/streaks"
import {
  clearDayState,
  loadDay,
  saveDay,
  syncTo,
  todayKey,
  ZERO,
} from "./nl/day"
import {
  apiLogin,
  apiRegister,
  apiGetMe,
  apiGetToday,
  apiGetProgress,
  setToken,
  clearToken,
  getToken,
  type UserMe,
} from "./nl/api"
import { AIAssistant } from "./nl/AIAssistant"
import { Logo, ThemeToggle } from "./nl/ui"

// Developer credits shown in the footer — replace with your details.
const DEVELOPER = {
  name: "Shaheeq Shaik",
  role: "AI/ML Engineer & Full-Stack Developer",
  initials: "SS",
  github: "https://github.com/shaheeq27",
  linkedin: "https://www.linkedin.com/in/your-profile",
}

const NAV: { s: Screen l: string i: string }[] = [
  { s: "dashboard", l: "Home", i: "⌂" },
  { s: "analyze", l: "Analyze", i: "◎" },
  { s: "plan", l: "Meal Plan", i: "▤" },
  { s: "progress", l: "Progress", i: "↗" },
  { s: "profile", l: "Profile", i: "○" },
]

const VALID_SCREENS: Screen[] = [
  "landing",
  "analyze",
  "camera",
  "identified",
  "result",
  "bmi",
  "auth",
  "onboard",
  "dashboard",
  "plan",
  "meal",
  "today",
  "progress",
  "profile",
  "streaks",
]

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("nutrisense-theme")
    if (saved === "light" || saved === "dark") return saved
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  })
  const [screen, setScreen] = useState<Screen>(() => {
    const hash = window.location.hash.replace(/^#/, "") as Screen
    return VALID_SCREENS.includes(hash) ? hash : "landing"
  })
  const [history, setHistory] = useState<Screen[]>([])
  const [authed, setAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserMe | null>(null)
  const [food, setFood] = useState<Food>(FOODS[0])
  const [initial] = useState(loadDay)
  const [plan, setPlan] = useState(initial.plan)
  const [mealIdx, setMealIdx] = useState(1)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [logged, setLogged] = useState(initial.logged)
  const [future, setFuture] = useState<Record<number, Meal[]>>(initial.future)
  const [date, setDate] = useState(initial.date)
  const [analyzeTab, setAnalyzeTab] =
    useState<"search" | "identify" | "packaged">("search")
  const [streak, setStreak] = useState(initial.streak)
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      return {
        ...DEFAULT_PROFILE,
        ...JSON.parse(localStorage.getItem("nutrisense-profile") ?? "{}"),
      }
    } catch {
      return DEFAULT_PROFILE
    }
  })

  const isSubScreen = [
    "camera",
    "identified",
    "result",
    "bmi",
    "auth",
    "onboard",
    "meal",
    "today",
    "streaks",
  ].includes(screen)

  const canBack =
    (history.length > 0 && screen !== (authed ? "dashboard" : "landing")) ||
    isSubScreen

  const go = (next: Screen) => {
    if (next === screen) return
    setHistory((prev) => [...prev, screen])
    try {
      window.history.pushState({ screen: next }, "", `#${next}`)
    } catch {}
    setScreen(next)
  }

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1]
      setHistory((h) => h.slice(0, -1))
      try {
        window.history.replaceState({ screen: prev }, "", `#${prev}`)
      } catch {}
      setScreen(prev)
    } else {
      let fallback: Screen = authed ? "dashboard" : "landing"
      if (
        screen === "camera" ||
        screen === "identified" ||
        screen === "result"
      ) {
        fallback = "analyze"
      } else if (screen === "meal") {
        fallback = "plan"
      } else if (screen === "today" || screen === "streaks") {
        fallback = "dashboard"
      } else if (screen === "onboard") {
        fallback = "auth"
      }
      if (screen !== fallback) {
        go(fallback)
      }
    }
  }
  useEffect(() => {
    if (authed) {
      localStorage.setItem("nutrisense-profile", JSON.stringify(profile))
    } else {
      localStorage.removeItem("nutrisense-profile")
    }
  }, [profile, authed])

  // Session restoration: verify token with GET /users/me on startup
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setAuthed(false)
      setCurrentUser(null)
      setScreen((s) =>
        [
          "dashboard",
          "plan",
          "meal",
          "today",
          "progress",
          "profile",
          "streaks",
        ].includes(s)
          ? "landing"
          : s,
      )
      return
    }
    apiGetMe()
      .then((user) => {
        setCurrentUser(user)
        setAuthed(true)
        if (user.profile) {
          setProfile(backendProfileToFrontend(user))
        } else {
          setProfile((prev) => ({
            ...prev,
            name: user.name,
            email: user.email,
          }))
        }
        setScreen((s) => (s === "landing" ? "dashboard" : s))
        setStreak(emptyStreak())
        apiGetToday()
          .then((today) => {
            setLogged({
              kcal: today.totals.kcal,
              protein: today.totals.protein,
              carbs: today.totals.carbs,
              fat: today.totals.fat,
            })
          })
          .catch(() => {})
        apiGetProgress("30d")
          .then((prog) => {
            setStreak(backendProgressToStreak(prog))
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (
          err?.status === 401 ||
          err?.message?.includes("401") ||
          err?.message?.includes("Invalid or expired") ||
          err?.message?.includes("Unauthorized")
        ) {
          clearToken()
        }
        setCurrentUser(null)
        setAuthed(false)
        localStorage.removeItem("nutrisense-profile")
        clearDayState()
        clearConsumedKeys()
        setProfile(DEFAULT_PROFILE)
        setPlan(emptyPlan())
        setFuture({})
        setLogged(ZERO)
        setStreak(seedStreak())
        setSelectedMeal(null)
        setFood(FOODS[0])
      })
  }, [])

  useEffect(() => {
    if (!authed) return
    const onTrackingUpdate = () => {
      apiGetToday()
        .then((today) => {
          setLogged({
            kcal: today.totals.kcal,
            protein: today.totals.protein,
            carbs: today.totals.carbs,
            fat: today.totals.fat,
          })
        })
        .catch(() => {})
      apiGetProgress("30d")
        .then((prog) => {
          setStreak((prev) => backendProgressToStreak(prog, prev))
        })
        .catch(() => {})
    }
    window.addEventListener("nutrisense-tracking-updated", onTrackingUpdate)
    return () => {
      window.removeEventListener(
        "nutrisense-tracking-updated",
        onTrackingUpdate,
      )
    }
  }, [authed])

  const [toastMsg, setToastMsg] = useState("")
  const [fab, setFab] = useState(false)

  const footRef = useRef<HTMLElement>(null)
  const [footH, setFootH] = useState(0)
  const [reveal, setReveal] = useState(0)
  useEffect(() => {
    const el = footRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFootH(el.offsetHeight))
    ro.observe(el)
    const onScroll = () => {
      const left =
        document.documentElement.scrollHeight -
        window.innerHeight -
        window.scrollY
      setReveal(
        Math.max(0, Math.min(1, 1 - left / Math.max(el.offsetHeight, 1))),
      )
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      ro.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [screen])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setFab(false)
  }, [screen])
  // Persist the day only for guest sessions with active custom data, eliminating local day cache for authenticated users and blank sessions
  useEffect(() => {
    if (!authed) {
      const hasGuestData =
        plan.some((m) => m.name) ||
        logged.kcal > 0 ||
        Object.values(future).some((arr) => arr.some((m) => m.name))
      if (hasGuestData) {
        saveDay({ date, plan, future, logged, streak })
      } else {
        clearDayState()
      }
    }
  }, [date, plan, future, logged, streak, authed])
  useEffect(() => {
    const check = () => {
      const now = todayKey()
      if (now === date) return
      const n = syncTo({ date, plan, future, logged, streak }, now)
      setPlan(n.plan)
      setFuture(n.future)
      setLogged(n.logged)
      setStreak(n.streak)
      setDate(n.date)
      setToastMsg("Good morning — today's plan is ready")
    }
    const t = setInterval(check, 30_000)
    document.addEventListener("visibilitychange", check)
    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", check)
    }
  }, [date, plan, future, logged, streak])
  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(""), 2400)
    return () => clearTimeout(t)
  }, [toastMsg])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("nutrisense-theme", theme)
  }, [theme])

  useEffect(() => {
    try {
      window.history.replaceState({ screen }, "", `#${screen}`)
    } catch {}

    const onPopState = (e: PopStateEvent) => {
      const target =
        e.state?.screen as Screen ||
        window.location.hash.replace(/^#/, "") as Screen
      if (target && VALID_SCREENS.includes(target)) {
        setScreen(target)
        setHistory((prev) => {
          if (prev.length > 0 && prev[prev.length - 1] === target) {
            return prev.slice(0, -1)
          }
          const idx = prev.lastIndexOf(target)
          if (idx !== -1) {
            return prev.slice(0, idx)
          }
          return prev
        })
      }
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const c: Ctx = {
    go,
    back: goBack,
    canBack,
    authed,
    currentUser,
    food,
    setFood,
    plan,
    setPlan,
    mealIdx,
    setMealIdx,
    selectedMeal,
    setSelectedMeal,
    logged,
    analyzeTab,
    setAnalyzeTab,
    logFood: (k, p, cb, f, slot, name, _img = "") => {
      const r = (n: number) => Math.max(0, Math.round(n * 10) / 10)
      setLogged((l) => ({
        kcal: Math.max(0, Math.round(l.kcal + k)),
        protein: r(l.protein + p),
        carbs: r(l.carbs + cb),
        fat: r(l.fat + f),
      }))
      // Mark or unmark the slot as eaten
      setPlan((pl) =>
        pl.map((m) => {
          if (m.slot !== slot) return m
          if (k < 0) return { ...m, done: false }
          if (!name) return { ...m, done: true }
          const combinedName = m.done ? `${m.name} + ${name}` : name
          const slug = toSlug(combinedName)
          const icon = getFoodEmoji({ slug, name: combinedName })
          return m.done
            ? {
                ...m,
                name: combinedName,
                slug,
                icon,
                kcal: m.kcal + k,
                protein: r(m.protein + p),
                carbs: r(m.carbs + cb),
                fat: r(m.fat + f),
              }
            : {
                ...m,
                name,
                slug,
                icon,
                kcal: k,
                protein: r(p),
                carbs: r(cb),
                fat: r(f),
                done: true,
              }
        }),
      )
    },
    future,
    setFuture,
    planFor: (d) => (d === 0 ? plan : (future[d] ?? emptyPlan())),
    addToPlan: (d, slot, x) => {
      const base = d === 0 ? plan : (future[d] ?? emptyPlan())
      const slug = x.slug || toSlug(x.name)
      const icon = getFoodEmoji({ slug, name: x.name })
      const next = base.map((m) =>
        m.slot === slot
          ? { ...m, ...x, slug, icon, tags: "Added by you", done: false }
          : m,
      )
      if (d === 0) setPlan(next)
      else setFuture({ ...future, [d]: next })
    },
    login: async (email, password, isRegister, name) => {
      if (!email || !password) {
        setToastMsg("Please enter email and password")
        return false
      }
      try {
        const res = isRegister
          ? await apiRegister({
              email: email.trim(),
              password,
              name: (name || "").trim() || "User",
            })
          : await apiLogin({ email: email.trim(), password })
        setToken(res.access_token)
        const me = await apiGetMe()

        // Clean slate for the new session to prevent any data leak from previous session or guest
        clearDayState()
        clearConsumedKeys()
        setPlan(emptyPlan())
        setFuture({})
        setLogged(ZERO)
        setStreak(emptyStreak())
        setSelectedMeal(null)
        setFood(FOODS[0])
        setMealIdx(1)

        setCurrentUser(me)
        setAuthed(true)
        if (me.profile) {
          setProfile(backendProfileToFrontend(me))
        } else {
          setProfile((prev) => ({
            ...prev,
            name: me.name,
            email: me.email,
          }))
        }
        apiGetToday()
          .then((today) => {
            setLogged({
              kcal: today.totals.kcal,
              protein: today.totals.protein,
              carbs: today.totals.carbs,
              fat: today.totals.fat,
            })
          })
          .catch(() => {})
        apiGetProgress("30d")
          .then((prog) => {
            setStreak(backendProgressToStreak(prog))
          })
          .catch(() => {})
        return true
      } catch (err: any) {
        setToastMsg(err.message || "Authentication failed")
        return false
      }
    },
    logout: () => {
      clearToken()
      setCurrentUser(null)
      setAuthed(false)
      localStorage.removeItem("nutrisense-profile")
      clearDayState()
      clearConsumedKeys()
      setProfile(DEFAULT_PROFILE)
      setPlan(emptyPlan())
      setFuture({})
      setLogged(ZERO)
      setStreak(seedStreak())
      setSelectedMeal(null)
      setFood(FOODS[0])
      setMealIdx(1)
      setAnalyzeTab("search")
      setHistory([])
      setScreen("landing")
      try {
        window.history.replaceState({ screen: "landing" }, "", "#landing")
      } catch {}
    },
    setCurrentUser,
    toast: setToastMsg,
    streak,
    setStreak,
    profile,
    setProfile,
  }

  const views: Record<Screen, React.ReactNode> = {
    landing: <Landing c={c} />,
    analyze: <Analyzer c={c} />,
    camera: <Camera c={c} />,
    identified: <Identified c={c} />,
    result: <Result c={c} />,
    bmi: <BMI c={c} />,
    auth: <Auth c={c} />,
    onboard: <Onboarding c={c} />,
    dashboard: <Dashboard c={c} />,
    plan: <Planner c={c} />,
    meal: <MealDetail c={c} />,
    today: <Today c={c} />,
    progress: <Progress c={c} />,
    profile: <Profile c={c} />,
    streaks: <StreaksHub c={c} />,
  }
  const active = (s: Screen) =>
    screen === s ||
    (s === "analyze" && ["camera", "identified", "result"].includes(screen)) ||
    (s === "plan" && screen === "meal") ||
    (s === "dashboard" && screen === "today")

  return (
    <div className="relative">
      <div
        className="reveal-curtain relative z-10 min-h-screen bg-cream rounded-b-[36px] md:rounded-b-[64px]"
        style={{ marginBottom: footH }}
      >
        <div className="min-h-screen rounded-b-[inherit] bg-[radial-gradient(1200px_600px_at_90%_-10%,var(--color-app-glow-mint),transparent_60%),radial-gradient(800px_500px_at_-10%_10%,var(--color-app-glow-sand),transparent_60%)]">
          <header className="sticky top-0 z-40 backdrop-blur-md bg-cream/75 border-b border-line/70">
            <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {canBack && (
                  <button
                    onClick={goBack}
                    aria-label="Go back"
                    className="size-9 rounded-full bg-sand/80 hover:bg-sand-deep border border-line/60 text-ink flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                    title="Go back"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <Logo onClick={() => go(authed ? "dashboard" : "landing")} />
              </div>
              {authed ? (
                <div className="flex items-center gap-2">
                  <nav className="hidden md:flex items-center gap-1">
                    {NAV.map((n) => (
                      <button
                        key={n.s}
                        onClick={() => go(n.s)}
                        className={`h-9 px-4 rounded-full text-sm font-semibold transition cursor-pointer ${
                          active(n.s)
                            ? n.s === "analyze"
                              ? "bg-leaf text-paper"
                              : "bg-ink text-paper"
                            : n.s === "analyze"
                              ? "text-leaf hover:bg-mint"
                              : "text-ink-soft hover:text-ink"
                        }`}
                      >
                        {n.l}
                      </button>
                    ))}
                  </nav>
                  <ThemeToggle
                    theme={theme}
                    onToggle={() =>
                      setTheme(theme === "light" ? "dark" : "light")
                    }
                  />
                </div>
              ) : (
                <nav className="flex items-center gap-1 text-sm font-semibold">
                  <button
                    onClick={() => go("analyze")}
                    className="hidden sm:block h-9 px-4 rounded-full text-ink-soft hover:text-ink cursor-pointer"
                  >
                    Analyze
                  </button>
                  <button
                    onClick={() => go("bmi")}
                    className="hidden sm:block h-9 px-4 rounded-full text-ink-soft hover:text-ink cursor-pointer"
                  >
                    BMI
                  </button>
                  <button
                    onClick={() => go("auth")}
                    className="h-9 px-4 rounded-full text-ink-soft hover:text-ink cursor-pointer"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => go("auth")}
                    className="h-9 px-4 rounded-full bg-ink text-paper cursor-pointer"
                  >
                    Get started
                  </button>
                  <ThemeToggle
                    theme={theme}
                    onToggle={() =>
                      setTheme(theme === "light" ? "dark" : "light")
                    }
                  />
                </nav>
              )}
            </div>
          </header>

          <main
            key={screen}
            className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14 pb-32"
          >
            {views[screen]}
          </main>
        </div>
      </div>

      {authed && (
        <>
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-line grid grid-cols-5 h-18 pb-2">
            {NAV.map((n) => (
              <button
                key={n.s}
                onClick={() => go(n.s)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
                  active(n.s) ? "text-leaf" : "text-ink-soft"
                }`}
              >
                {n.s === "analyze" ? (
                  <span className="size-11 -mt-6 rounded-full bg-leaf text-paper grid place-items-center text-lg shadow-lg">
                    {n.i}
                  </span>
                ) : (
                  <span className="text-lg">{n.i}</span>
                )}
                {n.s === "plan" ? "Plan" : n.l}
              </button>
            ))}
          </nav>

          <div className="fixed right-5 md:right-8 bottom-24 md:bottom-8 z-40 flex flex-col items-end gap-3">
            {fab && (
              <div className="rise bg-paper border border-line rounded-3xl p-2 w-56 shadow-[0_30px_60px_-20px_rgba(35,36,31,.35)]">
                <div className="px-3 pt-2 pb-1">
                  <span className="font-mono text-[11px] uppercase tracking-[.18em] text-ink-soft">
                    Add Food
                  </span>
                </div>
                {([
                  [
                    "🔍",
                    "Search Food",
                    () => {
                      setAnalyzeTab("search")
                      go("analyze")
                    },
                  ],
                  ["📸", "Identify Food", () => go("camera")],
                  [
                    "✍️",
                    "Log Manually",
                    () => {
                      setAnalyzeTab("search")
                      go("analyze")
                    },
                  ],
                ] as const).map(([i, l, f]) => (
                  <button
                    key={l}
                    onClick={f}
                    className="w-full flex gap-3 items-center px-3 h-11 rounded-2xl hover:bg-cream text-sm font-semibold cursor-pointer"
                  >
                    <span>{i}</span>
                    {l}
                  </button>
                ))}
              </div>
            )}
            <button
              aria-label="Add food"
              onClick={() => setFab(!fab)}
              className={`size-14 rounded-full bg-ink text-paper text-2xl shadow-xl transition-transform cursor-pointer ${
                fab ? "rotate-45" : ""
              }`}
            >
              +
            </button>
          </div>

          {screen !== "camera" && screen !== "onboard" && screen !== "auth" && (
            <AIAssistant
              currentDate={date}
              onToast={(msg) => setToastMsg(msg)}
            />
          )}
        </>
      )}

      {toastMsg && (
        <div className="rise fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper rounded-full px-5 py-2.5 text-sm font-semibold">
          ✓ {toastMsg}
        </div>
      )}

      <footer
        ref={footRef}
        className="fixed bottom-0 inset-x-0 z-0 bg-ink text-paper overflow-hidden"
        style={{ ["--r" as string]: reveal }}
      >
        <div
          className="foot-glow absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full bg-leaf/45 blur-[110px]"
          aria-hidden
        />
        <div className="foot-inner relative max-w-6xl mx-auto px-5 md:px-8 pt-12 md:pt-16 pb-24 md:pb-8">
          <div className="grid md:grid-cols-[1.3fr_1fr_1fr] gap-8 md:gap-12">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[.22em] text-paper/50">
                Start where you are
              </p>
              <p className="font-display text-3xl md:text-4xl leading-[1.02] tracking-[-.03em] mt-3 max-w-md">
                Nutrition that <em className="text-saffron">makes sense.</em>
              </p>
              <button
                onClick={() => go(authed ? "plan" : "auth")}
                className="mt-6 h-11 px-5 text-sm rounded-full bg-paper text-ink font-semibold hover:bg-cream transition cursor-pointer"
              >
                {authed ? "Open my meal plan →" : "Build my daily plan →"}
              </button>
            </div>
            {([
              [
                "Explore",
                [
                  ["Search food", "analyze"],
                  ["Identify food", "camera"],
                  ["BMI calculator", "bmi"],
                ],
              ],
              [
                "Your day",
                authed
                  ? [
                      ["Dashboard", "dashboard"],
                      ["Meal plan", "plan"],
                      ["Progress", "progress"],
                    ]
                  : [
                      ["Sign in", "auth"],
                      ["Create a plan", "auth"],
                      ["How it works", "landing"],
                    ],
              ],
            ] as [string, [string, Screen][]][]).map(([h, links]) => (
              <div key={h}>
                <p className="font-mono text-[11px] uppercase tracking-[.22em] text-paper/50">
                  {h}
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {links.map(([l, s]) => (
                    <li key={l}>
                      <button
                        onClick={() => go(s)}
                        className="text-paper/80 hover:text-paper transition cursor-pointer"
                      >
                        {l}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 md:mt-12 rounded-3xl border border-paper/10 bg-paper/[.04] p-5 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <span
                className="size-12 shrink-0 rounded-2xl bg-gradient-to-br from-saffron to-clay grid place-items-center font-brand font-bold text-xl text-ink"
                aria-hidden
              >
                {DEVELOPER.initials}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[.22em] text-paper/50">
                  Designed & built by
                </p>
                <p className="font-display text-xl md:text-2xl mt-0.5 truncate">
                  {DEVELOPER.name}
                </p>
                <p className="text-sm text-paper/60">{DEVELOPER.role}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={DEVELOPER.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${DEVELOPER.name} on GitHub`}
                className="group inline-flex items-center gap-2.5 h-10 px-4 rounded-full border border-paper/15 hover:bg-paper hover:text-ink transition"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
                </svg>
                <span className="font-semibold text-sm">GitHub</span>
                <span
                  className="transition group-hover:translate-x-0.5"
                  aria-hidden
                >
                  ↗
                </span>
              </a>
              <a
                href={DEVELOPER.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${DEVELOPER.name} on LinkedIn`}
                className="group inline-flex items-center gap-2.5 h-10 px-4 rounded-full border border-paper/15 hover:bg-[#0A66C2] hover:border-[#0A66C2] hover:text-white transition"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
                </svg>
                <span className="font-semibold text-sm">LinkedIn</span>
                <span
                  className="transition group-hover:translate-x-0.5"
                  aria-hidden
                >
                  ↗
                </span>
              </a>
            </div>
          </div>
          <p
            aria-hidden
            className="foot-word font-brand font-bold leading-[.8] tracking-[-.06em] text-[clamp(52px,12vw,150px)] mt-8 md:mt-10 select-none"
          >
            <span className="text-paper/90">Nutri</span>
            <span className="brand-sense">Sense</span>
          </p>
          <div className="flex flex-wrap justify-between gap-3 mt-6 pt-5 border-t border-paper/10 text-xs text-paper/50">
            <span>
              © {new Date().getFullYear()} NutriSense · Nutrition estimates are
              approximate and not medical advice.
            </span>
            <span className="font-mono">v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
