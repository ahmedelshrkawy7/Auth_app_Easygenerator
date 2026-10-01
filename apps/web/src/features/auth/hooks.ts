import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { getMe, logout, signIn, signUp, type User } from "./api"

export const meQueryKey = ["me"] as const

/**
 * Mark the user as signed out and drop every other cached query.
 * `me` is set to null rather than removed, so mounted route guards
 * (still subscribed to it) re-render and redirect to /signin.
 */
export function clearSession(queryClient: QueryClient) {
  queryClient.setQueryData(meQueryKey, null)
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== meQueryKey[0],
  })
}

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
  })
}

// On success the route guards see the user in the cache and redirect,
// so the forms don't need to navigate themselves.
export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: signIn,
    onSuccess: (user) => queryClient.setQueryData<User>(meQueryKey, user),
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: signUp,
    onSuccess: (user) => queryClient.setQueryData<User>(meQueryKey, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    // Clear local state even if the request failed: the user asked to leave.
    onSettled: () => clearSession(queryClient),
  })
}
