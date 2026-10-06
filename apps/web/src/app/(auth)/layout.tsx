import { Suspense, type ReactNode } from "react"
import { PublicShell } from "@/components/layout/AppShell"
import { Loading } from "@/components/ui"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <PublicShell>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </PublicShell>
  )
}
