export default function Footer({
  withNavPadding,
}: {
  withNavPadding?: boolean
}) {
  return (
    <footer
      className={`max-w-6xl mx-auto px-5 md:px-8 py-8 text-xs text-ink-soft flex flex-wrap gap-2 justify-between ${
        withNavPadding ? "pb-28 md:pb-10" : ""
      }`}
    >
      <span>
        NutriSense · Nutrition That Makes Sense · estimates are approximate
      </span>
      <span className="font-mono">v1.0</span>
    </footer>
  )
}
