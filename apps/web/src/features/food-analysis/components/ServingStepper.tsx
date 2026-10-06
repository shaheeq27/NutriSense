"use client"

const STEP = 0.5

export default function ServingStepper({
  value,
  onChange,
  unit,
}: {
  value: number
  onChange: (n: number) => void
  unit: string
}) {
  const set = (n: number) =>
    onChange(Math.min(20, Math.max(STEP, Math.round(n * 2) / 2)))
  return (
    <div className="flex items-center gap-3" role="group" aria-label="Servings">
      <button
        type="button"
        aria-label="Fewer servings"
        onClick={() => set(value - STEP)}
        className="size-11 rounded-full border border-line bg-paper text-xl cursor-pointer hover:border-ink/30"
      >
        −
      </button>
      <output aria-live="polite" className="min-w-24 text-center">
        <span className="font-display text-3xl">{value}</span>
        <span className="block text-xs text-ink-soft">{unit}</span>
      </output>
      <button
        type="button"
        aria-label="More servings"
        onClick={() => set(value + STEP)}
        className="size-11 rounded-full border border-line bg-paper text-xl cursor-pointer hover:border-ink/30"
      >
        +
      </button>
    </div>
  )
}
