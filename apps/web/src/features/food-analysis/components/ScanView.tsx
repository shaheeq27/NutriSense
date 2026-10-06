"use client"
// eslint-disable-next-line @next/next/no-img-element
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Title,
} from "@/components/ui"
import { errorMessage } from "@/lib/api"
import { useIdentify } from "../hooks/useFoods"
import { imageFileSchema } from "../schemas"
import FoodRow from "./FoodRow"

export default function ScanView() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const identify = useIdentify()

  useEffect(
    () => () => void (preview && URL.revokeObjectURL(preview)),
    [preview],
  )

  const onFile = (file?: File) => {
    if (!file) return
    const parsed = imageFileSchema.safeParse(file)
    if (!parsed.success) {
      setFileError(parsed.error.issues[0]?.message ?? "Invalid image")
      return
    }
    setFileError(null)
    setPreview(URL.createObjectURL(file))
    identify.mutate(file)
  }

  const reset = () => {
    setPreview(null)
    identify.reset()
    inputRef.current?.click()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/analyze" className="text-sm text-ink-soft hover:text-ink">
        ← Analyzer
      </Link>
      <Eyebrow className="mt-4">Identify your food</Eyebrow>
      <Title className="mt-3">Show us your plate.</Title>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Upload a food photo"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <Card className="mt-8 p-3 overflow-hidden">
        <div className="relative aspect-[4/3] rounded-[22px] bg-sand grid place-items-center overflow-hidden">
          {preview ? (
            <img
              src={preview}
              alt="Your uploaded meal"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="text-center px-6">
              <span aria-hidden className="text-5xl">
                🍽️
              </span>
              <p className="mt-3 text-ink-soft">
                Place the food clearly inside the frame.
              </p>
              <Button
                className="mt-5"
                onClick={() => inputRef.current?.click()}
              >
                Take or upload a photo
              </Button>
            </div>
          )}
          {identify.isPending && (
            <>
              <span
                aria-hidden
                className="absolute inset-x-6 h-0.5 bg-secondary shadow-[0_0_20px_var(--color-secondary)] animate-scan"
              />
              <span
                role="status"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 text-paper px-4 py-2 text-sm"
              >
                Identifying your meal…
              </span>
            </>
          )}
        </div>
      </Card>

      {fileError && (
        <p role="alert" className="mt-4 text-tomato text-sm">
          {fileError}
        </p>
      )}

      <div className="mt-6" aria-live="polite">
        {identify.isError && (
          <EmptyState
            tone="error"
            icon="📷"
            title="We couldn't identify this image"
            description={errorMessage(identify.error)}
            action={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={reset}>
                  Try another photo
                </Button>
                <Link
                  href="/analyze"
                  className="h-11 px-5 grid place-items-center rounded-full font-semibold text-sm text-ink-soft hover:text-ink"
                >
                  Search manually
                </Link>
              </div>
            }
          />
        )}
        {identify.data &&
          (identify.data.candidates.length === 0 ? (
            <EmptyState
              icon="🤔"
              title="Nothing we recognise"
              description="Try better lighting, or search manually."
              action={
                <Button variant="secondary" onClick={reset}>
                  Try another photo
                </Button>
              }
            />
          ) : (
            <Card className="p-4 animate-rise">
              <h2 className="font-display display-soft text-2xl px-3 pt-2">
                We think this is your food
              </h2>
              <p className="px-3 text-sm text-ink-soft">
                Pick the closest match to see its nutrition.
              </p>
              <ul className="mt-3 divide-y divide-line/60">
                {identify.data.candidates.map((c) => (
                  <li key={c.food.id} className="relative">
                    <FoodRow food={c.food} />
                    <Badge
                      tone={c.confidence > 0.7 ? "green" : "neutral"}
                      className="absolute right-20 top-1/2 -translate-y-1/2 hidden sm:inline-flex"
                    >
                      {Math.round(c.confidence * 100)}% match
                    </Badge>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" className="mt-2" onClick={reset}>
                ✎ Try another photo
              </Button>
            </Card>
          ))}
      </div>
    </div>
  )
}
