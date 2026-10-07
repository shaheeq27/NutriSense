"use client"

import { useState } from "react"
import { Button, Sheet, useToast } from "@/components/ui"
import ServingStepper from "@/features/food-analysis/components/ServingStepper"
import { errorMessage } from "@/lib/api"
import type { Food, PlannedMeal, Slot } from "@/types"
import { useCreateLog } from "../hooks/useTracking"
import { SLOT_META, slotForHour } from "../slots"
import SlotPicker from "./SlotPicker"

type Source = { food: Food; meal?: never } | { meal: PlannedMeal; food?: never }

type LogSheetProps = Source & {
  open: boolean
  onClose: () => void
  servings?: number
  defaultSlot?: Slot
}

export default function LogSheet({
  open,
  onClose,
  food,
  meal,
  servings: initialServings = 1,
  defaultSlot,
}: LogSheetProps) {
  const [slot, setSlot] = useState<Slot>(
    defaultSlot ?? meal?.slot ?? slotForHour(new Date().getHours()),
  )
  const [servings, setServings] = useState(initialServings)
  const create = useCreateLog()
  const { success } = useToast()
  const name = food?.name ?? meal?.name ?? ""
  const kcal = Math.round((food?.kcal ?? meal?.kcal ?? 0) * servings)

  const submit = () =>
    create.mutate(
      {
        slot,
        servings,
        ...(food ? { food_id: food.id } : { planned_meal_id: meal!.id }),
      },
      {
        onSuccess: () => {
          success(`Added to ${SLOT_META[slot].label.toLowerCase()}`)
          onClose()
        },
      },
    )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Log ${name}`}
      description="Pick the meal and how much you had."
    >
      <div className="space-y-6">
        <SlotPicker value={slot} onChange={setSlot} />
        <div className="flex items-center justify-between gap-4">
          <ServingStepper
            value={servings}
            onChange={setServings}
            unit={food?.unit ?? "serving"}
          />
          <p className="font-display text-3xl">
            {kcal}
            <span className="text-base text-ink-soft"> kcal</span>
          </p>
        </div>
        {create.isError && (
          <p
            role="alert"
            className="rounded-2xl bg-tomato/10 text-tomato text-sm px-4 py-3"
          >
            {errorMessage(create.error)}
          </p>
        )}
        <Button
          size="lg"
          className="w-full"
          loading={create.isPending}
          onClick={submit}
        >
          Add to {SLOT_META[slot].label}
        </Button>
      </div>
    </Sheet>
  )
}
