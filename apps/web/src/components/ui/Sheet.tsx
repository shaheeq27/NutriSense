"use client"
/** "sheet" slides from bottom on mobile; "dialog" is always centered. */

/** Modal built on <dialog> for native focus trapping, Esc handling and top-layer stacking. */
import { useEffect, useId, useRef, type ReactNode } from "react"
import { cn } from "@/lib/format"

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  variant?: "sheet" | "dialog"
}
export default function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  variant = "sheet",
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal?.()
    if (!open && d.open) d.close?.()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        "m-0 max-w-none max-h-none bg-transparent p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm",
        "fixed inset-x-0 bottom-0 top-auto w-full sm:inset-0 sm:m-auto sm:w-[min(32rem,calc(100%-2rem))] sm:h-fit",
        variant === "dialog" &&
          "inset-0 m-auto w-[min(28rem,calc(100%-2rem))] h-fit",
      )}
    >
      {open && (
        <div className="animate-rise bg-paper border border-line rounded-t-[28px] sm:rounded-[28px] p-6 pb-8 max-h-[85vh] overflow-y-auto shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 id={titleId} className="font-display text-2xl display-soft">
                {title}
              </h2>
              {description && (
                <p id={descId} className="text-sm text-ink-soft mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="size-9 rounded-full grid place-items-center text-ink-soft hover:bg-sand cursor-pointer"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
