import {
  ConflictException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { JwtService } from "@nestjs/jwt"
import * as argon2 from "argon2"
import { Types } from "mongoose"
import type { AppConfig } from "../config/configuration"
import type { UserRecord } from "../users/schemas/user.schema"
import { EmailTakenError, type UsersService } from "../users/users.service"
import { AuthService, hashToken } from "./auth.service"

const jwtConfig: AppConfig["jwt"] = {
  access: { secret: "a".repeat(32), ttlSeconds: 900 },
  refresh: { secret: "r".repeat(32), ttlSeconds: 604800 },
}

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    _id: new Types.ObjectId(),
    email: "jane@example.com",
    name: "Jane Doe",
    passwordHash: "",
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

afterEach(() => jest.restoreAllMocks())

describe("AuthService", () => {
  let users: jest.Mocked<
    Pick<
      UsersService,
      | "create"
      | "findById"
      | "findByEmailWithPassword"
      | "setRefreshTokenHash"
      | "rotateRefreshTokenHash"
    >
  >
  let jwt: JwtService
  let service: AuthService

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation()
    users = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      setRefreshTokenHash: jest.fn(),
      rotateRefreshTokenHash: jest.fn(),
    }
    jwt = new JwtService()
    const config = {
      get: () => jwtConfig,
    } as unknown as ConfigService<AppConfig, true>
    service = new AuthService(users as unknown as UsersService, jwt, config)
  })

  describe("signUp", () => {
    const dto = {
      email: "jane@example.com",
      name: "Jane Doe",
      password: "Passw0rd!",
    }

    it("stores an argon2id hash, never the password, and starts a session", async () => {
      users.create.mockImplementation(async (input) => makeUser(input))

      const { user, tokens } = await service.signUp(dto)

      const { passwordHash } = users.create.mock.calls[0][0]
      expect(passwordHash).not.toContain(dto.password)
      expect(passwordHash.startsWith("$argon2id$")).toBe(true)
      await expect(argon2.verify(passwordHash, dto.password)).resolves.toBe(
        true
      )
      expect(users.setRefreshTokenHash).toHaveBeenCalledWith(
        user._id.toString(),
        hashToken(tokens.refreshToken)
      )
    })

    it("maps a duplicate email to 409", async () => {
      users.create.mockRejectedValue(new EmailTakenError())

      await expect(service.signUp(dto)).rejects.toBeInstanceOf(
        ConflictException
      )
    })
  })

  describe("signIn", () => {
    it("issues tokens for valid credentials", async () => {
      const user = makeUser({ passwordHash: await argon2.hash("Passw0rd!") })
      users.findByEmailWithPassword.mockResolvedValue(user)

      const { tokens } = await service.signIn({
        email: user.email,
        password: "Passw0rd!",
      })

      const payload = await jwt.verifyAsync(tokens.accessToken, {
        secret: jwtConfig.access.secret,
      })
      expect(payload).toMatchObject({
        sub: user._id.toString(),
        email: user.email,
      })
    })

    it("rejects a wrong password with a generic message", async () => {
      users.findByEmailWithPassword.mockResolvedValue(
        makeUser({ passwordHash: await argon2.hash("Passw0rd!") })
      )

      await expect(
        service.signIn({ email: "jane@example.com", password: "wrong" })
      ).rejects.toThrow(new UnauthorizedException("Invalid credentials"))
    })

    it("rejects an unknown email with the same message", async () => {
      users.findByEmailWithPassword.mockResolvedValue(null)

      await expect(
        service.signIn({ email: "nobody@example.com", password: "Passw0rd!" })
      ).rejects.toThrow(new UnauthorizedException("Invalid credentials"))
    })
  })

  describe("refresh", () => {
    it("rotates the stored hash from the old token to the new one", async () => {
      const user = makeUser()
      users.findById.mockResolvedValue(user)
      users.rotateRefreshTokenHash.mockResolvedValue(true)

      const tokens = await service.refresh(user._id.toString(), "old-token")

      expect(users.rotateRefreshTokenHash).toHaveBeenCalledWith(
        user._id.toString(),
        hashToken("old-token"),
        hashToken(tokens.refreshToken)
      )
      expect(tokens.refreshToken).not.toBe("old-token")
    })

    it("revokes the session when an already-used token is presented", async () => {
      const user = makeUser()
      users.findById.mockResolvedValue(user)
      users.rotateRefreshTokenHash.mockResolvedValue(false)

      await expect(
        service.refresh(user._id.toString(), "reused-token")
      ).rejects.toBeInstanceOf(UnauthorizedException)
      expect(users.setRefreshTokenHash).toHaveBeenCalledWith(
        user._id.toString(),
        null
      )
    })

    it("rejects a token for a deleted user", async () => {
      users.findById.mockResolvedValue(null)

      await expect(
        service.refresh(new Types.ObjectId().toString(), "token")
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })
  })

  describe("logout", () => {
    it("clears the stored hash for a valid refresh token", async () => {
      const userId = new Types.ObjectId().toString()
      const token = await jwt.signAsync(
        { sub: userId },
        { secret: jwtConfig.refresh.secret, expiresIn: 60, jwtid: "x" }
      )

      await service.logout(token)

      expect(users.rotateRefreshTokenHash).toHaveBeenCalledWith(
        userId,
        hashToken(token),
        null
      )
    })

    it("ignores missing or invalid tokens", async () => {
      await service.logout(undefined)
      await service.logout("garbage")

      expect(users.rotateRefreshTokenHash).not.toHaveBeenCalled()
    })
  })
})
