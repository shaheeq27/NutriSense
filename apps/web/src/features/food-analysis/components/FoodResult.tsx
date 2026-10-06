"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Loading,
  ProgressBar,
  Title,
  buttonClasses,
} from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { selectIsAuthed, useAuthStore } from "@/stores/auth-store"
import LogSheet from "@/features/tracking/components/LogSheet"
import { useFood, useNutrition } from "../hooks/useFoods"
import FoodThumb from "./FoodThumb"
import NutritionBreakdown from "./NutritionBreakdown"
import ServingStepper from "./ServingStepper"

export default function FoodResult({ id }: { id: string }) {
  const [servings, setServings] = useState(1)
  const [logOpen, setLogOpen] = useState(false)
  const food = useFood(id)
  const facts = useNutrition(id, servings)
  const authed = useAuthStore(selectIsAuthed)
  const targetKcal = useAuthStore((s) => s.user?.targets?.kcal)

  if (food.isPending) return <Loading text="Reading the label…" />
  if (food.isError)
    return (
      <EmptyState
        tone="error"
        icon="🥲"
        title="We couldn't load this food"
        description={errorMessage(food.error)}
        action={
          <Link href="/analyze" className={buttonClasses("secondary")}>
            Back to search
          </Link>
        }
      />
    )

  const f = food.data
  const n = facts.data
  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
      <div>
        <Link href="/analyze" className="text-sm text-ink-soft hover:text-ink">
          ← Analyzer
        </Link>
        <div className="mt-4 flex items-center gap-5">
          <FoodThumb food={f} className="size-24 text-5xl rounded-3xl" />
          <div>
            <Eyebrow>{f.tag}</Eyebrow>
            <Title className="mt-2 text-3xl md:text-4xl">{f.name}</Title>
            {f.estimated && (
              <Badge tone="golden" className="mt-2">
                Estimated values
              </Badge>
            )}
          </div>
        </div>
        <Card className="mt-8 p-6">
          <p className="text-sm font-semibold mb-3">Serving size</p>
          <ServingStepper
            value={servings}
            onChange={setServings}
            unit={f.unit}
          />
        </Card>
        <Card tone="ink" className="mt-4 p-6">
          <Eyebrow className="text-cream/60">Energy</Eyebrow>
          <p className="font-display text-6xl mt-2" aria-live="polite">
            {n ? Math.round(n.kcal) : Math.round(f.kcal * servings)}
            <span className="text-xl text-cream/60"> kcal</span>
          </p>
          {authed && targetKcal ? (
            <div className="mt-4">
              <ProgressBar
                value={n?.kcal ?? 0}
                max={targetKcal}
                tone="accent"
                label="Share of daily calorie target"
                className="bg-cream/15"
              />
              <p className="text-sm text-cream/70 mt-2">
                of your {targetKcal.toLocaleString()} kcal day
              </p>
            </div>
          ) : (
            <p className="text-sm text-cream/70 mt-3">
              Sign in to see how this fits your personal targets.
            </p>
          )}
        </Card>
      </div>

      <Card className="p-6 md:p-8">
        <h2 className="font-display display-soft text-2xl mb-6">
          Nutrition breakdown
        </h2>
        {facts.isError ? (
          <p role="alert" className="text-tomato text-sm">
            {errorMessage(facts.error)}
          </p>
        ) : n ? (
          <NutritionBreakdown facts={n} />
        ) : (
          <Loading text="Crunching numbers…" />
        )}
        <div className="mt-8">
          {authed ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => setLogOpen(true)}
            >
              Add to today →
            </Button>
          ) : (
            <Link
              href={`/register`}
              className={buttonClasses("primary", "lg", "w-full")}
            >
              Track this with a free account →
            </Link>
          )}
        </div>
      </Card>
      {authed && (
        <LogSheet
          open={logOpen}
          onClose={() => setLogOpen(false)}
          food={f}
          servings={servings}
        />
      )}
    </div>
  )
}
