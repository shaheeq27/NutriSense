import type { ReactNode } from "react"
import { pct } from "@/lib/format"

interface RingProps {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  label: string
  children?: ReactNode
}

export default function Ring({
  value,
  max,
  size = 200,
  stroke = 14,
  color = "var(--color-primary)",
  label,
  children,
}: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = pct(value, max) / 100
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
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
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-[stroke-dashoffset] duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
