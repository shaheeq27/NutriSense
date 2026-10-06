import type { Metadata } from "next"
import PlanView from "@/features/meal-planning/components/PlanView"

export const metadata: Metadata = { title: "Meal plan" }

export default function PlanPage() {
  return <PlanView />
}
