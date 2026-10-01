import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PassportStrategy } from "@nestjs/passport"
import type { Request } from "express"
import { ExtractJwt, Strategy } from "passport-jwt"
import type { AppConfig } from "../../config/configuration"
import type { RefreshTokenPayload, RefreshUser } from "../auth.types"
import { REFRESH_COOKIE } from "../utils/auth-cookies"

/** Verifies the refresh cookie's signature; AuthService checks it's the current one. */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh"
) {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.[REFRESH_COOKIE] ?? null,
      ]),
      secretOrKey: config.get("jwt", { infer: true }).refresh.secret,
      algorithms: ["HS256"],
      passReqToCallback: true,
    })
  }

  validate(req: Request, payload: RefreshTokenPayload): RefreshUser {
    return {
      userId: payload.sub,
      refreshToken: req.cookies[REFRESH_COOKIE] as string,
    }
  }
}
