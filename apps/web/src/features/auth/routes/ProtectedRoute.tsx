import { Navigate, Outlet, useLocation } from "react-router"
import { FullPageError, FullPageSpinner } from "@/components/page-state"
import { useMe } from "../hooks"

export function ProtectedRoute() {
  const { data: user, isPending, isError, refetch } = useMe()
  const location = useLocation()

  if (isPending) return <FullPageSpinner />
  if (isError) {
    return (
      <FullPageError
        message="We couldn't load your session."
        onRetry={() => void refetch()}
      />
    )
  }
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }
  return <Outlet />
}
