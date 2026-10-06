import { cn, pct } from "@/lib/format"

const tones = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  tomato: "bg-tomato",
  golden: "bg-golden",
  ink: "bg-ink",
}

export default function ProgressBar({
  value,
  max,
  tone = "primary",
  label,
  className,
}: {
  value: number
  max: number
  tone?: keyof typeof tones
  label: string
  className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(Math.min(value, max))}
      className={cn(
        "h-2 w-full rounded-full bg-sand overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          tones[tone],
        )}
        style={{ width: `${pct(value, max)}%` }}
      />
    </div>
  )
}
