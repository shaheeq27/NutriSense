"use client"

/** Client-side guard: waits for persisted auth to hydrate, then redirects guests to /login. */

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { Loading } from "@/components/ui"
import { useAuthStore } from "@/stores/auth-store"
export default function AuthGuard({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const hydrated = useAuthStore((s) => s.hydrated)
  const router = useRouter()
  const pathname = usePathname() ?? "/dashboard"

  useEffect(() => {
    if (hydrated && !token)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [hydrated, token, pathname, router])

  if (!hydrated || !token)
    return <Loading text="Checking your session…" className="min-h-[50vh]" />
  return <>{children}</>
}
