import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { estimateFood, searchFoods, type AnyFood } from "./foods"
import {
  FOODS,
  HERO_IMG,
  TARGET,
  backendProfileToFrontend,
  type Ctx,
  type Meal,
} from "./data"
import { todayKey } from "./day"
import {
  apiLogFood,
  apiAddToMealPlan,
  apiSearchFoods,
  apiSearchPackagedFoods,
  apiGetBarcode,
  apiScanImage,
  apiPutProfile,
  apiGetMe,
  type ScanCandidate,
} from "./api"
import { resolveFoodImage, getFoodEmoji } from "./foodImages"
import {
  Bar,
  Button,
  Card,
  Chip,
  Eyebrow,
  Loading,
  SectionTitle,
  SelectCard,
  Title,
} from "./ui"

/* ---------- 3D helpers ---------- */
function Tilt({
  children,
  className = "",
  max = 10,
}: {
  children: ReactNode
  className?: string
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== "mouse") return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty("--ry", `${x * max}deg`)
    el.style.setProperty("--rx", `${-y * max}deg`)
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`)
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`)
  }
  const leave = () => {
    ref.current?.style.setProperty("--rx", "0deg")
    ref.current?.style.setProperty("--ry", "0deg")
  }
  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`tilt ${className}`}
    >
      {children}
    </div>
  )
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setOn(true), io.disconnect()),
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`reveal ${on ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ---------- Landing ---------- */
export function Landing({ c }: { c: Ctx }) {
  return (
    <div className="rise">
      <section className="grid lg:grid-cols-[1.02fr_.98fr] gap-12 lg:gap-20 items-center pt-6 lg:pt-12">
        <div className="max-w-xl">
          <Eyebrow>Personal nutrition, thoughtfully planned</Eyebrow>
          <Title className="display-strong !text-[clamp(52px,7.6vw,104px)] !leading-[.92] !tracking-[-.045em] mt-5">
            Eat with clarity.
            <br />
            <em className="text-leaf">Live with balance.</em>
          </Title>
          <p className="text-lg text-ink-soft max-w-lg mt-7 leading-relaxed">
            A nutrition companion that turns your goals, preferences and
            everyday meals into a plan you can actually follow.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-9">
            <Button size="lg" onClick={() => c.go(c.authed ? "plan" : "auth")}>
              Build my daily plan →
            </Button>
            <Button size="lg" variant="ghost" onClick={() => c.go("bmi")}>
              Find my starting point
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm text-ink-soft">
            <span>✓ Personalized to your goals</span>
            <span>✓ Flexible, never restrictive</span>
          </div>
        </div>

        <div className="stage relative">
          <div className="orbit" aria-hidden>
            {["Protein 38g", "Fiber 12g", "Carbs 64g", "Fats 18g"].map(
              (m, i) => (
                <span
                  key={m}
                  className="orbit-chip"
                  style={{ ["--i" as string]: i }}
                >
                  {m}
                </span>
              ),
            )}
          </div>
          <Tilt max={12} className="relative">
            <div className="tilt-inner relative">
              <div className="aspect-[4/5] rounded-[36px] md:rounded-[44px] overflow-hidden bg-sand shadow-[0_60px_120px_-50px_rgba(35,36,31,.55)]">
                <img
                  src={HERO_IMG}
                  alt="A colorful bowl of greens, grains and vegetables"
                  className="size-full object-cover scale-110 depth-img"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
                <div className="sheen absolute inset-0" />
              </div>
              <Card className="depth-80 absolute left-4 md:-left-10 bottom-5 md:bottom-12 p-5 md:p-6 w-[calc(100%-2rem)] md:w-72 shadow-[0_30px_60px_-30px_rgba(35,36,31,.4)]">
                <div className="flex items-center justify-between">
                  <Eyebrow>Today at a glance</Eyebrow>
                  <span className="size-8 rounded-full bg-mint text-leaf grid place-items-center text-sm">
                    ✓
                  </span>
                </div>
                <div className="font-display text-3xl mt-3">
                  1,420{" "}
                  <span className="text-sm text-ink-soft">of 2,100 kcal</span>
                </div>
                <div className="mt-3">
                  <Bar value={1420} max={2100} />
                </div>
                <p className="text-xs text-ink-soft mt-3">
                  Right on track, with 680 kcal left for your day.
                </p>
              </Card>
              <div className="depth-120 absolute right-4 md:-right-3 top-7 md:top-10 bg-saffron-soft text-ink rounded-full px-4 py-2 text-sm font-semibold shadow-lg">
                Balanced lunch · 38g protein
              </div>
            </div>
          </Tilt>
        </div>
      </section>

      <section className="mt-28 md:mt-36">
        <div className="grid md:grid-cols-[.8fr_1.2fr] gap-6 md:gap-16 items-end pb-8 border-b border-line">
          <div>
            <Eyebrow>A calmer way to eat well</Eyebrow>
            <SectionTitle className="display-strong !text-[clamp(40px,5.4vw,72px)] !leading-[.98] mt-4">
              Built around your day, not a perfect diet.
            </SectionTitle>
          </div>
          <p className="text-lg text-ink-soft leading-relaxed max-w-xl md:justify-self-end">
            NutriSense keeps your goals at the center, then connects the plan to
            the food you really eat—so nutrition data becomes useful, not
            overwhelming.
          </p>
        </div>
        <div className="grid md:grid-cols-3">
          {[
            [
              "01",
              "Start with you",
              "Set goals, food preferences and the rhythm of your day.",
            ],
            [
              "02",
              "Follow your plan",
              "Get balanced meals with flexible swaps when life changes.",
            ],
            [
              "03",
              "Learn as you go",
              "Log what you eat and see progress without chasing perfection.",
            ],
          ].map(([n, t, d], k) => (
            <Reveal
              key={n}
              delay={k * 120}
              className={`py-9 md:py-11 md:px-8 ${
                k ? "md:border-l border-t md:border-t-0 border-line" : "md:pl-0"
              }`}
            >
              <span className="font-mono text-xs text-leaf">{n}</span>
              <p className="font-display text-3xl mt-6">{t}</p>
              <p className="text-ink-soft mt-3 max-w-xs leading-relaxed">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="mt-16 md:mt-24 rounded-[36px] md:rounded-[44px] bg-ink text-paper p-7 md:p-12 lg:p-16 overflow-hidden relative">
          <div className="drift absolute -right-20 -top-28 size-96 rounded-full bg-leaf/40 blur-3xl" />
          <div className="drift absolute -left-24 -bottom-32 size-80 rounded-full bg-saffron/20 blur-3xl [animation-delay:-6s]" />
          <div className="relative grid lg:grid-cols-[.85fr_1.15fr] gap-10 lg:gap-16 items-center">
            <div>
              <Eyebrow className="text-paper/60">
                Your plan, in one place
              </Eyebrow>
              <SectionTitle className="display-strong !text-[clamp(40px,5.4vw,72px)] !leading-[.98] mt-4 text-paper">
                Know what’s next.
                <br />
                <em className="text-saffron">And why it works.</em>
              </SectionTitle>
              <p className="text-paper/70 mt-5 leading-relaxed max-w-md">
                See today’s meals, make simple swaps and understand how each
                choice supports your goals.
              </p>
              <Button
                size="lg"
                className="mt-8 bg-paper !text-ink hover:bg-cream"
                onClick={() => c.go(c.authed ? "plan" : "auth")}
              >
                Explore personalized planning →
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["Breakfast", "Oats, banana & eggs", "420 kcal", "Complete"],
                ["Lunch", "Chicken rice bowl", "620 kcal", "Complete"],
                ["Snack", "Yogurt & berries", "220 kcal", "Up next"],
                ["Dinner", "Palak paneer & roti", "540 kcal", "Planned"],
              ].map(([slot, meal, kcal, state]) => (
                <Tilt key={slot} max={14}>
                  <div className="tilt-inner rounded-3xl bg-paper/8 border border-paper/10 p-5 backdrop-blur-sm hover:border-paper/25 transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono uppercase tracking-wider text-paper/55">
                        {slot}
                      </span>
                      <span
                        className={
                          state === "Complete" ? "text-mint" : "text-saffron"
                        }
                      >
                        {state}
                      </span>
                    </div>
                    <p className="font-display text-xl mt-5">{meal}</p>
                    <p className="text-sm text-paper/55 mt-1">{kcal}</p>
                  </div>
                </Tilt>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <section className="py-24 md:py-32 text-center max-w-3xl mx-auto">
        <Eyebrow>Start where you are</Eyebrow>
        <SectionTitle className="display-strong !text-[clamp(40px,5.4vw,72px)] !leading-[.98] mt-4">
          A better day starts with a plan that feels like yours.
        </SectionTitle>
        <p className="text-lg text-ink-soft mt-5">
          Tell us what matters to you. NutriSense will shape the meals, guidance
          and progress around it.
        </p>
        <Button
          size="lg"
          className="mt-8"
          onClick={() => c.go(c.authed ? "dashboard" : "auth")}
        >
          Create my NutriSense plan →
        </Button>
      </section>
    </div>
  )
}

/* ---------- Analyzer / Search ---------- */
export function Analyzer({ c }: { c: Ctx }) {
  const [q, setQ] = useState(() => sessionStorage.getItem("nlq") ?? "")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AnyFood[]>([])

  const isPackaged = c.analyzeTab === "packaged"

  useEffect(() => {
    sessionStorage.removeItem("nlq")
  }, [])

  useEffect(() => {
    const s = q.trim()
    setLoading(true)
    if (s) {
      setResults([])
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      if (!s) {
        setResults([])
        setLoading(false)
        return
      }

      const mapFood = (b: any): AnyFood => ({
        id: b.id ? String(b.id) : b.slug,
        food_id: b.id ?? undefined,
        slug: b.slug,
        name: b.name,
        tag: b.tag,
        unit: b.unit,
        kcal: b.kcal,
        protein: b.protein,
        carbs: b.carbs,
        fat: b.fat,
        fiber: b.fiber,
        sugar: b.sugar,
        sodium: b.sodium,
        img:
          resolveFoodImage({ slug: b.slug, name: b.name, food_id: b.id }) || "",
        emoji: b.emoji || getFoodEmoji({ slug: b.slug, name: b.name }),
        source: b.source,
        estimated: b.estimated,
      })

      if (isPackaged) {
        if (/^\d{8,14}$/.test(s)) {
          apiGetBarcode(s, ctrl.signal)
            .then((item) => {
              setResults([mapFood(item)])
              setLoading(false)
            })
            .catch(() => {
              setResults([])
              setLoading(false)
            })
        } else {
          apiSearchPackagedFoods(s, ctrl.signal)
            .then((items) => {
              setResults(items.map(mapFood))
              setLoading(false)
            })
            .catch(() => {
              setResults([])
              setLoading(false)
            })
        }
      } else {
        apiSearchFoods(s, ctrl.signal)
          .then((res) => {
            const mapped = res.items.map(mapFood)
            if (res.estimate) mapped.push(mapFood(res.estimate))
            setResults(mapped)
            setLoading(false)
          })
          .catch((e) => {
            if (e.name !== "AbortError") {
              setResults([])
              setLoading(false)
            }
          })
      }
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q, isPackaged])

  return (
    <div className="rise max-w-3xl mx-auto">
      <Eyebrow>Food Analyzer</Eyebrow>
      <Title className="mt-3">Tell us what you're eating.</Title>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10">
        {([
          ["search", "🔍", "Search Food", "Raw, fresh & whole foods"],
          ["packaged", "📦", "Packaged Food", "Branded items & barcode"],
          ["identify", "📸", "Identify Food", "Scan with camera"],
        ] as const).map(([k, i, t, d]) => (
          <button
            key={k}
            onClick={() =>
              k === "identify" ? c.go("camera") : c.setAnalyzeTab(k)
            }
            className={`p-5 rounded-3xl text-left border transition cursor-pointer ${
              c.analyzeTab === k
                ? "bg-paper border-leaf ring-1 ring-leaf"
                : "bg-sand/50 border-transparent hover:bg-sand"
            }`}
          >
            <span className="text-2xl">{i}</span>
            <div className="font-display text-xl mt-3">{t}</div>
            <div className="text-xs text-ink-soft mt-0.5">{d}</div>
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3 h-16 px-6 rounded-full bg-paper border border-line focus-within:border-leaf focus-within:ring-4 focus-within:ring-mint transition">
        <span>{isPackaged ? "📦" : "🔍"}</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            isPackaged
              ? "Search packaged food or enter barcode (e.g. 3017620422003)…"
              : 'Search for a food, meal or ingredient… try "banana", "chicken", "eggs"'
          }
          className="flex-1 bg-transparent outline-none"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="text-ink-soft text-sm cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {(isPackaged
          ? [
              "Protein Bar",
              "Oat Milk",
              "Greek Yogurt",
              "Dark Chocolate",
              "Granola",
              "Peanut Butter",
            ]
          : ["Banana", "Chicken breast", "Eggs", "Rice", "Avocado", "Cucumber"]
        ).map((e) => (
          <Chip key={e} onClick={() => setQ(e)}>
            {e}
          </Chip>
        ))}
      </div>

      <div className="mt-8">
        {loading ? (
          <Loading text="Finding your food…" />
        ) : results.length > 0 ? (
          <ul className="divide-y divide-line border-y border-line">
            {results.map((f: AnyFood) => (
              <li key={f.id}>
                <button
                  onClick={() => {
                    c.setFood(f)
                    c.go("result")
                  }}
                  className="w-full flex items-center gap-4 py-4 text-left group cursor-pointer"
                >
                  {f.img ? (
                    <img
                      src={f.img.replace("w=800&h=600", "w=120&h=120")}
                      alt={f.name}
                      referrerPolicy="no-referrer"
                      className="size-14 rounded-2xl object-cover bg-sand"
                    />
                  ) : (
                    <span
                      className={`size-14 rounded-2xl grid place-items-center text-2xl ${
                        f.estimated
                          ? "bg-saffron-soft border border-dashed border-saffron/60"
                          : "bg-sand"
                      }`}
                      aria-hidden
                    >
                      {f.emoji}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      <span className="truncate">
                        {f.estimated ? <>Estimate “{f.name}”</> : f.name}
                      </span>
                      {f.source === "usda" && (
                        <span className="shrink-0 rounded-full bg-mint text-leaf-deep px-2 py-0.5 font-mono text-[10px] tracking-wider">
                          USDA
                        </span>
                      )}
                      {f.source === "openfoodfacts" && (
                        <span className="shrink-0 rounded-full bg-saffron-soft text-ink px-2 py-0.5 font-mono text-[10px] tracking-wider">
                          Open Food Facts
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-ink-soft">
                      {f.estimated
                        ? "Smart estimate based on similar foods"
                        : `${f.tag} · per ${f.unit}`}
                    </div>
                  </div>
                  <span className="font-mono text-sm text-ink-soft">
                    {f.kcal} kcal
                  </span>
                  <span className="text-ink-soft group-hover:translate-x-1 transition">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : q.trim().length >= 2 ? (
          <div className="text-center py-12 text-ink-soft">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-semibold text-ink text-base">
              Nothing found on the menu
            </p>
            <p className="text-sm mt-1 text-ink-soft">
              {isPackaged
                ? "We couldn't find a matching product in Open Food Facts. Try another brand name or barcode."
                : "We couldn't find a match in the local catalog or USDA FoodData Central. Try searching for whole foods or switch to Packaged Food."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ---------- Camera ---------- */
/** Last captured or uploaded photo, handed from Camera to Identified. */
let shot = ""

export function Camera({ c }: { c: Ctx }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const [state, setState] =
    useState<"starting" | "live" | "denied" | "unsupported" | "captured">(
      "starting",
    )
  const [facing, setFacing] = useState<"environment" | "user">("environment")
  const [photo, setPhoto] = useState("")
  const [flash, setFlash] = useState(false)
  const [retry, setRetry] = useState(0)

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => {
    if (photo) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported")
      return
    }
    let cancelled = false
    setState("starting")
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 1600 },
        },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => {})
        }
        setState("live")
      })
      .catch((e: DOMException) => {
        if (!cancelled)
          setState(
            e.name === "NotAllowedError" || e.name === "SecurityError"
              ? "denied"
              : "unsupported",
          )
      })
    return () => {
      cancelled = true
      stop()
    }
  }, [facing, photo, retry])

  const snap = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement("canvas")
    // Crop to the 4:5 frame the user sees.
    const ratio = 4 / 5
    let w = v.videoWidth,
      h = v.videoHeight
    if (w / h > ratio) w = h * ratio
    else h = w / ratio
    canvas.width = Math.min(1080, w)
    canvas.height = canvas.width / ratio
    const ctx = canvas.getContext("2d")!
    if (facing === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(
      v,
      (v.videoWidth - w) / 2,
      (v.videoHeight - h) / 2,
      w,
      h,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    setFlash(true)
    setTimeout(() => setFlash(false), 180)
    setPhoto(canvas.toDataURL("image/jpeg", 0.85))
    setState("captured")
    stop()
  }
  const upload = (f?: File) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      setPhoto(String(r.result))
      setState("captured")
      stop()
    }
    r.readAsDataURL(f)
  }
  const use = () => {
    shot = photo
    c.go("identified")
  }

  return (
    <div className="rise max-w-xl mx-auto text-center">
      <div className="text-left mb-4">
        <button
          onClick={() => (c.back ? c.back() : c.go("analyze"))}
          className="text-sm text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5 transition"
        >
          ← Back
        </button>
      </div>
      <Eyebrow>Photo scan</Eyebrow>
      <Title className="mt-3">Snap your food</Title>
      <div className="relative mt-8 aspect-[4/5] rounded-[36px] overflow-hidden bg-[#1c1d19]">
        {photo ? (
          <img
            src={photo}
            alt="Your captured food"
            className="size-full object-cover"
          />
        ) : (
          <video
            ref={video}
            playsInline
            muted
            autoPlay
            className={`size-full object-cover transition-opacity duration-500 ${
              state === "live" ? "opacity-100" : "opacity-0"
            } ${facing === "user" ? "-scale-x-100" : ""}`}
          />
        )}
        {!photo && state === "live" && (
          <div
            className="pointer-events-none absolute inset-[12%] rounded-[28px]"
            style={{ boxShadow: "0 0 0 999px rgba(20,22,18,.35)" }}
          >
            {[
              "top-0 left-0 border-t-4 border-l-4 rounded-tl-[28px]",
              "top-0 right-0 border-t-4 border-r-4 rounded-tr-[28px]",
              "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[28px]",
              "bottom-0 right-0 border-b-4 border-r-4 rounded-br-[28px]",
            ].map((k) => (
              <span
                key={k}
                className={`absolute size-10 border-[#FFF8EC] ${k}`}
              />
            ))}
          </div>
        )}
        {state === "starting" && !photo && (
          <div className="absolute inset-0 grid place-items-center text-[#FFF8EC]/80 text-sm">
            <span className="flex items-center gap-3">
              <span className="size-4 rounded-full border-2 border-[#FFF8EC] border-t-transparent animate-spin" />
              Starting camera…
            </span>
          </div>
        )}
        {(state === "denied" || state === "unsupported") && !photo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-[#FFF8EC]">
            <span className="text-4xl" aria-hidden>
              📷
            </span>
            <p className="font-display text-2xl">
              {state === "denied"
                ? "Camera access is blocked"
                : "Camera isn’t available here"}
            </p>
            <p className="text-sm text-[#FFF8EC]/70 max-w-xs">
              {state === "denied"
                ? "Allow camera access in your browser settings, or upload a photo instead."
                : "This browser or preview can’t open the camera. Upload a photo instead."}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => file.current?.click()}>
                Upload photo
              </Button>
              {state === "denied" && (
                <Button
                  variant="secondary"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Try again
                </Button>
              )}
            </div>
          </div>
        )}
        <button
          aria-label="Back"
          onClick={() => (c.back ? c.back() : c.go("analyze"))}
          className="absolute top-4 left-4 size-11 rounded-full bg-black/35 backdrop-blur text-[#FFF8EC] grid place-items-center cursor-pointer hover:bg-black/50 z-10"
          title="Back"
        >
          ←
        </button>
        {state === "live" && !photo && (
          <button
            aria-label="Switch camera"
            onClick={() =>
              setFacing((f) => (f === "environment" ? "user" : "environment"))
            }
            className="absolute top-4 right-4 size-11 rounded-full bg-black/35 backdrop-blur text-[#FFF8EC] grid place-items-center cursor-pointer hover:bg-black/50 z-10"
          >
            ⟲
          </button>
        )}
      </div>
      <input
        ref={file}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          upload(e.target.files?.[0])
          e.target.value = ""
        }}
      />

      {photo ? (
        <>
          <p className="text-sm text-ink-soft mt-5">
            Is the food clear and well lit?
          </p>
          <div className="flex gap-3 mt-5">
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setPhoto("")
              }}
            >
              ↺ Retake
            </Button>
            <Button size="lg" className="flex-1" onClick={use}>
              Use photo →
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft mt-5">
            Place the food clearly inside the frame.
          </p>
          <div className="flex justify-center items-center gap-8 mt-5">
            <button
              onClick={() => file.current?.click()}
              aria-label="Upload from gallery"
              className="size-12 rounded-2xl bg-sand hover:bg-sand-deep/60 grid place-items-center text-xl cursor-pointer"
            >
              🖼️
            </button>
            <button
              aria-label="Take photo"
              onClick={snap}
              disabled={state !== "live"}
              className="size-20 rounded-full border-4 border-leaf grid place-items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="size-14 rounded-full bg-leaf active:scale-90 transition" />
            </button>
            <button
              onClick={() => c.go("analyze")}
              aria-label="Search instead"
              className="size-12 rounded-2xl bg-sand hover:bg-sand-deep/60 grid place-items-center text-xl cursor-pointer"
            >
              🔍
            </button>
          </div>
          <div className="mt-2 font-semibold">Take photo</div>
        </>
      )}
    </div>
  )
}

