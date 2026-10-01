import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PassportStrategy } from "@nestjs/passport"
import type { Request } from "express"
import { ExtractJwt, Strategy } from "passport-jwt"
import type { AuthUser } from "../../common/decorators/current-user.decorator"
import type { AppConfig } from "../../config/configuration"
import type { AccessTokenPayload } from "../auth.types"
import { ACCESS_COOKIE } from "../utils/auth-cookies"

/** Stateless check of the access cookie: no database hit per request. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies?.[ACCESS_COOKIE] ?? null,
      ]),
      secretOrKey: config.get("jwt", { infer: true }).access.secret,
      algorithms: ["HS256"],
    })
  }

  validate(payload: AccessTokenPayload): AuthUser {
    return { userId: payload.sub, email: payload.email }
  }
}
