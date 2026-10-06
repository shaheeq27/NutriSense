export interface NavItem {
  href: string
  label: string
  short?: string
  icon: string
  primary?: boolean
  match?: string[]
}

export const APP_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: "⌂",
    match: ["/dashboard", "/today"],
  },
  {
    href: "/plan",
    label: "Meal Plan",
    short: "Plan",
    icon: "▤",
    match: ["/plan"],
  },
  {
    href: "/analyze",
    label: "Analyze",
    icon: "◎",
    primary: true,
    match: ["/analyze", "/foods"],
  },
  { href: "/progress", label: "Progress", icon: "↗" },
  { href: "/profile", label: "Profile", icon: "○" },
]

export function isActive(item: NavItem, pathname: string) {
  return (item.match ?? [item.href]).some(
    (m) => pathname === m || pathname.startsWith(`${m}/`),
  )
}
