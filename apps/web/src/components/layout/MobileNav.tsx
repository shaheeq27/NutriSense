"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/format"
import { APP_NAV, isActive } from "./nav"

export default function MobileNav() {
  const pathname = usePathname() ?? "/"
  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-line grid grid-cols-5 h-[72px] pb-2"
    >
      {APP_NAV.map((n) => {
        const active = isActive(n, pathname)
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
              active ? "text-primary" : "text-ink-soft",
            )}
          >
            {n.primary ? (
              <span
                aria-hidden
                className="size-11 -mt-6 rounded-full bg-primary text-on-primary grid place-items-center text-lg shadow-lg"
              >
                {n.icon}
              </span>
            ) : (
              <span aria-hidden className="text-lg">
                {n.icon}
              </span>
            )}
            {n.short ?? n.label}
          </Link>
        )
      })}
    </nav>
  )
}
