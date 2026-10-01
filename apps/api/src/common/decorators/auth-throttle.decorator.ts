import { SetMetadata } from "@nestjs/common"
import type { ExecutionContext } from "@nestjs/common"

const AUTH_THROTTLE_KEY = "auth-throttle"

/** Opt a route into the strict "auth" rate limit (THROTTLE_AUTH_LIMIT per minute per IP). */
export const AuthThrottle = () => SetMetadata(AUTH_THROTTLE_KEY, true)

export function isAuthThrottled(context: ExecutionContext): boolean {
  return Reflect.getMetadata(AUTH_THROTTLE_KEY, context.getHandler()) === true
}
