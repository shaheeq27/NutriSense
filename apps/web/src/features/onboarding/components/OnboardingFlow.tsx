"use client"

import { useRouter } from "next/navigation"
import { Eyebrow, Title, useToast } from "@/components/ui"
import ProfileForm from "./ProfileForm"

export default function OnboardingFlow() {
  const router = useRouter()
  const { success } = useToast()
  return (
    <div className="max-w-3xl mx-auto">
      <Eyebrow>Let&apos;s get to know you</Eyebrow>
      <Title className="mt-3">A plan that feels like yours.</Title>
      <p className="mt-4 text-ink-soft text-lg">
        Tell us what matters. NutriSense will shape meals, guidance and progress
        around it.
      </p>
      <div className="mt-10">
        <ProfileForm
          submitLabel="Create my meal plan →"
          onSaved={() => {
            success("You're all set")
            router.replace("/plan")
          }}
        />
      </div>
    </div>
  )
}
