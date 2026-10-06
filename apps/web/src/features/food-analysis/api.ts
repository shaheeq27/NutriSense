import { foodEndpoints } from "@/lib/api"

export const searchFoods = foodEndpoints.search
export const getFood = foodEndpoints.get
export const calculateNutrition = foodEndpoints.calculate
export const parseMealText = foodEndpoints.parse
export const identifyImage = foodEndpoints.identify
