import { defineConfig, devices } from "@playwright/test"

// Own ports, so a running dev stack (3000/5173/27017) is never reused by mistake.
const MONGO_PORT = 27018
const API_PORT = 3100
const WEB_PORT = 4173
const WEB_URL = `http://localhost:${WEB_PORT}`

const isCI = Boolean(process.env.CI)

/**
 * Full-stack smoke tests: a real browser against the built web app,
 * the built API and a real (in-memory) MongoDB. No mocks.
 * Validation edge cases live in the fast unit/integration tests.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Started in order: database, then API, then the web app.
  webServer: [
    {
      command: "node scripts/mongo.cjs",
      port: MONGO_PORT,
      env: { E2E_MONGO_PORT: String(MONGO_PORT) },
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run build -w api && npm run start -w api",
      cwd: "..",
      url: `http://localhost:${API_PORT}/api/health`,
      env: {
        NODE_ENV: "test",
        PORT: String(API_PORT),
        LOG_LEVEL: "warn",
        MONGO_URI: `mongodb://127.0.0.1:${MONGO_PORT}/auth_app_e2e`,
        JWT_ACCESS_SECRET: "e2e-access-secret-that-is-long-enough!!",
        JWT_REFRESH_SECRET: "e2e-refresh-secret-that-is-long-enough!",
        CORS_ORIGIN: WEB_URL,
        THROTTLE_AUTH_LIMIT: "1000",
        COOKIE_SECURE: "false",
        SWAGGER_ENABLED: "false",
      },
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: `npm run build -w web && npm run preview -w web -- --port ${WEB_PORT} --strictPort`,
      cwd: "..",
      url: WEB_URL,
      env: {
        VITE_API_BASE_URL: "/api",
        VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}`,
      },
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
})
