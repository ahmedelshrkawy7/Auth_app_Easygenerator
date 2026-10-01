import { CircleAlertIcon } from "lucide-react"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"

export function ServerError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
