import { cn } from "@/lib/format"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-2xl bg-sand/80", className)}
    />
  )
}

export function Loading({
  text = "Warming things up…",
  className,
}: {
  text?: string
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 text-ink-soft py-8 justify-center",
        className,
      )}
    >
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-secondary animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      <span className="font-display italic text-lg">{text}</span>
    </div>
  )
}

export default Skeleton
