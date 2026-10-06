"use client"

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"
import { useDebounce } from "@/hooks/useDebounce"
import { queryKeys } from "@/lib/query"
import {
  calculateNutrition,
  getFood,
  identifyImage,
  parseMealText,
  searchFoods,
} from "../api"

export function useFoodSearch(q: string) {
  const term = useDebounce(q.trim(), 250)
  return useQuery({
    queryKey: queryKeys.foods.search(term),
    queryFn: () => searchFoods(term),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
  })
}

export const useFood = (id: string) =>
  useQuery({
    queryKey: queryKeys.foods.detail(id),
    queryFn: () => getFood(id),
    enabled: !!id,
  })

export function useNutrition(id: string, servings: number) {
  return useQuery({
    queryKey: queryKeys.foods.nutrition(id, servings),
    queryFn: () => calculateNutrition(id, servings),
    enabled: !!id && servings > 0,
    placeholderData: keepPreviousData,
  })
}

export const useParseMeal = () =>
  useMutation({ mutationFn: (text: string) => parseMealText(text) })
export const useIdentify = () =>
  useMutation({ mutationFn: (file: Blob) => identifyImage(file) })
