"use client"

import Link from "next/link"
import { EmptyState, buttonClasses, useToast } from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { SLOTS } from "@/types"
import { useDeleteLog, useToday } from "../hooks/useTracking"
import { SLOT_META } from "../slots"

export default function LogList() {
  const { data } = useToday()
  const del = useDeleteLog()
  const { success, error } = useToast()
  if (!data) return null
  if (data.logs.length === 0)
    return (
      <EmptyState
        icon="🍽️"
        title="Nothing logged yet"
        description="Log a planned meal or search for anything you ate."
        action={
          <Link href="/analyze" className={buttonClasses("secondary")}>
            Add food
          </Link>
        }
      />
    )

  return (
    <div className="space-y-6">
      {SLOTS.map((slot) => {
        const logs = data.logs.filter((l) => l.slot === slot)
        if (!logs.length) return null
        return (
          <section key={slot} aria-labelledby={`slot-${slot}`}>
            <h3
              id={`slot-${slot}`}
              className="font-semibold flex items-center gap-2 mb-2"
            >
              <span aria-hidden>{SLOT_META[slot].icon}</span>{" "}
              {SLOT_META[slot].label}
              <span className="ml-auto font-mono text-sm text-ink-soft">
                {Math.round(logs.reduce((a, l) => a + l.kcal, 0))} kcal
              </span>
            </h3>
            <ul className="rounded-3xl border border-line bg-paper divide-y divide-line/60">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">
                      {l.name}
                    </span>
                    <span className="block text-xs text-ink-soft font-mono">
                      ×{l.servings} · P {Math.round(l.protein)} · C{" "}
                      {Math.round(l.carbs)} · F {Math.round(l.fat)}
                    </span>
                  </span>
                  <span className="font-mono text-sm">
                    {Math.round(l.kcal)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${l.name}`}
                    disabled={del.isPending}
                    onClick={() =>
                      del.mutate(l.id, {
                        onSuccess: () => success("Removed"),
                        onError: (e) => error(errorMessage(e)),
                      })
                    }
                    className="size-8 rounded-full text-ink-soft hover:bg-tomato/10 hover:text-tomato cursor-pointer"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
