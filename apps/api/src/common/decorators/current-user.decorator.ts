import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import type { Request } from "express"

/** What JwtStrategy puts on req.user after verifying the access cookie. */
export type AuthUser = {
  userId: string
  email: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request>().user as AuthUser
)
