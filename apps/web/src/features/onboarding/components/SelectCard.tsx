import { cn } from "@/lib/format"

export default function SelectCard({
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
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "text-left p-5 rounded-3xl border transition-all cursor-pointer flex gap-4 items-start",
        selected
          ? "border-primary bg-mint/70 ring-1 ring-primary"
          : "border-line bg-paper hover:border-ink/25",
      )}
    >
      <span aria-hidden className="text-3xl leading-none">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        {desc && (
          <span className="block text-sm text-ink-soft mt-0.5">{desc}</span>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "size-5 rounded-full border-2 grid place-items-center shrink-0",
          selected ? "border-primary bg-primary" : "border-line",
        )}
      >
        {selected && <span className="size-1.5 rounded-full bg-paper" />}
      </span>
    </button>
  )
}
