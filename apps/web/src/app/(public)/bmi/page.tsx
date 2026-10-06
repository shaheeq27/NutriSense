import type { Metadata } from "next"
import BmiCalculator from "@/features/bmi/components/BmiCalculator"

export const metadata: Metadata = { title: "BMI" }

export default function BmiPage() {
  return <BmiCalculator />
}
