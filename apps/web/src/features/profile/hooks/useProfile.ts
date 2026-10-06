"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query"
import { useAuthStore } from "@/stores/auth-store"
import type { Profile, User } from "@/types"
import { getMe, saveProfile, updateMe } from "../api"

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser)
  const cached = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const u = await getMe()
      setUser(u)
      return u
    },
    initialData: cached ?? undefined,
    initialDataUpdatedAt: 0,
  })
}

export function useSaveProfile() {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: (p: Profile) => saveProfile(p),
    onSuccess: ({ profile, targets }) => {
      const prev = useAuthStore.getState().user
      if (prev) {
        const next: User = { ...prev, profile, targets }
        setUser(next)
        qc.setQueryData(queryKeys.me, next)
      }
      qc.invalidateQueries({ queryKey: queryKeys.mealPlans.all })
      qc.invalidateQueries({ queryKey: queryKeys.tracking.today })
    },
  })
}

export function useUpdateMe() {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (u) => {
      setUser(u)
      qc.setQueryData(queryKeys.me, u)
    },
  })
}
