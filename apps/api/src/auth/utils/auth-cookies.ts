import type { CookieOptions, Response } from "express"

export const ACCESS_COOKIE = "access_token"
export const REFRESH_COOKIE = "refresh_token"

// The refresh token is only sent to /api/auth/*, never to other endpoints.
const ACCESS_PATH = "/api"
const REFRESH_PATH = "/api/auth"

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthCookieConfig = {
  secure: boolean
  accessTtlSeconds: number
  refreshTtlSeconds: number
}

function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: "lax", secure }
}

/** The only place auth cookies are written, so their flags can't drift. */
export function setAuthCookies(
  res: Response,
  tokens: AuthTokens,
  config: AuthCookieConfig
) {
  const base = baseOptions(config.secure)
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    path: ACCESS_PATH,
    maxAge: config.accessTtlSeconds * 1000,
  })
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: config.refreshTtlSeconds * 1000,
  })
}

export function clearAuthCookies(res: Response, secure: boolean) {
  const base = baseOptions(secure)
  res.clearCookie(ACCESS_COOKIE, { ...base, path: ACCESS_PATH })
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH })
}
