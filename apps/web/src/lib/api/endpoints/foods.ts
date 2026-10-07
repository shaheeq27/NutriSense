import { api } from "../client"
import type {
  BmiResult,
  Food,
  FoodSearchResponse,
  NutritionFacts,
  ParseResponse,
  ScanResponse,
} from "@/types"

export const foodEndpoints = {
  search: (q: string, limit = 12) =>
    api.get<FoodSearchResponse>("/foods/search", { query: { q, limit } }),
  get: (id: string) => api.get<Food>(`/foods/${encodeURIComponent(id)}`),
  calculate: (food_id: string, servings: number) =>
    api.post<NutritionFacts>("/nutrition/calculate", { food_id, servings }),
  parse: (text: string) =>
    api.post<ParseResponse>("/nutrition/parse", { text }),
  identify: (image: Blob, filename = "meal.jpg") => {
    const form = new FormData()
    form.append("image", image, filename)
    return api.post<ScanResponse>("/scan/identify", form)
  },
}

export const bmiEndpoints = {
  calculate: (body: { height_cm: number; weight_kg: number }) =>
    api.post<BmiResult>("/bmi", body),
}
