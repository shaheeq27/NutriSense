"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useForm } from "react-hook-form"
import {
  Badge,
  Button,
  Card,
  Eyebrow,
  Field,
  Input,
  Title,
  buttonClasses,
} from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { cn } from "@/lib/format"
import { useBmi } from "../hooks/useBmi"
import { bmiSchema, type BmiInput, type BmiValues } from "../schemas"

const TONE: Record<string, "green" | "orange" | "red" | "golden"> = {
  healthy: "green",
  underweight: "golden",
  overweight: "orange",
  obese: "red",
}

export default function BmiCalculator() {
  const bmi = useBmi()
  const { register, handleSubmit, formState } =
    useForm<BmiInput, unknown, BmiValues>({
      resolver: zodResolver(bmiSchema),
      defaultValues: { height_cm: 170, weight_kg: 68 },
    })
  const r = bmi.data
  const marker = r ? Math.min(100, Math.max(0, ((r.bmi - 15) / 25) * 100)) : 0

  return (
    <div className="grid lg:grid-cols-2 gap-10 items-start">
      <div>
        <Eyebrow>BMI</Eyebrow>
        <Title className="mt-3">Know your starting point.</Title>
        <p className="mt-4 text-ink-soft text-lg max-w-md">
          Calculate your BMI and understand where you currently stand. It&apos;s
          one signal, not a verdict.
        </p>
        <Card className="mt-8 p-6">
          <form
            onSubmit={handleSubmit((v) => bmi.mutate(v))}
            noValidate
            className="grid sm:grid-cols-2 gap-4"
          >
            <Field
              label="Height (cm)"
              error={formState.errors.height_cm?.message}
            >
              <Input
                type="number"
                inputMode="decimal"
                {...register("height_cm")}
              />
            </Field>
            <Field
              label="Weight (kg)"
              error={formState.errors.weight_kg?.message}
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                {...register("weight_kg")}
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              loading={bmi.isPending}
              className="sm:col-span-2"
            >
              Calculate BMI
            </Button>
          </form>
        </Card>
      </div>

      <div aria-live="polite">
        {bmi.isError && (
          <p
            role="alert"
            className="rounded-2xl bg-tomato/10 text-tomato px-4 py-3"
          >
            {errorMessage(bmi.error)}
          </p>
        )}
        {r ? (
          <Card className="p-7 animate-rise">
            <Eyebrow>Your result</Eyebrow>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-7xl leading-none">
                {r.bmi.toFixed(1)}
              </span>
              <Badge
                tone={TONE[r.category] ?? "neutral"}
                className="mb-2 capitalize"
              >
                {r.category}
              </Badge>
            </div>
            <div
              className="relative mt-6 h-3 rounded-full bg-[linear-gradient(90deg,var(--color-golden),var(--color-secondary)_35%,var(--color-secondary)_50%,var(--color-accent)_70%,var(--color-tomato))]"
              aria-hidden
            >
              <span
                className={cn(
                  "absolute -top-1.5 size-6 rounded-full bg-paper border-4 border-ink -translate-x-1/2 transition-all",
                )}
                style={{ left: `${marker}%` }}
              />
            </div>
            <p className="mt-6 text-ink">{r.message}</p>
            <p className="mt-2 text-sm text-ink-soft">
              Healthy weight for your height:{" "}
              <strong className="text-ink">
                {r.healthy_weight_min_kg.toFixed(0)}–
                {r.healthy_weight_max_kg.toFixed(0)} kg
              </strong>
            </p>
            <div className="mt-6 rounded-3xl bg-mint p-5">
              <p className="font-semibold">Want NutriSense to do more?</p>
              <p className="text-sm text-ink-soft mt-1">
                Create your nutrition profile and get a meal plan built around
                your goals.
              </p>
              <Link
                href="/register"
                className={buttonClasses("primary", "md", "mt-4")}
              >
                Build my nutrition plan →
              </Link>
            </div>
          </Card>
        ) : (
          !bmi.isError && (
            <Card tone="peach" className="p-8 text-center">
              <div className="text-5xl" aria-hidden>
                ⚖️
              </div>
              <p className="font-display text-2xl mt-3">
                Your result will appear here
              </p>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
