"use client"

/** Keeps <html data-theme> in sync with the stored preference + system setting. */

import { useEffect } from "react"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { resolveTheme, useUiStore } from "@/stores/ui-store"
export function ThemeSync() {
  const pref = useUiStore((s) => s.theme)
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)")
  useEffect(() => {
    document.documentElement.dataset.theme = resolveTheme(pref, systemDark)
  }, [pref, systemDark])
  return null
}

export default function ThemeToggle() {
  const pref = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)")
  const current = resolveTheme(pref, systemDark)
  const next = current === "light" ? "dark" : "light"
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="size-9 shrink-0 rounded-full border border-line bg-paper text-ink-soft hover:text-ink hover:border-ink/30 grid place-items-center transition cursor-pointer"
    >
      {current === "light" ? (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20.3 15.3A8.5 8.5 0 0 1 8.7 3.7 8.5 8.5 0 1 0 20.3 15.3Z" />
        </svg>
      ) : (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </svg>
      )}
    </button>
  )
}
