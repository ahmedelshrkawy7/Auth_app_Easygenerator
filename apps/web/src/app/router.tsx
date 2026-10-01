import { lazy, Suspense } from "react"
import { createBrowserRouter, Outlet, useRouteError } from "react-router"
import { FullPageError, FullPageSpinner } from "@/components/page-state"
import { ProtectedRoute } from "@/features/auth/routes/ProtectedRoute"
import { PublicOnlyRoute } from "@/features/auth/routes/PublicOnlyRoute"

const AppPage = lazy(() =>
  import("@/pages/AppPage").then((m) => ({ default: m.AppPage }))
)
const SignInPage = lazy(() =>
  import("@/pages/SignInPage").then((m) => ({ default: m.SignInPage }))
)
const SignUpPage = lazy(() =>
  import("@/pages/SignUpPage").then((m) => ({ default: m.SignUpPage }))
)
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
)

function RootLayout() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Outlet />
    </Suspense>
  )
}

function RouteError() {
  console.error(useRouteError())
  return (
    <FullPageError
      message="Something went wrong."
      onRetry={() => window.location.reload()}
    />
  )
}

export const routes = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [{ index: true, element: <AppPage /> }],
      },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "signin", element: <SignInPage /> },
          { path: "signup", element: <SignUpPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
