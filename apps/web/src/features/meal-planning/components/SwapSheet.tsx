"use client"
// eslint-disable-next-line @next/next/no-img-element
import { EmptyState, Loading, Sheet, useToast } from "@/components/ui"
import { SLOT_META } from "@/features/tracking/slots"
import { errorMessage } from "@/lib/api"
import type { Slot } from "@/types"
import { useSwapMeal, useSwapOptions } from "../hooks/useMealPlans"

export default function SwapSheet({
  date,
  slot,
  onClose,
}: {
  date: string
  slot: Slot | null
  onClose: () => void
}) {
  const options = useSwapOptions(date, slot)
  const swap = useSwapMeal()
  const { success, error } = useToast()
  const label = slot ? SLOT_META[slot].label : ""

  return (
    <Sheet
      open={!!slot}
      onClose={onClose}
      title={`Swap ${label.toLowerCase()}`}
      description="Similar options that still fit your day."
    >
      {options.isPending ? (
        <Loading text="Finding good alternatives…" />
      ) : options.isError ? (
        <EmptyState
          tone="error"
          icon="🥲"
          title="No alternatives right now"
          description={errorMessage(options.error)}
        />
      ) : options.data.length === 0 ? (
        <EmptyState icon="🍽️" title="This one's already a great fit" />
      ) : (
        <ul className="space-y-2">
          {options.data.map((o) => (
            <li key={o.template_id}>
              <button
                type="button"
                disabled={swap.isPending}
                onClick={() =>
                  slot &&
                  swap.mutate({ date, slot, templateId: o.template_id }, {
                    onSuccess: () => (
                      success(`Swapped to ${o.name}`), onClose()
                    ),
                    onError: (e) => error(errorMessage(e)),
                  })
                }
                className="w-full flex items-center gap-4 p-3 rounded-3xl border border-line hover:border-primary hover:bg-mint/40 text-left transition cursor-pointer disabled:opacity-50"
              >
                <span className="size-14 rounded-2xl bg-sand overflow-hidden grid place-items-center text-2xl shrink-0">
                  {o.image_url ? (
                    <img
                      src={o.image_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span aria-hidden>{o.emoji ?? "🍽️"}</span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{o.name}</span>
                  {o.reason && (
                    <span className="block text-sm text-ink-soft truncate">
                      {o.reason}
                    </span>
                  )}
                </span>
                <span className="text-right font-mono text-sm">
                  {Math.round(o.kcal)}
                  <span className="block text-[11px] text-ink-soft">
                    P {Math.round(o.protein)}g
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
