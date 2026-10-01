import { createHash, randomUUID } from "node:crypto"
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtService } from "@nestjs/jwt"
import * as argon2 from "argon2"
import type { AppConfig } from "../config/configuration"
import type { UserRecord } from "../users/schemas/user.schema"
import { EmailTakenError, UsersService } from "../users/users.service"
import type { AccessTokenPayload, RefreshTokenPayload } from "./auth.types"
import type { SignInDto } from "./dto/signin.dto"
import type { SignUpDto } from "./dto/signup.dto"
import type { AuthTokens } from "./utils/auth-cookies"

export type AuthResult = {
  user: UserRecord
  tokens: AuthTokens
}

// OWASP-recommended argon2id baseline (19 MiB, 2 iterations).
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} satisfies argon2.HashOptions

/**
 * Refresh tokens are random, high-entropy JWTs, so a fast SHA-256 is enough
 * to store them (argon2 is for low-entropy passwords). It also lets Mongo
 * compare-and-swap the hash atomically during rotation.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private dummyHash?: Promise<string>

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResult> {
    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS)
    try {
      const user = await this.users.create({
        email: dto.email,
        name: dto.name,
        passwordHash,
      })
      return { user, tokens: await this.startSession(user) }
    } catch (error) {
      if (error instanceof EmailTakenError) {
        throw new ConflictException(error.message)
      }
      throw error
    }
  }

  async signIn(dto: SignInDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(dto.email)
    // Hash even for unknown emails so response time doesn't reveal which exist.
    const hash = user?.passwordHash ?? (await this.getDummyHash())
    const valid = await argon2.verify(hash, dto.password).catch(() => false)
    if (!user || !valid) {
      throw new UnauthorizedException("Invalid credentials")
    }
    return { user, tokens: await this.startSession(user) }
  }

  /** Rotates the refresh token. Reusing an old one revokes the session. */
  async refresh(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.users.findById(userId)
    if (!user) throw new UnauthorizedException()

    const tokens = await this.signTokens(user)
    const rotated = await this.users.rotateRefreshTokenHash(
      userId,
      hashToken(refreshToken),
      hashToken(tokens.refreshToken)
    )
    if (!rotated) {
      // Correctly signed but no longer current: it was already used, so it
      // may have been stolen. Sign the user out everywhere.
      await this.users.setRefreshTokenHash(userId, null)
      this.logger.warn(
        { userId },
        "Refresh token reuse detected; session revoked"
      )
      throw new UnauthorizedException("Session expired")
    }
    return tokens
  }

  /** Revokes the session if the token is the current one. Never throws. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: this.jwtConfig.refresh.secret, algorithms: ["HS256"] }
      )
      await this.users.rotateRefreshTokenHash(
        payload.sub,
        hashToken(refreshToken),
        null
      )
    } catch {
      // Invalid or expired token: nothing to revoke.
    }
  }

  private get jwtConfig() {
    return this.config.get("jwt", { infer: true })
  }

  private async startSession(user: UserRecord): Promise<AuthTokens> {
    const tokens = await this.signTokens(user)
    await this.users.setRefreshTokenHash(
      user._id.toString(),
      hashToken(tokens.refreshToken)
    )
    return tokens
  }

  private async signTokens(user: UserRecord): Promise<AuthTokens> {
    const { access, refresh } = this.jwtConfig
    const sub = user._id.toString()
    const accessPayload: AccessTokenPayload = { sub, email: user.email }
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: access.secret,
        expiresIn: access.ttlSeconds,
      }),
      this.jwt.signAsync(
        { sub },
        {
          secret: refresh.secret,
          expiresIn: refresh.ttlSeconds,
          jwtid: randomUUID(), // makes every refresh token unique
        }
      ),
    ])
    return { accessToken, refreshToken }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash(randomUUID(), ARGON2_OPTIONS)
    return this.dummyHash
  }
}
