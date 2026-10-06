import type { Metadata } from "next"
import OnboardingFlow from "@/features/onboarding/components/OnboardingFlow"

export const metadata: Metadata = { title: "Onboarding" }

export default function OnboardingPage() {
  return <OnboardingFlow />
}
