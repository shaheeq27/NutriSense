"use client"

import type { ReactNode } from "react"
import { ToastProvider } from "@/components/ui"
import { ThemeSync } from "@/components/layout/ThemeToggle"
import { QueryProvider } from "@/lib/query"

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <ThemeSync />
        {children}
      </ToastProvider>
    </QueryProvider>
  )
}
