import { api } from "../client"
import type { Profile, Targets, User } from "@/types"

export const userEndpoints = {
  me: () => api.get<User>("/users/me"),
  update: (body: Partial<Pick<User, "name" | "email">>) =>
    api.patch<User>("/users/me", body),
  saveProfile: (body: Profile) =>
    api.put<{ profile: Profile; targets: Targets }>("/users/me/profile", body),
}
