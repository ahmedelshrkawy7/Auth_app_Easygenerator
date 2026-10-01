import { validateEnv } from "./env.validation"

/** Typed config built from validated env. Read it with ConfigService<AppConfig, true>. */
export function configuration() {
  const env = validateEnv(process.env)
  const isProduction = env.NODE_ENV === "production"

  return {
    nodeEnv: env.NODE_ENV,
    isProduction,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    mongoUri: env.MONGO_URI,
    corsOrigin: env.CORS_ORIGIN,
    trustProxy: env.TRUST_PROXY,
    swaggerEnabled: env.SWAGGER_ENABLED ?? !isProduction,
    throttle: { authLimit: env.THROTTLE_AUTH_LIMIT },
    jwt: {
      access: {
        secret: env.JWT_ACCESS_SECRET,
        ttlSeconds: env.JWT_ACCESS_TTL_SECONDS,
      },
      refresh: {
        secret: env.JWT_REFRESH_SECRET,
        ttlSeconds: env.JWT_REFRESH_TTL_SECONDS,
      },
    },
    // Secure (HTTPS-only) cookies by default in production.
    cookies: { secure: env.COOKIE_SECURE ?? isProduction },
  }
}

export type AppConfig = ReturnType<typeof configuration>
