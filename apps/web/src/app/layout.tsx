import type { Metadata, Viewport } from "next"
import { DM_Mono, Fraunces, Nunito_Sans, Poppins } from "next/font/google"
import type { ReactNode } from "react"
import ThemeScript from "@/components/layout/ThemeScript"
import Providers from "./providers"
import "./globals.css"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"],
  display: "swap",
})
const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
})
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  display: "swap",
})
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "NutriSense — Nutrition That Makes Sense",
    template: "%s · NutriSense",
  },
  description:
    "Understand what you eat, plan the next three days, and track progress without the clinical feel.",
  icons: { icon: "/brand/nutrisense-mark.png" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8ec" },
    { media: "(prefers-color-scheme: dark)", color: "#121510" },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${nunito.variable} ${poppins.variable} ${dmMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
