import { Navigate, Outlet, useLocation, type Location } from "react-router"
import { FullPageSpinner } from "@/components/page-state"
import { useMe } from "../hooks"

/** Sign-in / sign-up: send signed-in users back to where they came from. */
export function PublicOnlyRoute() {
  const { data: user, isPending } = useMe()
  const from = (useLocation().state as { from?: Location } | null)?.from

  if (isPending) return <FullPageSpinner />
  if (user) return <Navigate to={from?.pathname ?? "/"} replace />
  return <Outlet />
}
