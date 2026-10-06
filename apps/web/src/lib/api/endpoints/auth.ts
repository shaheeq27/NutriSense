import { api } from "../client"
import type { AuthResponse } from "@/types"

export const authEndpoints = {
  register: (body: { email: string password: string name: string }) =>
    api.post<AuthResponse>("/auth/register", body, { anonymous: true }),
  login: (body: { email: string password: string }) =>
    api.post<AuthResponse>("/auth/login", body, { anonymous: true }),
}
