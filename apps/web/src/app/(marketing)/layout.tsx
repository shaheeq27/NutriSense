import type { ReactNode } from "react"
import { PublicShell } from "@/components/layout/AppShell"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
