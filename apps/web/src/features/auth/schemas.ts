import { z } from "zod"
import { email, name, password } from "@/lib/validation"

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
})
export const registerSchema = z.object({ name, email, password })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
