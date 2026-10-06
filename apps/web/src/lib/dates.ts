/**
 * Planning window helpers. UI-only: the server is the source of truth and
 * enforces the window; these helpers only decide what to render as locked.
 */
export const PLANNING_WINDOW_DAYS = 3

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() + n)
  return r
}

export interface WindowDay {
  date: string
  offset: number
  locked: boolean
  label: string
}

/** Days shown in the plan strip: the open window plus one locked "teaser" day. */
export function planningWindow(
  today: Date = new Date(),
  days = PLANNING_WINDOW_DAYS,
): WindowDay[] {
  return Array.from({ length: days + 1 }, (_, i) => ({
    date: toISODate(addDays(today, i)),
    offset: i,
    locked: i >= days,
    label:
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : addDays(today, i).toLocaleDateString("en-GB", { weekday: "short" }),
  }))
}

export function isWithinWindow(
  date: string,
  today: Date = new Date(),
  days = PLANNING_WINDOW_DAYS,
): boolean {
  const start = parseISODate(toISODate(today)).getTime()
  const t = parseISODate(date).getTime()
  const diff = Math.round((t - start) / 86_400_000)
  return diff >= 0 && diff < days
}

export function formatDay(
  date: string,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  },
) {
  return parseISODate(date).toLocaleDateString("en-GB", opts)
}
