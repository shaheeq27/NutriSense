import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/format"

export default function Logo({
  href = "/",
  size = "md",
  className,
}: {
  href?: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const s = {
    sm: { tile: "size-8", img: 28, text: "text-lg" },
    md: { tile: "size-10", img: 36, text: "text-[22px]" },
    lg: { tile: "size-14", img: 52, text: "text-3xl" },
  }[size]
  return (
    <Link
      href={href}
      aria-label="NutriSense home"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span
        className={cn(
          "grid place-items-center rounded-xl",
          s.tile,
          "dark:bg-[#fff8ec]",
        )}
      >
        <Image
          src="/brand/nutrisense-mark.png"
          alt=""
          width={s.img}
          height={s.img}
          className="object-contain"
          priority
        />
      </span>
      <span
        className={cn(
          "font-brand font-bold tracking-[-.02em] leading-none",
          s.text,
        )}
      >
        <span className="text-primary">Nutri</span>
        <span className="brand-sense">Sense</span>
      </span>
    </Link>
  )
}
