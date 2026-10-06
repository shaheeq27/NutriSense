import type { Metadata } from "next"
import AnalyzeView from "@/features/food-analysis/components/AnalyzeView"

export const metadata: Metadata = { title: "Food Analyzer" }

export default function AnalyzePage() {
  return <AnalyzeView />
}
