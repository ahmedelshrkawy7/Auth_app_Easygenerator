import { z } from "zod"

const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1")

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  MONGO_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, "must be a MongoDB URI"),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
  JWT_REFRESH_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(7 * 24 * 60 * 60),

  CORS_ORIGIN: z.url(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  THROTTLE_AUTH_LIMIT: z.coerce.number().int().positive().default(5),
  SWAGGER_ENABLED: booleanString.optional(),
  COOKIE_SECURE: booleanString.optional(),
})

export type Env = z.infer<typeof envSchema>

/** Fails fast at boot with every invalid or missing variable listed. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema
    .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
      message: "must differ from JWT_ACCESS_SECRET",
      path: ["JWT_REFRESH_SECRET"],
    })
    .safeParse(raw)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return result.data
}
