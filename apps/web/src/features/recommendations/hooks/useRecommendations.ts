import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query"
import { getRecommendations } from "../api"

export const useRecommendations = () =>
  useQuery({ queryKey: queryKeys.recommendations, queryFn: getRecommendations })
