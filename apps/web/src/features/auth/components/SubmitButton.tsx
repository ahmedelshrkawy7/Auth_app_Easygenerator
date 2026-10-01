import type { ReactNode } from "react"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}
