import { QueryClient } from "@tanstack/react-query"
import { clearSession } from "@/features/auth/hooks"
import { getErrorStatus } from "@/lib/errors"
import { setSessionExpiredHandler } from "@/lib/http"

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // Retry network and 5xx errors only; a 4xx won't fix itself.
        retry: (failureCount, error) => {
          const status = getErrorStatus(error)
          return failureCount < 2 && (status === undefined || status >= 500)
        },
      },
    },
  })
}

export const queryClient = createQueryClient()

// Refresh failed: the user must sign in again. ProtectedRoute redirects.
setSessionExpiredHandler(() => clearSession(queryClient))
