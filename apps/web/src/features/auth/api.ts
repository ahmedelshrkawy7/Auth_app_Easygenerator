import { http } from "@/lib/http"
import { getErrorStatus } from "@/lib/errors"
import type { SignInInput, SignUpInput } from "./schemas"

export type User = {
  id: string
  email: string
  name: string
}

// Auth endpoints never trigger a refresh: a 401 here means bad credentials.
const noRefresh = { skipAuthRefresh: true }

export async function signUp(input: SignUpInput): Promise<User> {
  const { data } = await http.post<User>("/auth/signup", input, noRefresh)
  return data
}

export async function signIn(input: SignInInput): Promise<User> {
  const { data } = await http.post<User>("/auth/signin", input, noRefresh)
  return data
}

export async function logout(): Promise<void> {
  await http.post("/auth/logout", undefined, noRefresh)
}

/** The current user, or null when not signed in (after a refresh attempt). */
export async function getMe(): Promise<User | null> {
  try {
    const { data } = await http.get<User>("/users/me")
    return data
  } catch (error) {
    if (getErrorStatus(error) === 401) return null
    throw error
  }
}
