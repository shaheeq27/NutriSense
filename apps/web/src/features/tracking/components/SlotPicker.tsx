"use client"

import { Chip } from "@/components/ui"
import { SLOTS, type Slot } from "@/types"
import { SLOT_META } from "../slots"

export default function SlotPicker({
  value,
  onChange,
}: {
  value: Slot
  onChange: (s: Slot) => void
}) {
  return (
    <div role="radiogroup" aria-label="Meal" className="flex flex-wrap gap-2">
      {SLOTS.map((s) => (
        <Chip
          key={s}
          role="radio"
          aria-checked={value === s}
          aria-pressed={undefined}
          on={value === s}
          onClick={() => onChange(s)}
        >
          <span aria-hidden>{SLOT_META[s].icon}</span> {SLOT_META[s].label}
        </Chip>
      ))}
    </div>
  )
}
