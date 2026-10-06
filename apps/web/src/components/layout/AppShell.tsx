import type { ReactNode } from "react"
import Footer from "./Footer"
import Header from "./Header"
import MobileNav from "./MobileNav"

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh app-glow">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-paper focus:px-4 focus:py-2 focus:rounded-full"
      >
        Skip to content
      </a>
      <Header variant="app" />
      <main
        id="main"
        className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12 pb-32 md:pb-12"
      >
        {children}
      </main>
      <Footer withNavPadding />
      <MobileNav />
    </div>
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh app-glow">
      <Header variant="public" />
      <main id="main" className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {children}
      </main>
      <Footer />
    </div>
  )
}
