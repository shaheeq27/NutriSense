"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toISODate } from "@/lib/dates"
import { queryKeys } from "@/lib/query"
import type { Slot } from "@/types"
import {
  addPlanItem,
  generatePlan,
  getSwapOptions,
  listPlans,
  swapMeal,
} from "../api"

export function usePlanWindow(start: string = toISODate(new Date())) {
  return useQuery({
    queryKey: queryKeys.mealPlans.window(start),
    queryFn: () => listPlans(start),
  })
}

export function useSwapOptions(date: string, slot: Slot | null) {
  return useQuery({
    queryKey: queryKeys.mealPlans.options(date, slot ?? "breakfast"),
    queryFn: () => getSwapOptions(date, slot!),
    enabled: !!slot,
  })
}

function useInvalidatePlans() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.mealPlans.all })
}

export function useGeneratePlan() {
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (date: string) => generatePlan(date),
    onSuccess: invalidate,
  })
}

export function useSwapMeal() {
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (v: { date: string; slot: Slot; templateId: string }) =>
      swapMeal(v.date, v.slot, v.templateId),
    onSuccess: invalidate,
  })
}

export function useAddPlanItem() {
  const invalidate = useInvalidatePlans()
  return useMutation({
    mutationFn: (v: {
      date: string
      slot: Slot
      foodId: string
      servings: number
    }) => addPlanItem(v.date, v.slot, v.foodId, v.servings),
    onSuccess: invalidate,
  })
}
