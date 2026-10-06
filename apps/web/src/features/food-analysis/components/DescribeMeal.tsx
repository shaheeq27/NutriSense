"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button, Card, EmptyState } from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { round } from "@/lib/format"
import { useParseMeal } from "../hooks/useFoods"
import { describeSchema, type DescribeInput } from "../schemas"
import FoodRow from "./FoodRow"

export default function DescribeMeal() {
  const parse = useParseMeal()
  const { register, handleSubmit, formState } = useForm<DescribeInput>({
    resolver: zodResolver(describeSchema),
    defaultValues: { text: "" },
  })
  const err = formState.errors.text?.message

  return (
    <div>
      <form
        onSubmit={handleSubmit(({ text }) => parse.mutate(text))}
        noValidate
      >
        <label htmlFor="describe" className="block text-sm font-semibold mb-2">
          Describe what you ate
        </label>
        <textarea
          id="describe"
          rows={3}
          aria-invalid={!!err || undefined}
          aria-describedby={err ? "describe-err" : undefined}
          placeholder="2 rotis, a bowl of dal and a glass of buttermilk"
          className="w-full rounded-3xl border border-line bg-paper p-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-secondary/40"
          {...register("text")}
        />
        {err && (
          <p
            id="describe-err"
            role="alert"
            className="text-sm text-tomato mt-1"
          >
            {err}
          </p>
        )}
        <Button type="submit" className="mt-3" loading={parse.isPending}>
          Understand my meal
        </Button>
      </form>
      <div className="mt-6" aria-live="polite">
        {parse.isError && (
          <EmptyState
            tone="error"
            icon="🥲"
            title="We couldn't read that"
            description={errorMessage(parse.error)}
          />
        )}
        {parse.data &&
          (parse.data.items.length === 0 ? (
            <EmptyState
              icon="🤔"
              title="We didn't spot any foods"
              description="Try naming dishes with quantities, like “1 bowl rice”."
            />
          ) : (
            <Card className="p-4 animate-rise">
              <ul className="divide-y divide-line/60">
                {parse.data.items.map((it, i) => (
                  <li key={`${it.food.id}-${i}`}>
                    <FoodRow
                      food={{ ...it.food, kcal: it.nutrition.kcal }}
                      extra={`× ${it.quantity}`}
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-2xl bg-mint px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm">
                <span>
                  <strong>{Math.round(parse.data.totals.kcal)}</strong> kcal
                </span>
                <span>P {round(parse.data.totals.protein, 1)}g</span>
                <span>C {round(parse.data.totals.carbs, 1)}g</span>
                <span>F {round(parse.data.totals.fat, 1)}g</span>
              </div>
            </Card>
          ))}
      </div>
    </div>
  )
}
