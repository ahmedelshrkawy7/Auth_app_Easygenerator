import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import type { Request, Response } from "express"

export type ErrorResponseBody = {
  statusCode: number
  message: string | string[]
  error: string
  path: string
  timestamp: string
  requestId?: string
}

/** One error shape for every failure; internals of unexpected errors never leak. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request & { id?: string }>()
    const res = ctx.getResponse<Response>()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = "Internal server error"
    let error = "Internal Server Error"

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === "string") {
        message = body
        error = exception.name
      } else {
        const b = body as { message?: string | string[]; error?: string }
        message = b.message ?? exception.message
        error = b.error ?? exception.name
      }
    } else {
      this.logger.error(exception)
    }

    const payload: ErrorResponseBody = {
      statusCode,
      message,
      error,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    }
    res.status(statusCode).json(payload)
  }
}
