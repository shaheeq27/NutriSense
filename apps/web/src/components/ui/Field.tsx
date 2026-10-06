import { useId, type ReactElement, cloneElement } from "react"

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: ReactElement<{
    id?: string
    "aria-describedby"?: string
    invalid?: boolean
  }>
}

/** Wires a label, hint and error message to a single form control. */
export default function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        invalid: !!error,
      })}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-sm text-tomato">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
