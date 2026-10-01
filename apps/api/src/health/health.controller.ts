import { Controller, Get } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from "@nestjs/terminus"
import { SkipThrottle } from "@nestjs/throttler"

@ApiTags("health")
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongo: MongooseHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.mongo.pingCheck("mongodb")])
  }
}
