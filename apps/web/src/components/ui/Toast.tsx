"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { cn } from "@/lib/format"

type ToastTone = "success" | "error" | "info"
interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}
interface ToastApi {
  toast: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++seq.current
    setItems((xs) => [...xs.slice(-2), { id, message, tone }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2800)
  }, [])

  const value = useMemo<ToastApi>(
    () => ({
      toast,
      success: (m) => toast(m, "success"),
      error: (m) => toast(m, "error"),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="fixed top-20 inset-x-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-rise pointer-events-auto rounded-full px-5 py-2.5 text-sm font-semibold shadow-[var(--shadow-soft)]",
              t.tone === "error" ? "bg-tomato text-white" : "bg-ink text-paper",
            )}
          >
            {t.tone === "success" ? "✓ " : t.tone === "error" ? "! " : ""}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}
