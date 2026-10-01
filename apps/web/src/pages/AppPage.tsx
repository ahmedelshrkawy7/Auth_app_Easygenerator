import { LogOutIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { useLogout, useMe } from "@/features/auth/hooks"

export function AppPage() {
  const { data: user } = useMe()
  const logout = useLogout()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">Auth App</span>
        <Button
          variant="outline"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <LogOutIcon data-icon="inline-start" aria-hidden />
          )}
          Log out
        </Button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to the application.
        </h1>
        {user && (
          <p className="text-muted-foreground">
            Signed in as <span className="text-foreground">{user.name}</span> (
            {user.email})
          </p>
        )}
      </main>
    </div>
  )
}
