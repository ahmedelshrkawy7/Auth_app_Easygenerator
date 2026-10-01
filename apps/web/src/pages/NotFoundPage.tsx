import { Link } from "react-router"
import { buttonVariants } from "@workspace/ui/components/button"

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        The page you are looking for doesn&apos;t exist.
      </p>
      <Link to="/" className={buttonVariants({ variant: "outline" })}>
        Go home
      </Link>
    </main>
  )
}
