import { z } from "zod"

export const describeSchema = z.object({
  text: z
    .string()
    .trim()
    .min(3, "Tell us a bit more — e.g. “2 rotis and dal”")
    .max(500, "Keep it under 500 characters"),
})
export type DescribeInput = z.infer<typeof describeSchema>

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const imageFileSchema = z
  .instanceof(Blob)
  .refine((f) => f.type.startsWith("image/"), "Please choose an image file")
  .refine(
    (f) => f.size <= MAX_IMAGE_BYTES,
    "That image is over 8 MB — try a smaller one",
  )
