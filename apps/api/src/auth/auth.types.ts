export type AccessTokenPayload = {
  sub: string
  email: string
}

export type RefreshTokenPayload = {
  sub: string
  jti: string
}

/** What JwtRefreshStrategy puts on req.user. */
export type RefreshUser = {
  userId: string
  refreshToken: string
}
