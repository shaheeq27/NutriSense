import logoMark from "../assets/nutrisense-mark.png"
import { useState } from "react"
import { emojiFor } from "./foods"
import { getFoodEmoji } from "./foodImages"
import type { ReactNode, ButtonHTMLAttributes } from "react"

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "md" | "lg"
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...p
}: BtnProps) {
  const v = {
    primary:
      "bg-leaf text-paper hover:bg-leaf-deep shadow-[0_6px_20px_-8px_rgba(47,93,58,.6)]",
    secondary: "bg-paper text-ink border border-line hover:border-ink/30",
    ghost: "text-ink-soft hover:text-ink hover:bg-sand/60",
    danger: "bg-clay/10 text-clay hover:bg-clay/15",
  }[variant]
  const s = size === "lg" ? "h-14 px-7 text-[15px]" : "h-11 px-5 text-sm"
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-40 cursor-pointer ${v} ${s} ${className}`}
    />
  )
}

export function Card({
  children,
  className = "",
  style,
  ...props
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
} & React.HTMLAttributes<HTMLDivElement>) {
  const hasBg =
    /\bbg-/.test(className) ||
    Boolean(style?.backgroundColor || style?.background)
  const hasBorder =
    /\bborder-/.test(className) || Boolean(style?.borderColor || style?.border)
  return (
    <div
      style={style}
      className={`${hasBg ? "" : "bg-paper"} ${
        hasBorder ? "" : "border border-line"
      } rounded-[28px] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  const hasText = /\btext-/.test(className)
  return (
    <div
      className={`font-mono text-[11px] uppercase tracking-[.18em] ${
        hasText ? "" : "text-ink-soft"
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function Title({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h1
      className={`font-display text-4xl md:text-5xl leading-[1.02] tracking-[-.02em] font-[420] ${className}`}
      style={{ fontVariationSettings: '"SOFT" 100' }}
    >
      {children}
    </h1>
  )
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h2
      className={`font-display text-4xl md:text-5xl leading-[1.02] tracking-[-.02em] font-[380] ${className}`}
      style={{ fontVariationSettings: '"SOFT" 100' }}
    >
      {children}
    </h2>
  )
}

export function Bar({
  value,
  max,
  tone = "leaf",
  h = "h-2",
}: {
  value: number
  max: number
  tone?: "leaf" | "saffron" | "clay" | "ink"
  h?: string
}) {
  const c = {
    leaf: "bg-leaf",
    saffron: "bg-saffron",
    clay: "bg-clay",
    ink: "bg-ink",
  }[tone]
  return (
    <div className={`${h} w-full rounded-full bg-sand overflow-hidden`}>
      <div
        className={`${c} h-full rounded-full transition-all duration-700`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  )
}

export function Ring({
  value,
  max,
  size = 220,
  stroke = 16,
  children,
}: {
  value: number
  max: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(1, value / max)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-sand)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-leaf)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

export function SelectCard({
  selected,
  onClick,
  icon,
  title,
  desc,
}: {
  selected: boolean
  onClick: () => void
  icon: string
  title: string
  desc?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`text-left p-5 rounded-3xl border transition-all cursor-pointer flex gap-4 items-start ${
        selected
          ? "border-leaf bg-mint/60 ring-1 ring-leaf"
          : "border-line bg-paper hover:border-ink/25"
      }`}
    >
      <span className="text-3xl leading-none">{icon}</span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        {desc && (
          <span className="block text-sm text-ink-soft mt-0.5">{desc}</span>
        )}
      </span>
      <span
        className={`size-5 rounded-full border-2 grid place-items-center shrink-0 ${
          selected ? "border-leaf bg-leaf" : "border-line"
        }`}
      >
        {selected && <span className="size-1.5 rounded-full bg-paper" />}
      </span>
    </button>
  )
}

export function Chip({
  on,
  onClick,
  children,
}: {
  on?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`h-9 px-4 rounded-full text-sm border transition cursor-pointer ${
        on
          ? "bg-ink text-paper border-ink"
          : "bg-paper border-line hover:border-ink/30"
      }`}
    >
      {children}
    </button>
  )
}

export function Empty({
  icon,
  title,
  action,
  onAction,
}: {
  icon: string
  title: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-sand-deep">
      <div className="text-4xl">{icon}</div>
      <p className="font-display text-2xl mt-3">{title}</p>
      <Button variant="secondary" className="mt-5" onClick={onAction}>
        {action}
      </Button>
    </div>
  )
}

export function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-ink-soft py-8 justify-center">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-leaf animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      <span className="font-display italic text-lg">{text}</span>
    </div>
  )
}

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 cursor-pointer"
    >
      <span className="logo-tile grid place-items-center size-10 rounded-xl">
        <img src={logoMark} alt="" className="size-9 object-contain" />
      </span>
      <span className="font-brand font-bold text-[22px] tracking-[-.02em] leading-none">
        <span className="text-ink">Nutri</span>
        <span className="brand-sense">Sense</span>
      </span>
    </button>
  )
}

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark"
  onToggle: () => void
}) {
  const nextTheme = theme === "light" ? "dark" : "light"
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      className="size-9 shrink-0 rounded-full border border-line bg-paper text-ink-soft hover:text-ink hover:border-ink/30 grid place-items-center transition cursor-pointer"
    >
      {theme === "light" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20.3 15.3A8.5 8.5 0 0 1 8.7 3.7 8.5 8.5 0 1 0 20.3 15.3Z" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </svg>
      )}
    </button>
  )
}

/** Food photo with a designed fallback: missing or broken images become a warm emoji tile. */
export function FoodImage({
  src,
  name,
  emoji,
  className = "",
  dim = false,
}: {
  src?: string
  name: string
  emoji?: string
  className?: string
  dim?: boolean
}) {
  const [broken, setBroken] = useState(false)
  if (src && !broken)
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`size-full object-cover ${
          dim ? "opacity-70 saturate-50" : ""
        } ${className}`}
      />
    )
  return (
    <div
      role="img"
      aria-label={name}
      className={`food-fallback size-full grid place-items-center ${
        dim ? "opacity-75" : ""
      } ${className}`}
    >
      <span className="text-[clamp(32px,40cqmin,96px)] leading-none drop-shadow-sm">
        {emoji ?? getFoodEmoji({ name }) ?? emojiFor(name)}
      </span>
    </div>
  )
}
