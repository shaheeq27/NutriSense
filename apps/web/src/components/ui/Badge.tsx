import type { HTMLAttributes } from "react"
import { cn } from "@/lib/format"

const tones = {
  neutral: "bg-sand text-ink-soft",
  green: "bg-mint text-primary",
  orange: "bg-peach text-accent",
  red: "bg-tomato/10 text-tomato",
  golden: "bg-golden/20 text-ink",
}

export default function Badge({
  tone = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...rest}
    />
  )
}
