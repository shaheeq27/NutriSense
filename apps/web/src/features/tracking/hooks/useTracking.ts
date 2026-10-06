"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query"
import type { CreateLogInput } from "@/types"
import { createLog, deleteLog, getToday } from "../api"
import { createLogSchema } from "../schemas"

export const useToday = () =>
  useQuery({ queryKey: queryKeys.tracking.today, queryFn: getToday })

function useInvalidateDay() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.tracking.today })
    qc.invalidateQueries({ queryKey: queryKeys.mealPlans.all })
    qc.invalidateQueries({ queryKey: ["progress"] })
    qc.invalidateQueries({ queryKey: queryKeys.recommendations })
  }
}

export function useCreateLog() {
  const invalidate = useInvalidateDay()
  return useMutation({
    mutationFn: (input: CreateLogInput) =>
      createLog(createLogSchema.parse(input)),
    onSuccess: invalidate,
  })
}

export function useDeleteLog() {
  const invalidate = useInvalidateDay()
  return useMutation({ mutationFn: deleteLog, onSuccess: invalidate })
}
