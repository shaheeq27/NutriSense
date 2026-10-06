import type { ReactNode } from "react"
import { PublicShell } from "@/components/layout/AppShell"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
