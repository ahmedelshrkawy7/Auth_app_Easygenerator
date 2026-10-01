import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common"
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator"
import { UserResponseDto } from "./dto/user-response.dto"
import { UsersService } from "./users.service"

@ApiTags("users")
@ApiCookieAuth("access_token")
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or expired access token" })
  async me(@CurrentUser() auth: AuthUser): Promise<UserResponseDto> {
    const user = await this.users.findById(auth.userId)
    // A valid token for a deleted user is treated as signed out.
    if (!user) throw new UnauthorizedException()
    return UserResponseDto.from(user)
  }
}
