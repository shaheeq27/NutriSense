"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Button,
  Card,
  Eyebrow,
  Field,
  Input,
  Loading,
  Title,
  useToast,
} from "@/components/ui"
import ThemeToggle from "@/components/layout/ThemeToggle"
import { useLogout } from "@/features/auth/hooks/useAuth"
import ProfileForm from "@/features/onboarding/components/ProfileForm"
import { errorMessage } from "@/lib/api"
import { name } from "@/lib/validation"
import { useMe, useUpdateMe } from "../hooks/useProfile"

const accountSchema = z.object({ name })

export default function ProfileView() {
  const me = useMe()
  const update = useUpdateMe()
  const logout = useLogout()
  const { success, error } = useToast()
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    values: { name: me.data?.name ?? "" },
  })

  if (!me.data) return <Loading text="Loading your profile…" />
  return (
    <div className="space-y-10">
      <div>
        <Eyebrow>Profile</Eyebrow>
        <Title className="mt-3">Make it yours.</Title>
      </div>
      <Card className="p-6 grid md:grid-cols-[1fr_auto] gap-6 items-end">
        <form
          onSubmit={form.handleSubmit((v) =>
            update.mutate(v, {
              onSuccess: () => success("Saved"),
              onError: (e) => error(errorMessage(e)),
            }),
          )}
          className="flex flex-wrap gap-3 items-end"
          noValidate
        >
          <div className="flex-1 min-w-56">
            <Field label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </Field>
          </div>
          <Button type="submit" variant="secondary" loading={update.isPending}>
            Save
          </Button>
        </form>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">{me.data.email}</span>
          <ThemeToggle />
          <Button variant="danger" onClick={logout}>
            Log out
          </Button>
        </div>
      </Card>
      <ProfileForm
        initial={me.data.profile}
        submitLabel="Update my targets"
        onSaved={() => success("Targets updated")}
      />
    </div>
  )
}
