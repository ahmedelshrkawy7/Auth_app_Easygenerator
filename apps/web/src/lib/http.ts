import axios, { type AxiosError } from "axios"

declare module "axios" {
  interface AxiosRequestConfig {
    /** Don't try a token refresh when this request returns 401. */
    skipAuthRefresh?: boolean
    /** Set internally once a request has been retried after a refresh. */
    _retried?: boolean
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

let refreshPromise: Promise<void> | null = null
let onSessionExpired: () => void = () => {}

/** Called once a refresh fails, i.e. the user must sign in again. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

/** One refresh call shared by every request that got a 401 meanwhile. */
function refreshSession() {
  refreshPromise ??= http
    .post("/auth/refresh", undefined, { skipAuthRefresh: true })
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config
  if (
    error.response?.status !== 401 ||
    !config ||
    config.skipAuthRefresh ||
    config._retried
  ) {
    throw error
  }

  try {
    await refreshSession()
  } catch {
    onSessionExpired()
    throw error
  }

  config._retried = true
  return http(config)
})
