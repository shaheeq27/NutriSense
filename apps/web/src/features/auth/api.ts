import { authEndpoints } from "@/lib/api"
import type { LoginInput, RegisterInput } from "./schemas"

export const login = (input: LoginInput) => authEndpoints.login(input)
export const register = (input: RegisterInput) => authEndpoints.register(input)
