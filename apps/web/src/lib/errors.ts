import axios from "axios"

/** Error body returned by the API's global exception filter. */
export type ApiErrorBody = {
  statusCode: number
  message: string | string[]
  error?: string
  path?: string
  timestamp?: string
  requestId?: string
}

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

/**
 * Turns any thrown value into a message that is safe to show the user.
 * `overrides` maps a status code to a message for the current context,
 * e.g. 401 means "Invalid credentials" on sign-in.
 */
export function getErrorMessage(
  error: unknown,
  overrides: Partial<Record<number, string>> = {}
): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return "Something went wrong. Please try again."
  }

  if (!error.response) {
    return "Can't reach the server. Check your connection and try again."
  }

  const { status, data } = error.response
  const override = overrides[status]
  if (override) return override

  if (status === 429)
    return "Too many attempts. Please wait a minute and try again."
  if (status >= 500)
    return "Something went wrong on our side. Please try again."

  const message = Array.isArray(data?.message) ? data.message[0] : data?.message
  return message || "Something went wrong. Please try again."
}
