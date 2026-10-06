"use client"

import { useState } from "react"
import { EmptyState, Input, Skeleton } from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { useFoodSearch } from "../hooks/useFoods"
import FoodRow from "./FoodRow"

const SUGGESTIONS = [
  "Chicken biryani",
  "Masala dosa",
  "Greek yogurt",
  "Avocado toast",
  "Ramen",
]

export default function FoodSearch() {
  const [q, setQ] = useState("")
  const { data, isFetching, isError, error } = useFoodSearch(q)
  const active = q.trim().length >= 2

  return (
    <div>
      <label htmlFor="food-search" className="sr-only">
        Search foods
      </label>
      <Input
        id="food-search"
        type="search"
        autoComplete="off"
        placeholder="Search any food — “paneer tikka”, “banana”…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-14 text-base"
      />
      {!active && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQ(s)}
              className="h-8 px-3 rounded-full bg-sand/70 text-sm hover:bg-sand cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="mt-6" aria-live="polite" aria-busy={isFetching}>
        {active && isFetching && !data && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}
        {active && isError && (
          <EmptyState
            tone="error"
            icon="🥲"
            title="Search hiccup"
            description={errorMessage(error)}
          />
        )}
        {active && data && (
          <>
            {data.items.length > 0 ? (
              <ul className="divide-y divide-line/60">
                {data.items.map((f) => (
                  <li key={f.id}>
                    <FoodRow food={f} />
                  </li>
                ))}
              </ul>
            ) : !data.estimate ? (
              <EmptyState
                icon="🔍"
                title="Nothing on the menu"
                description="Try a simpler name, or describe your meal instead."
              />
            ) : null}
            {data.estimate && (
              <div className="mt-4 rounded-3xl bg-peach p-2">
                <p className="px-3 pt-2 text-xs font-mono uppercase tracking-[.16em] text-ink-soft">
                  Our best estimate
                </p>
                <FoodRow food={data.estimate} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
