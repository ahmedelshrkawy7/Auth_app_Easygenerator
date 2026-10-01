import { ValidationPipe, type INestApplication } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import type { AppConfig } from "./config/configuration"

/** Shared by main.ts and the e2e tests, so tests run the real HTTP setup. */
export function configureApp(app: NestExpressApplication) {
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService)

  // Behind nginx: trust X-Forwarded-For so rate limits see the real client IP.
  app.set("trust proxy", config.get("trustProxy", { infer: true }))
  app.use(
    helmet({
      // TLS is terminated in front of the app; don't force https sub-requests
      // (it breaks Swagger UI when served over plain http in local Docker).
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    })
  )
  app.use(cookieParser())
  app.setGlobalPrefix("api")
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )
  app.enableCors({
    origin: config.get("corsOrigin", { infer: true }),
    credentials: true,
  })
  app.enableShutdownHooks()

  if (config.get("swaggerEnabled", { infer: true })) setupSwagger(app)
}

function setupSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Auth API")
      .setDescription(
        "Sign-up / sign-in with httpOnly cookie sessions (access + rotating refresh JWT)."
      )
      .setVersion("1.0")
      .addCookieAuth("access_token")
      .build()
  )
  SwaggerModule.setup("api/docs", app, document)
}
