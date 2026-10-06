export const round = (n: number, dp = 0) => {
  const f = 10 ** dp
  return Math.round(n * f) / f
}
export const kcal = (n: number) => `${Math.round(n).toLocaleString()} kcal`
export const grams = (n: number) => `${round(n, 1)}g`
export const pct = (v: number, max: number) =>
  max > 0 ? Math.min(100, Math.max(0, (v / max) * 100)) : 0
export const cn = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ")
