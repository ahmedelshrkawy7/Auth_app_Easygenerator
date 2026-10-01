import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger"
import type { Request, Response } from "express"
import { AuthThrottle } from "../common/decorators/auth-throttle.decorator"
import type { AppConfig } from "../config/configuration"
import { UserResponseDto } from "../users/dto/user-response.dto"
import { AuthService } from "./auth.service"
import type { RefreshUser } from "./auth.types"
import { SignInDto } from "./dto/signin.dto"
import { SignUpDto } from "./dto/signup.dto"
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard"
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
  type AuthTokens,
} from "./utils/auth-cookies"

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppConfig, true>
  ) {}

  @Post("signup")
  @AuthThrottle()
  @ApiCreatedResponse({
    type: UserResponseDto,
    description: "Sets auth cookies",
  })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiConflictResponse({ description: "Email already registered" })
  @ApiTooManyRequestsResponse()
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<UserResponseDto> {
    const { user, tokens } = await this.auth.signUp(dto)
    this.setCookies(res, tokens)
    return UserResponseDto.from(user)
  }

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  @AuthThrottle()
  @ApiOkResponse({ type: UserResponseDto, description: "Sets auth cookies" })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  @ApiTooManyRequestsResponse()
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<UserResponseDto> {
    const { user, tokens } = await this.auth.signIn(dto)
    this.setCookies(res, tokens)
    return UserResponseDto.from(user)
  }

  @Post("refresh")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtRefreshGuard)
  @ApiNoContentResponse({ description: "Rotates both auth cookies" })
  @ApiUnauthorizedResponse({
    description: "Missing, expired or reused refresh token",
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    const { userId, refreshToken } = req.user as RefreshUser
    try {
      this.setCookies(res, await this.auth.refresh(userId, refreshToken))
    } catch (error) {
      clearAuthCookies(res, this.config.get("cookies", { infer: true }).secure)
      throw error
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: "Revokes the session and clears cookies",
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE])
    clearAuthCookies(res, this.config.get("cookies", { infer: true }).secure)
  }

  private setCookies(res: Response, tokens: AuthTokens) {
    const jwt = this.config.get("jwt", { infer: true })
    setAuthCookies(res, tokens, {
      secure: this.config.get("cookies", { infer: true }).secure,
      accessTtlSeconds: jwt.access.ttlSeconds,
      refreshTtlSeconds: jwt.refresh.ttlSeconds,
    })
  }
}
