import { randomUUID } from "node:crypto"
import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { MongooseModule } from "@nestjs/mongoose"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { LoggerModule } from "nestjs-pino"
import { AuthModule } from "./auth/auth.module"
import { isAuthThrottled } from "./common/decorators/auth-throttle.decorator"
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter"
import { configuration, type AppConfig } from "./config/configuration"
import { HealthModule } from "./health/health.module"
import { UsersModule } from "./users/users.module"

const MINUTE = 60_000

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        pinoHttp: {
          level: config.get("logLevel", { infer: true }),
          // Reuse an incoming request id (e.g. from nginx) or create one,
          // and echo it back so a user-reported error can be traced.
          genReqId: (req, res) => {
            const incoming = req.headers["x-request-id"]
            const id =
              typeof incoming === "string" && incoming.length <= 128
                ? incoming
                : randomUUID()
            res.setHeader("x-request-id", id)
            return id
          },
          // Log only what's useful for tracing; headers (cookies!) stay out.
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
            res: (res: { statusCode: number }) => ({
              statusCode: res.statusCode,
            }),
          },
          // Defense in depth in case a serializer above is ever loosened.
          redact: {
            paths: [
              "req.headers.cookie",
              "req.headers.authorization",
              'res.headers["set-cookie"]',
              "req.body.password",
            ],
            censor: "[redacted]",
          },
          customLogLevel: (_req, res, err) =>
            err || res.statusCode >= 500
              ? "error"
              : res.statusCode >= 400
                ? "warn"
                : "info",
          autoLogging: {
            ignore: (req) => req.url?.startsWith("/api/health") ?? false,
          },
          transport:
            config.get("nodeEnv", { infer: true }) === "development"
              ? { target: "pino-pretty", options: { singleLine: true } }
              : undefined,
        },
      }),
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get("mongoUri", { infer: true }),
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => [
        { name: "default", ttl: MINUTE, limit: 100 },
        {
          name: "auth",
          ttl: MINUTE,
          limit: config.get("throttle", { infer: true }).authLimit,
          skipIf: (context) => !isAuthThrottled(context),
        },
      ],
    }),

    UsersModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
