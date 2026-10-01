import { ConfigService } from "@nestjs/config"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { Logger } from "nestjs-pino"
import { AppModule } from "./app.module"
import { configureApp } from "./app.setup"
import type { AppConfig } from "./config/configuration"

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })
  app.useLogger(app.get(Logger))
  configureApp(app)

  const config = app.get<ConfigService<AppConfig, true>>(ConfigService)
  const port = config.get("port", { infer: true })
  await app.listen(port)
  app.get(Logger).log(`API listening on http://localhost:${port}/api`)
}

void bootstrap()
