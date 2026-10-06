import type { Metadata } from "next"
import ScanView from "@/features/food-analysis/components/ScanView"

export const metadata: Metadata = { title: "Identify food" }

export default function ScanPage() {
  return <ScanView />
}
