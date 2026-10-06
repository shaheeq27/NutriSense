import Link from "next/link"
import { Eyebrow, Title, buttonClasses } from "@/components/ui"
import LogList from "./LogList"
import TodaySummary from "./TodaySummary"

export default function TodayView() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Today</Eyebrow>
          <Title className="mt-3">What you&apos;ve eaten.</Title>
        </div>
        <Link href="/analyze" className={buttonClasses("primary")}>
          + Add food
        </Link>
      </div>
      <TodaySummary />
      <LogList />
    </div>
  )
}
