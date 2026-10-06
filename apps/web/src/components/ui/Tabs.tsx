"use client"
/** id prefix used to connect tabs to panels (`${idPrefix}-panel-${value}`). */

/** Accessible tablist with roving focus (arrow keys). */
import { useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/format"

export interface TabOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  options: TabOption<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  idPrefix?: string
  className?: string
}
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const dir = e.key === "ArrowRight" ? 1 : -1
    let n = i
    for (let k = 0; k < options.length; k++) {
      n = (n + dir + options.length) % options.length
      if (!options[n].disabled) break
    }
    refs.current[n]?.focus()
    onChange(options[n].value)
  }
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex p-1 rounded-full bg-sand/70 gap-1", className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${o.value}` : undefined}
            aria-controls={
              idPrefix ? `${idPrefix}-panel-${o.value}` : undefined
            }
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={o.disabled}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-4 h-9 rounded-full text-sm font-semibold transition cursor-pointer disabled:opacity-40",
              selected
                ? "bg-paper text-ink shadow-sm"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  idPrefix,
  value,
  active,
  children,
}: {
  idPrefix: string
  value: string
  active: boolean
  children: React.ReactNode
}) {
  if (!active) return null
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${value}`}
      aria-labelledby={`${idPrefix}-tab-${value}`}
      tabIndex={0}
      className="focus:outline-none"
    >
      {children}
    </div>
  )
}
