import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/format"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent"
export type ButtonSize = "sm" | "md" | "lg"

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-strong shadow-[var(--shadow-primary)]",
  accent: "bg-accent text-white hover:brightness-95",
  secondary: "bg-paper text-ink border border-line hover:border-ink/30",
  ghost: "text-ink-soft hover:text-ink hover:bg-sand/60",
  danger: "bg-tomato/10 text-tomato hover:bg-tomato/15",
}
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-7 text-[15px]",
}

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
    variants[variant],
    sizes[size],
    className,
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin"
        />
      )}
      {children}
    </button>
  )
})

export default Button
