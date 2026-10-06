import { api } from "../client"
import type {
  CreateLogInput,
  DailySummary,
  FoodLog,
  ProgressRange,
  ProgressSeries,
  Recommendation,
} from "@/types"

export const trackingEndpoints = {
  create: (body: CreateLogInput) => api.post<FoodLog>("/tracking/logs", body),
  remove: (id: string) =>
    api.delete<void>(`/tracking/logs/${encodeURIComponent(id)}`),
  today: () => api.get<DailySummary>("/tracking/today"),
}

export const progressEndpoints = {
  get: (range: ProgressRange) =>
    api.get<ProgressSeries>("/progress", { query: { range } }),
}

export const recommendationEndpoints = {
  today: () => api.get<Recommendation[]>("/recommendations/today"),
}
