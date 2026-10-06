import { z } from "zod"

export const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email")
export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "That's a bit long")
export const name = z.string().trim().min(1, "Tell us what to call you").max(60)

/** Number field from a form input (string or number), with friendly bounds. */
export const boundedNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number({ message: `${label} must be a number` })
    .refine((n) => Number.isFinite(n), `${label} must be a number`)
    .refine(
      (n) => n >= min && n <= max,
      `${label} should be between ${min} and ${max}`,
    )

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
export const servings = z.coerce
  .number()
  .positive("Servings must be more than 0")
  .max(20, "That's a lot of servings")