export function Identified({ c }: { c: Ctx }) {
  const photo = shot
  const [scanning, setScanning] = useState(true)
  const [candidates, setCandidates] = useState<ScanCandidate[]>([])
  const [error, setError] = useState("")

  const choose = (f: AnyFood) => {
    c.setFood({ ...f, img: photo || f.img })
    c.go("result")
  }

  const goRef = useRef(c.go)
  goRef.current = c.go

  useEffect(() => {
    if (!photo) {
      goRef.current("camera")
      return
    }
    let cancelled = false
    const ctrl = new AbortController()
    let timerId: ReturnType<typeof setTimeout> | null = null

    const runScan = async () => {
      try {
        setScanning(true)
        setError("")

        timerId = setTimeout(() => {
          if (!cancelled) {
            ctrl.abort("timeout")
          }
        }, 20000)

        const blob = await (await fetch(photo)).blob()
        const res = await apiScanImage(blob, "scan.jpg", ctrl.signal)
        if (cancelled) return
        setCandidates(res.candidates || [])
      } catch (e: any) {
        if (!cancelled) {
          setError(
            ctrl.signal.aborted || e?.name === "AbortError"
              ? "Request timed out"
              : e.message || "Scan failed.",
          )
        }
      } finally {
        if (timerId) clearTimeout(timerId)
        if (!cancelled) setScanning(false)
      }
    }
    runScan()
    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
      ctrl.abort()
    }
  }, [photo])

  if (!photo) return null
  return (
    <div className="rise max-w-xl mx-auto">
      <div className="mb-4">
        <button
          onClick={() => (c.back ? c.back() : c.go("camera"))}
          className="text-sm text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5 transition"
        >
          ← Back
        </button>
      </div>
      <div className="aspect-[4/3] rounded-[36px] overflow-hidden bg-sand relative">
        <img
          src={photo}
          alt="Your food photo"
          className="size-full object-cover"
        />
        {scanning && (
          <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm flex flex-col items-center justify-center text-paper">
            <span className="size-8 rounded-full border-4 border-paper border-t-transparent animate-spin mb-3" />
            <p className="font-semibold text-sm">Identifying food...</p>
          </div>
        )}
      </div>
      <Eyebrow className="mt-8">Photo saved</Eyebrow>
      <Title className="mt-2">What’s on your plate?</Title>

      {error && (
        <div className="mt-6 text-center bg-sand p-6 rounded-3xl border border-line">
          <span className="text-4xl mb-3 block" aria-hidden>
            ⚠️
          </span>
          <h3 className="font-semibold text-lg text-ink">
            We couldn't fetch the results
          </h3>
          <p className="text-ink-soft text-sm mt-1 mb-4">
            Something went wrong while identifying your food. Please try again
            later or search for your food manually.
          </p>
          <div className="flex gap-3 max-w-sm mx-auto">
            <Button className="flex-1" onClick={() => c.go("analyze")}>
              Search manually
            </Button>
            <Button
              variant="secondary"
              className="flex-1 bg-paper hover:bg-paper"
              onClick={() => c.go("camera")}
            >
              Retake photo
            </Button>
          </div>
        </div>
      )}

      {!scanning &&
        !error &&
        candidates.length > 0 &&
        (() => {
          const primary = candidates[0]
          const alternatives = candidates.slice(1)

          const mapCand = (cand: ScanCandidate): AnyFood => ({
            id: cand.food.id ? String(cand.food.id) : cand.food.slug,
            food_id: cand.food.id ?? undefined,
            slug: cand.food.slug,
            name: cand.food.name,
            tag: cand.food.tag,
            unit: cand.food.unit,
            kcal: cand.food.kcal,
            protein: cand.food.protein,
            carbs: cand.food.carbs,
            fat: cand.food.fat,
            fiber: cand.food.fiber,
            sugar: cand.food.sugar,
            emoji: cand.food.emoji,
            img: cand.food.image_url || undefined,
            source: cand.food.source,
            estimated: cand.food.estimated,
          })

          const getConfidenceText = (c: number) => {
            if (c >= 0.85) return "Best match"
            if (c >= 0.5) return "Looks like"
            return "Possible match"
          }

          return (
            <div className="mt-6 flex flex-col gap-6 text-left">
              <div>
                <Eyebrow className="mb-3 block text-center">
                  We think this is...
                </Eyebrow>
                <button
                  onClick={() => choose(mapCand(primary))}
                  className="w-full bg-mint/20 border-2 border-leaf/30 rounded-[32px] p-5 flex items-center gap-4 cursor-pointer hover:bg-mint/40 hover:border-leaf/50 transition-all group"
                >
                  <div className="size-16 rounded-full bg-leaf text-paper flex items-center justify-center text-4xl shrink-0 shadow-sm">
                    {primary.food.emoji ?? "🍽️"}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-display text-2xl leading-none text-ink group-hover:text-leaf transition-colors">
                      {primary.food.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-ink-soft text-sm">
                      <span className="font-medium text-leaf">
                        {getConfidenceText(primary.confidence)}
                      </span>
                      <span className="size-1 rounded-full bg-line" />
                      <span>{primary.food.kcal} kcal</span>
                    </div>
                  </div>
                  <span className="text-leaf text-2xl opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    →
                  </span>
                </button>
              </div>

              {alternatives.length > 0 && (
                <div>
                  <p className="text-ink-soft text-sm mb-3">
                    Other possibilities:
                  </p>
                  <ul className="divide-y divide-line border-y border-line">
                    {alternatives.map((cand, i) => (
                      <li key={i}>
                        <button
                          onClick={() => choose(mapCand(cand))}
                          className="w-full flex items-center gap-3 py-3 text-left cursor-pointer group"
                        >
                          <span
                            className="text-xl grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                            aria-hidden
                          >
                            {cand.food.emoji ?? "🍽️"}
                          </span>
                          <span className="flex-1 font-semibold truncate group-hover:text-leaf transition-colors">
                            {cand.food.name}
                          </span>
                          <span className="font-mono text-sm text-ink-soft">
                            {cand.food.kcal} kcal
                          </span>
                          <span className="text-ink-soft group-hover:translate-x-1 transition">
                            →
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })()}

      {!scanning && !error && candidates.length === 0 && (
        <div className="mt-6 text-center bg-sand p-6 rounded-3xl border border-line">
          <span className="text-4xl mb-3 block" aria-hidden>
            🤔
          </span>
          <h3 className="font-semibold text-lg text-ink">
            We couldn't recognize this food
          </h3>
          <p className="text-ink-soft text-sm mt-1 mb-4">
            Try retaking the photo with better lighting, or search for the food
            manually.
          </p>
          <div className="flex gap-3 max-w-sm mx-auto">
            <Button className="flex-1" onClick={() => c.go("analyze")}>
              Search manually
            </Button>
            <Button
              variant="secondary"
              className="flex-1 bg-paper hover:bg-paper"
              onClick={() => c.go("camera")}
            >
              Retake photo
            </Button>
          </div>
        </div>
      )}

      {!scanning && !error && candidates.length > 0 && (
        <div className="mt-8 text-center border-t border-line pt-8">
          <p className="text-sm text-ink-soft mb-4">Not seeing your food?</p>
          <div className="flex gap-3 max-w-sm mx-auto">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => c.go("camera")}
            >
              Retake photo
            </Button>
            <Button
              className="flex-1 bg-sand text-ink border border-line hover:bg-sand-deep"
              onClick={() => c.go("analyze")}
            >
              Search manually
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Nutrition result ---------- */
export function Result({ c }: { c: Ctx }) {
  const f = c.food as AnyFood
  const isGrams = f.unit.includes("100 g") || f.unit === "g"
  const [mode, setMode] = useState<"servings" | "grams">(
    isGrams ? "grams" : "servings",
  )
  const [n, setN] = useState(1)
  const [grams, setGrams] = useState(100)

  const [pick, setPick] = useState<Meal["slot"] | null>(null)
  const [when, setWhen] = useState(0)

  const [facts, setFacts] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const val = mode === "grams" ? grams : n
    if (val <= 0 || isNaN(val)) return

    setLoading(true)
    setError(null)
    const ctrl = new AbortController()

    const t = setTimeout(() => {
      const numericFoodId =
        f.food_id ??
        (typeof f.id === "number"
          ? f.id
          : !isNaN(Number(f.id))
            ? Number(f.id)
            : undefined)

      import("./api").then(({ apiCalculateNutrition }) => {
        apiCalculateNutrition(
          {
            food_id: numericFoodId,
            slug: f.slug,
            servings: mode === "servings" ? val : undefined,
            portion_grams: mode === "grams" ? val : undefined,
          },
          ctrl.signal,
        )
          .then((res) => {
            setFacts(res)
            setLoading(false)
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              setError("Failed to calculate nutrition. Please try again.")
              setLoading(false)
            }
          })
      })
    }, 400)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [f.food_id, f.slug, f.id, mode, n, grams])

  const k = (v: number) => Math.round(v * 10) / 10
  const kcal = facts ? Math.round(facts.kcal) : 0
  const userTargets = c.currentUser?.targets ?? {
    kcal: c.profile?.kcal || TARGET.kcal,
    protein: TARGET.protein,
    carbs: TARGET.carbs,
    fat: TARGET.fat,
  }
  const targetKcal = userTargets.kcal || 2100
  const consumedKcal = c.logged?.kcal || 0
  const remaining = targetKcal - consumedKcal

  const rows = facts
    ? [
        ["Calories", kcal, targetKcal, "kcal", "leaf"],
        ["Protein", k(facts.protein), userTargets.protein || 110, "g", "leaf"],
        [
          "Carbohydrates",
          k(facts.carbs),
          userTargets.carbs || 250,
          "g",
          "saffron",
        ],
        ["Fat", k(facts.fat), userTargets.fat || 70, "g", "saffron"],
        [
          "Fiber",
          k(facts.fiber),
          (userTargets as any).fiber || 30,
          "g",
          "leaf",
        ],
        ["Sugar", k(facts.sugar), 50, "g", "clay"],
        ["Sodium", Math.round(facts.sodium), 2300, "mg", "clay"],
      ] as const
    : []

  return (
    <div className="rise grid lg:grid-cols-[1fr_380px] gap-10">
      <div
        className={
          loading
            ? "opacity-50 transition-opacity pointer-events-none"
            : "transition-opacity"
        }
      >
        <button
          onClick={() => (c.back ? c.back() : c.go("analyze"))}
          className="text-sm text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5 transition mb-6"
        >
          ← Back
        </button>
        {f.img && (
          <div className="w-full aspect-[4/3] sm:aspect-[16/9] bg-sand rounded-[32px] overflow-hidden mb-6 relative shadow-sm">
            <img
              src={f.img}
              alt={f.name}
              referrerPolicy="no-referrer"
              className="size-full object-cover"
              onError={(e) => {
                const parent = e.currentTarget.parentElement
                if (parent) parent.style.display = "none"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/10 to-transparent pointer-events-none" />
          </div>
        )}
        <Eyebrow>{f.tag}</Eyebrow>
        <Title className="mt-3">{f.name}</Title>
        {(f as AnyFood).source === "usda" && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm">
            <span aria-hidden>🏛️</span> Whole food nutrition from USDA FoodData
            Central · per {f.unit}
          </p>
        )}
        {(f as AnyFood).source === "openfoodfacts" && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-saffron-soft px-4 py-2 text-sm">
            <span aria-hidden>📦</span> Packaged food nutrition from Open Food
            Facts · per {f.unit}
          </p>
        )}
        {(f as AnyFood).estimated && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-saffron-soft px-4 py-2 text-sm">
            <span aria-hidden>✨</span> Smart estimate based on similar foods —
            adjust servings to match your portion.
          </p>
        )}

        {error && (
          <p className="mt-4 p-3 bg-clay/10 text-clay rounded-xl text-sm font-semibold">
            {error}
          </p>
        )}

        {!error && (
          <div className="grid sm:grid-cols-[1.1fr_1fr] gap-4 mt-8">
            <Card className="p-8 flex flex-col items-center justify-center text-center bg-[radial-gradient(circle_at_30%_20%,var(--color-mint),transparent_60%)] relative">
              <div className="font-display text-7xl tracking-tight">
                {loading && !facts ? (
                  <span className="opacity-30">--</span>
                ) : (
                  `~${kcal}`
                )}
              </div>
              <div className="font-mono text-sm text-ink-soft">kcal</div>
              <div className="text-sm mt-2">
                {loading && !facts ? (
                  <span className="opacity-50">Calculating...</span>
                ) : facts?.portion_grams ? (
                  `${facts.portion_grams} g`
                ) : (
                  `${facts?.servings ?? 1} ${facts?.unit ?? f.unit}${
                    (facts?.servings ?? 1) !== 1 && !f.unit.endsWith("s")
                      ? "s"
                      : ""
                  }`
                )}
              </div>
            </Card>
            <div className="grid grid-cols-3 sm:grid-cols-1 gap-3">
              {[
                ["Protein", facts?.protein || 0, "bg-mint"],
                ["Carbs", facts?.carbs || 0, "bg-saffron-soft"],
                ["Fat", facts?.fat || 0, "bg-sand"],
              ].map(([l, v, bg]) => (
                <div
                  key={l as string}
                  className={`${bg} rounded-3xl px-5 py-4 flex sm:items-center justify-between flex-col sm:flex-row`}
                >
                  <span className="text-sm text-ink-soft">{l}</span>
                  <span className="font-display text-2xl">
                    {loading && !facts ? (
                      <span className="opacity-30">-</span>
                    ) : (
                      `${k(v as number)}g`
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Card className="p-5 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-sand rounded-full p-1 self-start sm:self-auto">
            <button
              onClick={() => setMode("servings")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                mode === "servings"
                  ? "bg-paper shadow"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Servings
            </button>
            <button
              onClick={() => setMode("grams")}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                mode === "grams"
                  ? "bg-paper shadow"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Grams
            </button>
          </div>
          <div className="flex items-center gap-4">
            {mode === "servings" ? (
              <>
                <button
                  aria-label="Decrease"
                  onClick={() => setN(Math.max(0.5, n - 0.5))}
                  className="size-10 rounded-full border border-line hover:bg-sand cursor-pointer"
                >
                  −
                </button>
                <span className="font-mono w-20 text-center">
                  {n} {f.unit}
                </span>
                <button
                  aria-label="Increase"
                  onClick={() => setN(n + 0.5)}
                  className="size-10 rounded-full border border-line hover:bg-sand cursor-pointer"
                >
                  +
                </button>
              </>
            ) : (
              <>
                <input
                  type="number"
                  min="1"
                  value={grams || ""}
                  onChange={(e) => setGrams(e.target.valueAsNumber)}
                  className="w-24 text-center font-mono bg-sand border border-line rounded-lg h-10 outline-none focus:border-leaf"
                />
                <span className="font-mono text-ink-soft">g</span>
              </>
            )}
          </div>
        </Card>

        {!error && rows.length > 0 && (
          <>
            <h2 className="font-display text-2xl mt-12 mb-4">
              Nutrition breakdown
            </h2>
            <div className="space-y-5">
              {rows.map(([l, v, max, u, tone]) => (
                <div key={l}>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{l}</span>
                    <span className="font-mono">
                      {v}
                      {u}{" "}
                      <span className="text-ink-soft">
                        · {Math.round((v as number / max) as number * 100)}% DV
                      </span>
                    </span>
                  </div>
                  <Bar
                    value={v as number}
                    max={max as number}
                    tone={tone as any}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 self-start space-y-4">
        {c.authed ? (
          <Card className="p-6">
            <Eyebrow>Fit into my day</Eyebrow>
            <div className="font-display text-3xl mt-3 text-ink">
              {consumedKcal.toLocaleString()}{" "}
              <span className="text-base font-sans text-ink-soft">
                / {targetKcal.toLocaleString()} kcal
              </span>
            </div>
            <div className="h-2 rounded-full bg-sand mt-4 overflow-hidden relative border border-line/40">
              <div
                className="h-full bg-leaf absolute left-0"
                style={{
                  width: `${Math.min(100, (consumedKcal / targetKcal) * 100)}%`,
                }}
              />
              <div
                className="h-full bg-saffron absolute"
                style={{
                  left: `${Math.min(100, (consumedKcal / targetKcal) * 100)}%`,
                  width: `${Math.min(
                    Math.max(0, 100 - (consumedKcal / targetKcal) * 100),
                    (kcal / targetKcal) * 100,
                  )}%`,
                }}
              />
            </div>
            <p className="text-sm text-ink-soft mt-4 leading-relaxed">
              {kcal <= remaining
                ? `This meal fits within your remaining daily target (${Math.max(0, remaining).toLocaleString()} kcal left).`
                : remaining <= 0
                  ? `You have reached your daily target of ${targetKcal.toLocaleString()} kcal for today.`
                  : `This meal exceeds your remaining target (${Math.max(0, remaining).toLocaleString()} kcal left) by ${(kcal - remaining).toLocaleString()} kcal, but can still fit into your day.`}
            </p>
          </Card>
        ) : (
          <Card className="p-6 bg-saffron-soft border-transparent">
            <p className="font-display text-xl">See how this fits your day</p>
            <p className="text-sm text-ink-soft mt-1">
              Sign in to compare against your personal targets.
            </p>
          </Card>
        )}
        <Card className="p-6">
          <div className="font-semibold text-lg">Use this food</div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {(["Breakfast", "Lunch", "Snack", "Dinner"] as const).map((s) => (
              <Chip key={s} on={pick === s} onClick={() => setPick(s)}>
                {s}
              </Chip>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-line space-y-4">
            {/* Primary Action: Log Food (Today's consumption) */}
            <div>
              <Button
                size="lg"
                className="w-full"
                disabled={!pick || !facts || submitting}
                onClick={async () => {
                  if (!pick || !facts || submitting) return
                  setSubmitting(true)
                  try {
                    const val = mode === "grams" ? grams : n
                    const numericFoodId =
                      f.food_id ??
                      (typeof f.id === "number"
                        ? f.id
                        : !isNaN(Number(f.id))
                          ? Number(f.id)
                          : undefined)

                    if (!c.authed) {
                      c.logFood(
                        facts.kcal,
                        facts.protein,
                        facts.carbs,
                        facts.fat,
                        pick.toLowerCase() as any,
                      )
                      c.toast(
                        `${f.name} logged to today's ${pick.toLowerCase()}`,
                      )
                      c.go("dashboard")
                      return
                    }

                    await apiLogFood({
                      slot: pick.toLowerCase(),
                      food_id: numericFoodId,
                      slug: f.slug,
                      servings: mode === "servings" ? val : undefined,
                      portion_grams: mode === "grams" ? val : undefined,
                      date: todayKey(),
                    })
                    window.dispatchEvent(
                      new Event("nutrisense-tracking-updated"),
                    )
                    c.toast(`${f.name} logged to today's ${pick.toLowerCase()}`)
                    c.go("dashboard")
                  } catch (err: any) {
                    c.toast(err.message || "Failed to log food")
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                {submitting ? "Working..." : "✓ Add to today's meals"}
              </Button>
              <p className="text-[11px] text-ink-soft mt-1.5 text-center">
                Logs directly into today's consumed nutrition & streak
              </p>
            </div>

            {/* Secondary Action: Add to Plan (Schedule without logging) */}
            <div className="pt-2 border-t border-line/60">
              <div className="text-xs font-semibold text-ink-soft mb-2">
                Or add to upcoming plan:
              </div>
              <div
                className="flex gap-1 p-1 rounded-full bg-sand/60 mb-3"
                role="tablist"
                aria-label="Which day"
              >
                {[
                  "Today",
                  "Tomorrow",
                  new Date(Date.now() + 2 * 864e5).toLocaleDateString("en-GB", {
                    weekday: "short",
                  }),
                ].map((d, i) => (
                  <button
                    key={d}
                    role="tab"
                    aria-selected={when === i}
                    onClick={() => setWhen(i)}
                    className={`flex-1 h-8 rounded-full text-xs font-semibold cursor-pointer transition ${
                      when === i
                        ? "bg-paper shadow-sm text-ink"
                        : "text-ink-soft"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <Button
                size="md"
                variant="secondary"
                className="w-full bg-sand hover:bg-sand-deep/70"
                disabled={!pick || !facts || submitting}
                onClick={async () => {
                  if (!pick || !facts || submitting) return
                  const val = mode === "grams" ? grams : n
                  const numericFoodId =
                    f.food_id ??
                    (typeof f.id === "number"
                      ? f.id
                      : !isNaN(Number(f.id))
                        ? Number(f.id)
                        : undefined)

                  if (!c.authed) {
                    c.addToPlan(when, pick!, {
                      name: f.name,
                      slug: f.slug,
                      kcal: facts.kcal,
                      protein: facts.protein,
                      carbs: facts.carbs,
                      fat: facts.fat,
                    })
                    c.toast(
                      `${f.name} added to ${
                        when === 0
                          ? "today's"
                          : when === 1
                            ? "tomorrow's"
                            : "the day after's"
                      } ${pick!.toLowerCase()} plan`,
                    )
                    c.go("plan")
                    return
                  }
                  setSubmitting(true)
                  try {
                    const d = new Date()
                    d.setDate(d.getDate() + when)
                    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

                    await apiAddToMealPlan(localDate, pick!, {
                      food_id: numericFoodId,
                      slug: f.slug,
                      servings: mode === "servings" ? val : undefined,
                      portion_grams: mode === "grams" ? val : undefined,
                    })
                    window.dispatchEvent(new Event("nutrisense-plan-updated"))
                    c.toast(
                      `${f.name} added to ${
                        when === 0
                          ? "today's"
                          : when === 1
                            ? "tomorrow's"
                            : "the day after's"
                      } ${pick!.toLowerCase()} plan`,
                    )
                    c.go("plan")
                  } catch (err: any) {
                    c.toast(err.message || "Failed to add to plan")
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                + Add to plan
              </Button>
              <p className="text-[11px] text-ink-soft mt-1.5 text-center">
                Schedules for that day without logging it yet
              </p>
            </div>
          </div>
        </Card>
      </aside>
    </div>
  )
}
/* ---------- BMI ---------- */
export function BMI({ c }: { c: Ctx }) {
  const [h, setH] = useState(170)
  const [w, setW] = useState(68)
  const [age, setAge] = useState(20)
  const [done, setDone] = useState(false)
  const bmi = Math.round((w / (h / 100) ** 2) * 10) / 10
  const pos = Math.min(100, Math.max(0, ((bmi - 14) / (34 - 14)) * 100))
  const band = bmi < 18.5 ? 0 : bmi < 25 ? 1 : 2
  const msg = [
    "Your BMI sits below the selected reference range. A personal plan can help you build steadily.",
    "Your BMI falls within the selected reference range.",
    "Your BMI sits above the selected reference range. Small, steady changes add up.",
  ][band]

  const Field = ({
    l,
    v,
    set,
    u,
  }: {
    l: string
    v: number
    set: (n: number) => void
    u: string
  }) => (
    <label className="block border-b border-line py-5">
      <span className="text-sm text-ink-soft">{l}</span>
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          value={v}
          onChange={(e) => {
            set(+e.target.value)
            setDone(false)
          }}
          className="font-display text-5xl bg-transparent outline-none w-40"
        />
        <span className="font-mono text-ink-soft">{u}</span>
      </div>
    </label>
  )

  return (
    <div className="rise grid lg:grid-cols-2 gap-10 lg:gap-16">
      <div>
        <button
          onClick={() =>
            c.back ? c.back() : c.go(c.authed ? "dashboard" : "landing")
          }
          className="text-sm text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5 transition mb-6"
        >
          ← Back
        </button>
        <Eyebrow>BMI</Eyebrow>
        <Title className="mt-3">Know your starting point.</Title>
        <p className="text-ink-soft mt-4 max-w-md">
          Calculate your BMI and understand where you currently stand.
        </p>
        <Card className="p-8 mt-8">
          {Field({ l: "Height", v: h, set: setH, u: "cm" })}
          {Field({ l: "Weight", v: w, set: setW, u: "kg" })}
          {Field({ l: "Age", v: age, set: setAge, u: "yrs" })}
          <Button
            size="lg"
            className="w-full mt-6"
            onClick={() => setDone(true)}
          >
            Calculate BMI
          </Button>
        </Card>
      </div>

      <div
        className={`transition-opacity ${
          done ? "opacity-100" : "opacity-30 pointer-events-none"
        }`}
      >
        <Card className="p-8 md:p-10 text-center">
          <Eyebrow>Your current profile</Eyebrow>
          <div className="font-display text-[120px] leading-none tracking-tight mt-4">
            {done ? bmi : "—"}
          </div>
          <div className="mt-10 relative">
            <div className="flex h-2.5 rounded-full overflow-hidden">
              <div className="bg-saffron-soft" style={{ width: "22.5%" }} />
              <div className="bg-mint" style={{ width: "32.5%" }} />
              <div className="bg-sand" style={{ width: "45%" }} />
            </div>
            {done && (
              <div
                className="absolute -top-1.5 size-5 rounded-full bg-ink border-4 border-paper -translate-x-1/2 transition-all duration-700"
                style={{ left: `${pos}%` }}
              />
            )}
            <div className="flex text-xs text-ink-soft mt-3">
              <span style={{ width: "22.5%" }} className="text-left">
                Under
              </span>
              <span style={{ width: "32.5%" }}>Healthy</span>
              <span style={{ width: "45%" }} className="text-right">
                Above
              </span>
            </div>
          </div>
          <p className="mt-8 text-ink-soft">{msg}</p>
        </Card>
        <div className="mt-4 rounded-[28px] bg-leaf text-paper p-8">
          <p className="font-display text-3xl">Want NutriSense to do more?</p>
          <p className="text-paper/80 mt-2">
            Create your personal nutrition profile and get a meal plan built
            around your goals.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button
              size="lg"
              className="bg-paper !text-leaf-deep hover:bg-cream"
              onClick={() => c.go(c.authed ? "plan" : "auth")}
            >
              Build My Nutrition Plan →
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="!text-paper/80 hover:!bg-paper/10"
              onClick={() =>
                c.back ? c.back() : c.go(c.authed ? "dashboard" : "landing")
              }
            >
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Auth ---------- */
export function Auth({ c }: { c: Ctx }) {
  const [mode, setMode] = useState<"register" | "login">("register")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !email.includes("@") ||
      password.length < 8 ||
      (mode === "register" && !name.trim())
    ) {
      c.toast("Please check your inputs. Password must be 8+ chars.")
      return
    }
    setLoading(true)
    const success = await c.login(email, password, mode === "register", name)
    setLoading(false)
    if (success) {
      c.go(mode === "register" ? "onboard" : "dashboard")
    }
  }

  return (
    <div className="rise grid lg:grid-cols-2 gap-0 rounded-[40px] overflow-hidden border border-line bg-paper min-h-[600px]">
      <div className="relative hidden lg:block bg-sand">
        <img
          src={FOODS[3].img!.replace("w=800&h=600", "w=900&h=1100")}
          alt="A bowl of paneer curry"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-x-8 bottom-8 bg-paper/90 backdrop-blur rounded-3xl p-6">
          <p className="font-display text-xl italic">
            "I finally understand what's on my plate."
          </p>
          <p className="text-sm text-ink-soft mt-2">
            — Ananya, 3 months with NutriSense
          </p>
        </div>
      </div>
      <div className="p-10 md:p-16 flex flex-col justify-center">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => (c.back ? c.back() : c.go("landing"))}
            className="text-sm text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5 transition"
          >
            ← Back
          </button>
        </div>
        <Title>
          {mode === "register" ? "Make NutriSense yours." : "Welcome back."}
        </Title>
        <p className="text-ink-soft mt-4 max-w-sm">
          {mode === "register"
            ? "Save your goals, build your daily plan, and track your nutrition over time."
            : "Sign in to continue tracking your meals and goals."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 mt-10 max-w-sm">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => c.toast("Google sign-in is not implemented yet.")}
          >
            <span className="font-bold text-[#4285F4]">G</span> Continue with
            Google
          </Button>

          <div className="flex items-center gap-4 py-2">
            <hr className="flex-1 border-line" />
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Or
            </span>
            <hr className="flex-1 border-line" />
          </div>

          {mode === "register" && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full h-12 bg-sand rounded-xl px-4 outline-none focus:ring-2 ring-leaf transition"
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full h-12 bg-sand rounded-xl px-4 outline-none focus:ring-2 ring-leaf transition"
          />
          <input
            type="password"
            placeholder="Password (8+ chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            className="w-full h-12 bg-sand rounded-xl px-4 outline-none focus:ring-2 ring-leaf transition"
          />
          <Button
            type="submit"
            size="lg"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading
              ? "Working..."
              : mode === "register"
                ? "Create Account"
                : "Log In"}
          </Button>
        </form>

        <p className="text-sm text-ink-soft mt-6">
          {mode === "register"
            ? "Already have an account? "
            : "Need an account? "}
          <button
            type="button"
            className="text-leaf font-semibold underline cursor-pointer"
            onClick={() => {
              setMode(mode === "register" ? "login" : "register")
              setEmail("")
              setPassword("")
            }}
          >
            {mode === "register" ? "Log in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  )
}

/* ---------- Onboarding ---------- */
const GOALS = [
  ["🥗", "Eat More Balanced", "A steady mix across every meal"],
  ["⚡", "Improve Energy", "Fewer crashes, steadier afternoons"],
  ["💪", "Support Fitness", "Protein-forward, training-aware"],
  ["⚖️", "Manage Weight", "Gentle, sustainable targets"],
  ["🎯", "Maintain My Routine", "Keep doing what works"],
]
const ACTIVITY = [
  ["🛋️", "Mostly sedentary", "Desk days, little exercise"],
  ["🚶", "Lightly active", "Walks, 1–2 workouts a week"],
  ["🏃", "Moderately active", "3–5 workouts a week"],
  ["🏋️", "Very active", "Daily training or physical work"],
]
const STYLE = [
  ["🌱", "Vegetarian"],
  ["🥩", "Non-Vegetarian"],
  ["🌿", "Vegan"],
  ["🥚", "Eggetarian"],
]

export function Onboarding({ c }: { c: Ctx }) {
  const [step, setStep] = useState(0)
  const [goals, setGoals] = useState<string[]>(["Eat More Balanced"])
  const [sex, setSex] = useState<"female" | "male" | "other">(
    c.currentUser?.profile?.sex as any || "female",
  )
  const [age, setAge] = useState<number>(
    c.currentUser?.profile?.birth_year
      ? new Date().getFullYear() - c.currentUser.profile.birth_year
      : 25,
  )
  const [height, setHeight] = useState<number>(
    c.currentUser?.profile?.height_cm || 170,
  )
  const [weight, setWeight] = useState<number>(
    c.currentUser?.profile?.weight_kg || 68,
  )
  const [act, setAct] = useState("Lightly active")
  const [style, setStyle] = useState("Non-Vegetarian")
  const [restr, setRestr] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>(["Peanuts"])
  const [avoid, setAvoid] = useState<string[]>([])
  const [building, setBuilding] = useState(false)
  const toggle = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const TagAdder = ({
    label,
    items,
    set,
    ph,
  }: {
    label: string
    items: string[]
    set: (a: string[]) => void
    ph: string
  }) => {
    const [v, setV] = useState("")
    return (
      <div className="border-b border-line pb-6">
        <div className="font-semibold mb-3">{label}</div>
        <div className="flex flex-wrap gap-2 items-center">
          {items.map((i) => (
            <Chip key={i} on onClick={() => set(items.filter((x) => x !== i))}>
              {i} ×
            </Chip>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (v.trim()) {
                set([...items, v.trim()])
                setV("")
              }
            }}
            className="flex items-center h-9 pl-4 pr-1 rounded-full border border-dashed border-sand-deep"
          >
            <input
              value={v}
              onChange={(e) => setV(e.target.value)}
              placeholder={ph}
              className="bg-transparent outline-none text-sm w-32"
            />
            <button className="size-7 rounded-full bg-sand cursor-pointer">
              +
            </button>
          </form>
        </div>
      </div>
    )
  }

  const steps = [
    {
      t: "What are you working toward?",
      s: "Pick as many as feel true.",
      body: (
        <div className="grid sm:grid-cols-2 gap-3">
          {GOALS.map(([i, t, d]) => (
            <SelectCard
              key={t}
              icon={i}
              title={t}
              desc={d}
              selected={goals.includes(t)}
              onClick={() => toggle(goals, setGoals, t)}
            />
          ))}
        </div>
      ),
    },
    {
      t: "A little about you",
      s: "This calculates your baseline energy and targets.",
      body: (
        <div className="space-y-6">
          <div>
            <div className="font-semibold mb-2">Biological sex</div>
            <div className="grid grid-cols-3 gap-3">
              {([
                ["female", "Female"],
                ["male", "Male"],
                ["other", "Other"],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSex(val)}
                  className={`h-12 rounded-2xl border font-semibold text-sm transition cursor-pointer ${
                    sex === val
                      ? "border-leaf bg-mint/40 text-leaf-deep"
                      : "border-line bg-sand/30 hover:bg-sand/60 text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Age</span>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={age || ""}
                  onChange={(e) =>
                    setAge(Math.max(13, Math.min(120, Number(e.target.value))))
                  }
                  className="h-12 w-full rounded-2xl border border-line bg-cream px-4 pr-12 outline-none focus:border-leaf focus:ring-4 focus:ring-mint transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
                  yrs
                </span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">
                Height
              </span>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={height || ""}
                  onChange={(e) =>
                    setHeight(
                      Math.max(50, Math.min(270, Number(e.target.value))),
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-line bg-cream px-4 pr-12 outline-none focus:border-leaf focus:ring-4 focus:ring-mint transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
                  cm
                </span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">
                Weight
              </span>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={weight || ""}
                  onChange={(e) =>
                    setWeight(
                      Math.max(20, Math.min(400, Number(e.target.value))),
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-line bg-cream px-4 pr-12 outline-none focus:border-leaf focus:ring-4 focus:ring-mint transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
                  kg
                </span>
              </div>
            </label>
          </div>
          {height > 0 && weight > 0 && (
            <div className="p-4 rounded-2xl bg-sand/40 border border-line flex items-center justify-between text-sm">
              <span className="text-ink-soft">Estimated BMI</span>
              <span className="font-display text-lg font-bold">
                {Math.round((weight / (height / 100) ** 2) * 10) / 10}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      t: "How active are you?",
      s: "This shapes your daily energy target.",
      body: (
        <div className="grid sm:grid-cols-2 gap-3">
          {ACTIVITY.map(([i, t, d]) => (
            <SelectCard
              key={t}
              icon={i}
              title={t}
              desc={d}
              selected={act === t}
              onClick={() => setAct(t)}
            />
          ))}
        </div>
      ),
    },
    {
      t: "What's your food style?",
      s: "We'll only suggest meals that match.",
      body: (
        <div className="grid sm:grid-cols-2 gap-3">
          {STYLE.map(([i, t]) => (
            <SelectCard
              key={t}
              icon={i}
              title={t}
              selected={style === t}
              onClick={() => setStyle(t)}
            />
          ))}
        </div>
      ),
    },
    {
      t: "Anything we should know?",
      s: "Optional — you can change this later.",
      body: (
        <div className="space-y-6">
          <TagAdder
            label="Allergies"
            items={allergies}
            set={setAllergies}
            ph="Add an allergy"
          />
          <TagAdder
            label="Foods you avoid"
            items={avoid}
            set={setAvoid}
            ph="Add food"
          />
          <div>
            <div className="font-semibold mb-3">Dietary restrictions</div>
            <div className="flex flex-wrap gap-2">
              {[
                "Gluten-free",
                "Lactose-free",
                "Low sodium",
                "Jain",
                "Halal",
                "No onion/garlic",
              ].map((r) => (
                <Chip
                  key={r}
                  on={restr.includes(r)}
                  onClick={() => toggle(restr, setRestr, r)}
                >
                  {r}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ]

  if (step === steps.length) {
    return (
      <div className="rise max-w-xl mx-auto text-center py-16">
        <div className="size-28 mx-auto rounded-full bg-mint grid place-items-center text-5xl">
          🌱
        </div>
        <Title className="mt-8">You're all set.</Title>
        <p className="text-ink-soft mt-4">
          NutriSense has everything it needs to build your first plan.
        </p>
        {building ? (
          <Loading text="Building your day…" />
        ) : (
          <Button
            size="lg"
            className="mt-10"
            onClick={async () => {
              setBuilding(true)
              try {
                const actMap: Record<string, "sedentary" | "light" | "moderate" | "active" | "very_active"> =
                  {
                    "Mostly sedentary": "sedentary",
                    "Lightly active": "light",
                    "Moderately active": "moderate",
                    "Very active": "very_active",
                  }
                const styleMap: Record<string, "any" | "vegetarian" | "vegan" | "eggetarian"> =
                  {
                    "Non-Vegetarian": "any",
                    Vegetarian: "vegetarian",
                    Vegan: "vegan",
                    Eggetarian: "eggetarian",
                  }
                const allAllergies = [
                  ...new Set([...allergies, ...avoid, ...restr]),
                ]
                const goal = goals.includes("Manage Weight")
                  ? "lose"
                  : goals.includes("Support Fitness")
                    ? "gain"
                    : "maintain"

                if (c.authed) {
                  await apiPutProfile({
                    goal,
                    sex,
                    age: Number(age) || 25,
                    height_cm: Number(height) || 170,
                    weight_kg: Number(weight) || 68,
                    activity_level: actMap[act] || "moderate",
                    diet_style: styleMap[style] || "any",
                    allergies: allAllergies,
                  })
                  const updatedMe = await apiGetMe()
                  if (c.setCurrentUser) c.setCurrentUser(updatedMe)
                  const frontProf = backendProfileToFrontend(updatedMe)
                  c.setProfile(frontProf)
                  window.dispatchEvent(new Event("nutrisense-tracking-updated"))
                } else {
                  c.setProfile({
                    ...c.profile,
                    height: Number(height) || 170,
                    weight: Number(weight) || 68,
                    age: Number(age) || 25,
                    goal: goals[0] || "Eat More Balanced",
                    style,
                    allergies: allAllergies.join(", "),
                    sex,
                  })
                }
                c.toast("Profile saved!")
                c.go("plan")
              } catch (err: any) {
                console.error("Failed to save profile:", err)
                c.toast(err?.message || "Failed to save profile")
                setBuilding(false)
              }
            }}
          >
            Create My Meal Plan →
          </Button>
        )}
      </div>
    )
  }
  const cur = steps[step]
  return (
    <div className="rise max-w-2xl mx-auto" key={step}>
      <div className="flex items-center gap-3">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? "bg-leaf" : "bg-sand"
            }`}
          />
        ))}
        <span className="font-mono text-xs text-ink-soft">
          {step + 1}/{steps.length}
        </span>
      </div>
      <Title className="mt-10">{cur.t}</Title>
      <p className="text-ink-soft mt-3 mb-8">{cur.s}</p>
      {cur.body}
      <div className="flex justify-between mt-10">
        <Button
          variant="ghost"
          onClick={() =>
            step ? setStep(step - 1) : c.back ? c.back() : c.go("auth")
          }
        >
          ← Back
        </Button>
        <Button size="lg" onClick={() => setStep(step + 1)}>
          Continue
        </Button>
      </div>
    </div>
  )
}
