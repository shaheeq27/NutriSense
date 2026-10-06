"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import type { AuthResponse } from "@/types"
import { login, register } from "../api"

function useSession() {
  const setSession = useAuthStore((s) => s.setSession)
  const router = useRouter()
  const qc = useQueryClient()
  return (res: AuthResponse, next?: string) => {
    qc.clear()
    setSession(res.access_token, res.user)
    router.replace(next ?? (res.user.profile ? "/dashboard" : "/onboarding"))
  }
}

export function useLogin(next?: string) {
  const onSession = useSession()
  return useMutation({
    mutationFn: login,
    onSuccess: (res) => onSession(res, next),
  })
}

export function useRegister() {
  const onSession = useSession()
  return useMutation({
    mutationFn: register,
    onSuccess: (res) => onSession(res, "/onboarding"),
  })
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const qc = useQueryClient()
  const router = useRouter()
  return () => {
    logout()
    qc.clear()
    router.replace("/")
  }
}
