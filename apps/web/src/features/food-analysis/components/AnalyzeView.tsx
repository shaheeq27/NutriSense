"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Card,
  Eyebrow,
  SegmentedControl,
  TabPanel,
  Title,
  buttonClasses,
} from "@/components/ui"
import DescribeMeal from "./DescribeMeal"
import FoodSearch from "./FoodSearch"

type Mode = "search" | "describe"

export default function AnalyzeView() {
  const [mode, setMode] = useState<Mode>("search")
  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
      <div>
        <Eyebrow>Food Analyzer</Eyebrow>
        <Title className="mt-3">Tell us what you&apos;re eating.</Title>
        <SegmentedControl
          className="mt-8"
          label="How would you like to add food?"
          idPrefix="analyze"
          value={mode}
          onChange={setMode}
          options={[
            { value: "search", label: "Search" },
            { value: "describe", label: "Describe" },
          ]}
        />
        <div className="mt-6">
          <TabPanel
            idPrefix="analyze"
            value="search"
            active={mode === "search"}
          >
            <FoodSearch />
          </TabPanel>
          <TabPanel
            idPrefix="analyze"
            value="describe"
            active={mode === "describe"}
          >
            <DescribeMeal />
          </TabPanel>
        </div>
      </div>
      <Card tone="peach" className="p-6">
        <span aria-hidden className="text-4xl">
          📸
        </span>
        <h2 className="font-display display-soft text-2xl mt-3">
          Got a photo?
        </h2>
        <p className="text-sm text-ink-soft mt-1">
          Snap your plate and we&apos;ll suggest what it might be. You always
          confirm before anything is logged.
        </p>
        <Link
          href="/analyze/scan"
          className={buttonClasses("secondary", "md", "mt-5")}
        >
          Identify from photo
        </Link>
      </Card>
    </div>
  )
}
