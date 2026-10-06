import type { Metadata } from "next"
import ProgressOverview from "@/features/progress/components/ProgressOverview"

export const metadata: Metadata = { title: "Progress" }

export default function ProgressPage() {
  return <ProgressOverview />
}
