import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import { UsersModule } from "../users/users.module"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy"
import { JwtStrategy } from "./strategies/jwt.strategy"

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Secrets and TTLs are passed per call: access and refresh tokens differ.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
