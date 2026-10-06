import Link from "next/link"
import { PublicShell } from "@/components/layout/AppShell"
import { EmptyState, buttonClasses } from "@/components/ui"

export default function NotFound() {
  return (
    <PublicShell>
      <EmptyState
        icon="🍽️"
        title="This plate is empty"
        description="We couldn't find that page."
        action={
          <Link href="/" className={buttonClasses("secondary")}>
            Back home
          </Link>
        }
      />
    </PublicShell>
  )
}
