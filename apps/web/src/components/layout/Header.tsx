"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Logo from "@/components/brand/Logo"
import { buttonClasses } from "@/components/ui"
import { cn } from "@/lib/format"
import { selectIsAuthed, useAuthStore } from "@/stores/auth-store"
import ThemeToggle from "./ThemeToggle"
import { APP_NAV, isActive } from "./nav"

export default function Header({
  variant = "public",
}: {
  variant?: "public" | "app"
}) {
  const pathname = usePathname() ?? "/"
  const authed = useAuthStore(selectIsAuthed)
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-cream/75 border-b border-line/70">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-4">
        <Logo href={authed ? "/dashboard" : "/"} />
        {variant === "app" ? (
          <div className="flex items-center gap-2">
            <nav
              aria-label="Main"
              className="hidden md:flex items-center gap-1"
            >
              {APP_NAV.map((n) => {
                const active = isActive(n, pathname)
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "h-9 px-4 rounded-full text-sm font-semibold grid place-items-center transition",
                      active
                        ? n.primary
                          ? "bg-primary text-on-primary"
                          : "bg-ink text-paper"
                        : n.primary
                          ? "text-primary hover:bg-mint"
                          : "text-ink-soft hover:text-ink",
                    )}
                  >
                    {n.label}
                  </Link>
                )
              })}
            </nav>
            <ThemeToggle />
          </div>
        ) : (
          <nav
            aria-label="Main"
            className="flex items-center gap-1 text-sm font-semibold"
          >
            <Link
              href="/analyze"
              className="hidden sm:grid place-items-center h-9 px-4 rounded-full text-ink-soft hover:text-ink"
            >
              Analyze
            </Link>
            <Link
              href="/bmi"
              className="hidden sm:grid place-items-center h-9 px-4 rounded-full text-ink-soft hover:text-ink"
            >
              BMI
            </Link>
            {authed ? (
              <Link
                href="/dashboard"
                className={buttonClasses("primary", "sm")}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="grid place-items-center h-9 px-4 rounded-full text-ink-soft hover:text-ink"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className={buttonClasses("primary", "sm")}
                >
                  Get started
                </Link>
              </>
            )}
            <ThemeToggle />
          </nav>
        )}
      </div>
    </header>
  )
}
