"use client"

/** Shared by onboarding and the profile page. */

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Button, Chip, Field, Input } from "@/components/ui"
import { errorMessage } from "@/lib/api"
import type { Profile } from "@/types"
import { useSaveProfile } from "@/features/profile/hooks/useProfile"
import {
  ACTIVITY,
  COMMON_ALLERGIES,
  DIETS,
  GOALS,
  profileSchema,
  type ProfileInput,
  type ProfileValues,
} from "../schemas"
import SelectCard from "./SelectCard"

const DEFAULTS: ProfileInput = {
  goal: "eat_healthier",
  sex: "female",
  age: 30,
  height_cm: 165,
  weight_kg: 65,
  activity_level: "moderate",
  diet_style: "omnivore",
  allergies: [],
}
export default function ProfileForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial?: Profile | null
  submitLabel: string
  onSaved?: () => void
}) {
  const save = useSaveProfile()
  const { control, register, handleSubmit, formState } =
    useForm<ProfileInput, unknown, ProfileValues>({
      resolver: zodResolver(profileSchema),
      defaultValues: initial ?? DEFAULTS,
    })
  const e = formState.errors

  return (
    <form
      onSubmit={handleSubmit((v) =>
        save.mutate(v as Profile, { onSuccess: onSaved }),
      )}
      noValidate
      className="space-y-10"
    >
      <fieldset>
        <legend className="font-display display-soft text-2xl mb-4">
          What would you like help with?
        </legend>
        <Controller
          control={control}
          name="goal"
          render={({ field }) => (
            <div className="grid sm:grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <SelectCard
                  key={g.value}
                  selected={field.value === g.value}
                  onClick={() => field.onChange(g.value)}
                  icon={g.icon}
                  title={g.title}
                  desc={g.desc}
                />
              ))}
            </div>
          )}
        />
      </fieldset>

      <fieldset className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <legend className="font-display display-soft text-2xl mb-4 col-span-full">
          A little about you
        </legend>
        <Field label="Sex" error={e.sex?.message}>
          <select
            {...register("sex")}
            className="h-12 w-full rounded-2xl border border-line bg-paper px-4"
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Prefer not to say</option>
          </select>
        </Field>
        <Field label="Age" error={e.age?.message}>
          <Input type="number" inputMode="numeric" {...register("age")} />
        </Field>
        <Field label="Height (cm)" error={e.height_cm?.message}>
          <Input type="number" inputMode="decimal" {...register("height_cm")} />
        </Field>
        <Field label="Weight (kg)" error={e.weight_kg?.message}>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            {...register("weight_kg")}
          />
        </Field>
      </fieldset>

      <fieldset>
        <legend className="font-display display-soft text-2xl mb-4">
          How active is a normal week?
        </legend>
        <Controller
          control={control}
          name="activity_level"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {ACTIVITY.map((a) => (
                <Chip
                  key={a.value}
                  on={field.value === a.value}
                  onClick={() => field.onChange(a.value)}
                >
                  {a.label}
                </Chip>
              ))}
            </div>
          )}
        />
      </fieldset>

      <fieldset>
        <legend className="font-display display-soft text-2xl mb-4">
          How do you eat?
        </legend>
        <Controller
          control={control}
          name="diet_style"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => (
                <Chip
                  key={d.value}
                  on={field.value === d.value}
                  onClick={() => field.onChange(d.value)}
                >
                  {d.label}
                </Chip>
              ))}
            </div>
          )}
        />
        <p className="mt-6 mb-3 text-sm font-semibold">
          Allergies or foods to avoid
        </p>
        <Controller
          control={control}
          name="allergies"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((a) => {
                const on = field.value.includes(a)
                return (
                  <Chip
                    key={a}
                    on={on}
                    onClick={() =>
                      field.onChange(
                        on
                          ? field.value.filter((x) => x !== a)
                          : [...field.value, a],
                      )
                    }
                  >
                    {a}
                  </Chip>
                )
              })}
            </div>
          )}
        />
      </fieldset>

      {save.isError && (
        <p
          role="alert"
          className="rounded-2xl bg-tomato/10 text-tomato text-sm px-4 py-3"
        >
          {errorMessage(save.error)}
        </p>
      )}
      <Button type="submit" size="lg" loading={save.isPending}>
        {submitLabel}
      </Button>
    </form>
  )
}
