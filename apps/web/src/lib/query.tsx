"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { ApiError } from "./api/client"
import type { ProgressRange, Slot } from "@/types"

export const queryKeys = {
  me: ["me"] as const,
  foods: {
    search: (q: string) => ["foods", "search", q] as const,
    detail: (id: string) => ["foods", id] as const,
    nutrition: (id: string, servings: number) =>
      ["foods", id, "nutrition", servings] as const,
  },
  mealPlans: {
    all: ["meal-plans"] as const,
    window: (start: string) => ["meal-plans", start] as const,
    options: (date: string, slot: Slot) =>
      ["meal-plans", date, slot, "options"] as const,
  },
  tracking: { today: ["tracking", "today"] as const },
  progress: (range: ProgressRange) => ["progress", range] as const,
  recommendations: ["recommendations", "today"] as const,
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) =>
          !(err instanceof ApiError && err.status >= 400 && err.status < 500) &&
          count < 2,
      },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
