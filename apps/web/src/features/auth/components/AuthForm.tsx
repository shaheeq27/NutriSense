"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { Button, Card, Eyebrow, Field, Input, Title } from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { useLogin, useRegister } from "../hooks/useAuth"
import { loginSchema, registerSchema, type RegisterInput } from "../schemas"

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const next = useSearchParams()?.get("next") ?? undefined
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined
  const loginM = useLogin(safeNext)
  const registerM = useRegister()
  const m = mode === "login" ? loginM : registerM
  const isRegister = mode === "register"

  const form = useForm<RegisterInput>({
    resolver: zodResolver(
      (isRegister
        ? registerSchema
        : loginSchema.extend({
            name: registerSchema.shape.name.optional(),
          })) as typeof registerSchema,
    ),
    defaultValues: { name: "", email: "", password: "" },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((v) =>
    isRegister
      ? registerM.mutate(v)
      : loginM.mutate({ email: v.email, password: v.password }),
  )

  return (
    <div className="grid lg:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
      <div className="hidden lg:block">
        <Eyebrow>{isRegister ? "Start where you are" : "Welcome back"}</Eyebrow>
        <Title className="mt-4">
          {isRegister
            ? "Make NutriSense yours."
            : "Pick up where you left off."}
        </Title>
        <p className="mt-5 text-ink-soft text-lg max-w-md">
          Save your goals, build your daily plan, and track your nutrition over
          time.
        </p>
        <blockquote className="mt-10 font-display italic text-2xl text-ink max-w-md">
          &ldquo;I finally understand what&apos;s on my plate.&rdquo;
          <footer className="mt-2 not-italic font-sans text-sm text-ink-soft">
            — Ananya, 3 months with NutriSense
          </footer>
        </blockquote>
      </div>
      <Card className="p-7 md:p-9 shadow-[var(--shadow-soft)]">
        <h1 className="font-display display-soft text-3xl">
          {isRegister ? "Create your account" : "Log in"}
        </h1>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {isRegister && (
            <Field label="Name" error={errors.name?.message}>
              <Input autoComplete="name" {...form.register("name")} />
            </Field>
          )}
          <Field label="Email" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
          </Field>
          <Field
            label="Password"
            hint={isRegister ? "At least 8 characters." : undefined}
            error={errors.password?.message}
          >
            <Input
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              {...form.register("password")}
            />
          </Field>
          {m.isError && (
            <p
              role="alert"
              className="rounded-2xl bg-tomato/10 text-tomato text-sm px-4 py-3"
            >
              {errorMessage(m.error)}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={m.isPending}
          >
            {isRegister ? "Create account →" : "Log in →"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-soft text-center">
          {isRegister ? "Already have an account? " : "New to NutriSense? "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {isRegister ? "Log in" : "Create one"}
          </Link>
        </p>
      </Card>
    </div>
  )
}
