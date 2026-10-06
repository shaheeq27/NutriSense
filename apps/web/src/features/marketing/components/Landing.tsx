import Image from "next/image"
import Link from "next/link"
import {
  Card,
  Eyebrow,
  ProgressBar,
  Ring,
  buttonClasses,
} from "@/components/ui"

const HERO =
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=1400&fit=crop&auto=format"

const FEATURES = [
  {
    icon: "🧭",
    title: "Goals first",
    body: "Targets shaped around you — your body, your week, the way you like to eat.",
  },
  {
    icon: "🗓️",
    title: "Three days, planned",
    body: "See today and the next two days. Swap any meal in a tap.",
  },
  {
    icon: "🍛",
    title: "Real food, understood",
    body: "Search, describe or snap a meal. Biryani counts as much as broccoli.",
  },
  {
    icon: "🌱",
    title: "Progress that's kind",
    body: "Trends and gentle insights, never guilt.",
  },
]

export default function Landing() {
  return (
    <div className="space-y-24">
      <section className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        <div className="animate-rise">
          <Eyebrow>Personal nutrition, thoughtfully planned</Eyebrow>
          <h1 className="font-display display-soft mt-5 text-5xl md:text-7xl leading-[0.98] tracking-[-.03em] font-[400]">
            Nutrition that <em className="text-primary">makes sense.</em>
          </h1>
          <p className="mt-6 text-lg text-ink-soft max-w-lg">
            Know what to eat next, understand what&apos;s on your plate, and
            live with balance — not a perfect diet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={buttonClasses("primary", "lg")}>
              Build my daily plan →
            </Link>
            <Link href="/analyze" className={buttonClasses("secondary", "lg")}>
              Analyze a food
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            <li>✓ Personalized to your goals</li>
            <li>✓ Flexible, never restrictive</li>
            <li>
              <Link
                href="/bmi"
                className="underline underline-offset-4 hover:text-ink"
              >
                Find my starting point
              </Link>
            </li>
          </ul>
        </div>
        <div className="relative">
          <div className="relative aspect-[5/6] rounded-[36px] overflow-hidden shadow-[var(--shadow-soft)]">
            <Image
              src={HERO}
              alt="A colourful bowl of vegetables, grains and greens"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
          <Card
            className="absolute -left-4 md:-left-10 bottom-8 p-5 w-64 shadow-[var(--shadow-soft)]"
            aria-hidden
          >
            <Eyebrow>Today at a glance</Eyebrow>
            <div className="mt-3 flex items-center gap-4">
              <Ring
                value={1420}
                max={2100}
                size={84}
                stroke={9}
                label="1,420 of 2,100 kcal"
              >
                <span className="font-display text-lg">68%</span>
              </Ring>
              <div className="text-sm">
                <p className="font-semibold">1,420 kcal</p>
                <p className="text-ink-soft">of 2,100 kcal</p>
              </div>
            </div>
            <ProgressBar
              className="mt-4"
              value={72}
              max={110}
              label="Protein"
            />
            <p className="text-xs text-ink-soft mt-2">
              Balanced lunch · 38g protein
            </p>
          </Card>
        </div>
      </section>

      <section aria-labelledby="why">
        <Eyebrow>A calmer way to eat well</Eyebrow>
        <h2
          id="why"
          className="font-display display-soft text-4xl md:text-5xl mt-3 max-w-2xl"
        >
          Built around your day, not a perfect diet.
        </h2>
        <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <Card className="p-6 h-full">
                <span aria-hidden className="text-3xl">
                  {f.icon}
                </span>
                <h3 className="font-semibold text-lg mt-4">{f.title}</h3>
                <p className="text-sm text-ink-soft mt-1">{f.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Card tone="ink" className="p-10 md:p-14 text-center">
          <h2 className="font-display display-soft text-4xl md:text-5xl text-cream">
            A better day starts with a plan that feels like yours.
          </h2>
          <p className="mt-4 text-cream/70 max-w-xl mx-auto">
            Tell us what matters to you. NutriSense will shape the meals,
            guidance and progress around it.
          </p>
          <Link
            href="/register"
            className={buttonClasses("accent", "lg", "mt-8")}
          >
            Create my NutriSense plan →
          </Link>
        </Card>
      </section>
    </div>
  )
}
