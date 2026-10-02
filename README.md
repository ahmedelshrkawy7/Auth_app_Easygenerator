# Auth App

A full-stack sign-up / sign-in module. Users create an account, sign in, and land on a protected page that says **"Welcome to the application."**

- **Backend:** NestJS 11, MongoDB (Mongoose), Passport JWT, argon2id
- **Frontend:** React 19, TypeScript, Vite, React Router, TanStack Query, react-hook-form + zod, Tailwind CSS + shadcn/ui
- **Tooling:** npm workspaces + Turborepo, ESLint, Prettier, Jest, Vitest + MSW, Playwright, Docker, GitHub Actions

## Contents

- [Features](#features)
- [Quick start (Docker)](#quick-start-docker)
- [Local development](#local-development)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [API](#api)
- [Project structure](#project-structure)
- [Security decisions](#security-decisions)
- [Testing](#testing)
- [Trade-offs and future work](#trade-offs-and-future-work)

## Features

**Sign up** with:

- a valid email address
- a name of at least 3 characters
- a password of at least 8 characters with at least one letter, one number and one special character

**Sign in** with email and password. Wrong passwords and unknown emails get the same "Invalid credentials" message.

**Protected page** (`/`) shows "Welcome to the application." with the user's name and a **Log out** button. Signed-out users are sent to `/signin`; signed-in users who open `/signin` or `/signup` are sent to `/`.

The UI checks every rule as you type (with a live password checklist), shows server errors such as "Email already registered", and disables the submit button while a request is in flight. The session survives a page reload and renews itself silently when the access token expires.

## Quick start (Docker)

Requires Docker.

```bash
cp .env.example .env
# Put two different random secrets in .env, e.g.:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
docker compose up --build
```

Open <http://localhost:8080>. Swagger UI is at <http://localhost:8080/api/docs>.

Compose starts three containers:

| Service | What it is                                                               |
| ------- | ------------------------------------------------------------------------ |
| `mongo` | MongoDB 7 with a persistent volume (bound to `127.0.0.1:27017` only)     |
| `api`   | The NestJS API, built in a multi-stage image and run as a non-root user  |
| `web`   | nginx serving the built SPA and proxying `/api` to the API (same origin) |

## Local development

Requires Node.js 22 (>= 20.19) and npm 10.

```bash
npm install

# 1. Start MongoDB on localhost:27017 (pick one)
docker compose up -d mongo
npm run mongo:dev -w api        # no Docker: in-process MongoDB, data kept in apps/api/.mongo-data

# 2. Configure the apps
cp apps/api/.env.example apps/api/.env   # then replace both JWT secrets
cp apps/web/.env.example apps/web/.env

# 3. Run the API (http://localhost:3000/api) and the web app (http://localhost:5173)
npm run dev
```

In development, the Vite server proxies `/api` to the API, so the browser sees one origin and the auth cookies work without CORS.

## Scripts

Run from the repo root. Turborepo runs each task in every workspace that defines it.

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | API and web app in watch mode                             |
| `npm run build`        | Production builds of both apps                            |
| `npm run lint`         | ESLint everywhere                                         |
| `npm run typecheck`    | `tsc --noEmit` everywhere                                 |
| `npm test`             | API unit tests (Jest) and web tests (Vitest)              |
| `npm run test:e2e`     | API end-to-end tests (supertest + in-memory MongoDB)      |
| `npm run test:browser` | Playwright smoke tests against the full stack (see below) |
| `npm run format`       | Prettier                                                  |

## Environment variables

The API validates its environment with zod at startup and refuses to boot, listing every problem, if anything is missing or invalid.

**API** ([`apps/api/.env.example`](apps/api/.env.example))

| Variable                  | Default              | Notes                                                        |
| ------------------------- | -------------------- | ------------------------------------------------------------ |
| `MONGO_URI`               | required             | `mongodb://` or `mongodb+srv://` URI                         |
| `JWT_ACCESS_SECRET`       | required             | At least 32 characters                                       |
| `JWT_REFRESH_SECRET`      | required             | At least 32 characters, and different from the access secret |
| `CORS_ORIGIN`             | required             | The web app's origin                                         |
| `JWT_ACCESS_TTL_SECONDS`  | `900`                | 15 minutes                                                   |
| `JWT_REFRESH_TTL_SECONDS` | `604800`             | 7 days                                                       |
| `PORT`                    | `3000`               |                                                              |
| `NODE_ENV`                | `development`        | `development`, `production` or `test`                        |
| `LOG_LEVEL`               | `info`               | pino level                                                   |
| `TRUST_PROXY`             | `0`                  | Number of proxies in front of the API (`1` behind nginx)     |
| `THROTTLE_AUTH_LIMIT`     | `5`                  | Sign-in/sign-up attempts per IP per minute                   |
| `SWAGGER_ENABLED`         | on unless production |                                                              |
| `COOKIE_SECURE`           | on in production     | HTTPS-only cookies                                           |

**Web** ([`apps/web/.env.example`](apps/web/.env.example))

| Variable                | Default                 | Notes                                            |
| ----------------------- | ----------------------- | ------------------------------------------------ |
| `VITE_API_BASE_URL`     | `/api`                  | Keep `/api` unless the API is on another origin  |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Where the Vite dev/preview server proxies `/api` |

## API

All routes are under `/api`. Interactive docs: **`/api/docs`** (Swagger UI).

| Method | Path                | Auth           | Success                     | Errors                                     |
| ------ | ------------------- | -------------- | --------------------------- | ------------------------------------------ |
| POST   | `/api/auth/signup`  | -              | `201` user, sets cookies    | `400` validation, `409` email taken, `429` |
| POST   | `/api/auth/signin`  | -              | `200` user, sets cookies    | `400` validation, `401` invalid, `429`     |
| POST   | `/api/auth/refresh` | refresh cookie | `204`, rotates both cookies | `401` missing, expired or reused token     |
| POST   | `/api/auth/logout`  | -              | `204`, clears cookies       | -                                          |
| GET    | `/api/users/me`     | access cookie  | `200` `{ id, email, name }` | `401`                                      |
| GET    | `/api/health`       | -              | `200` with a MongoDB ping   | `503`                                      |

Every error has the same shape:

```json
{
  "statusCode": 409,
  "message": "Email already registered",
  "error": "Conflict",
  "path": "/api/auth/signup",
  "timestamp": "2026-10-02T12:00:00.000Z",
  "requestId": "6f1c…"
}
```

Each response carries an `x-request-id` header that matches the `requestId` in the logs, so a reported error can be traced.

## Project structure

```
apps/
  api/                       NestJS API (one folder per module)
    src/
      auth/                  controller, service, DTOs, JWT strategies and guards, cookie helpers
      users/                 schema, service, GET /users/me, response DTO
      health/                GET /health (terminus + Mongo ping)
      common/                exception filter, decorators, shared validation constants
      config/                typed config + zod env validation
      app.setup.ts           helmet, cookies, validation pipe, CORS, Swagger (shared with e2e tests)
    test/                    e2e tests
  web/                       React SPA
    src/
      features/auth/         API calls, hooks, zod schemas, forms, route guards
      pages/                 thin page components
      lib/                   axios client with silent refresh, error mapping
      components/            app-level shared components
      test/                  MSW server, handlers, render helper
    nginx.conf               production static server + /api proxy
packages/
  ui/                        shared shadcn/ui components
e2e/                         Playwright smoke tests
.github/workflows/ci.yml     CI
```

Code is grouped by feature (auth, users) rather than by file type. Unit tests sit next to the code they test.

## Security decisions

- **Passwords** are hashed with **argon2id** (OWASP baseline: 19 MiB, 2 iterations). Passwords are capped at 72 characters to bound hashing cost.
- **Sessions use httpOnly cookies, not localStorage**, so page scripts (and any XSS) can't read the tokens.
  - Access token: JWT, 15 minutes, cookie path `/api`.
  - Refresh token: JWT, 7 days, cookie path `/api/auth`, so it's only sent to auth endpoints.
  - Cookies are `SameSite=Lax` and `Secure` in production. Combined with JSON-only bodies and a same-origin setup, this covers CSRF for this app.
- **Refresh tokens rotate** on every use. Only a SHA-256 hash of the current token is stored, and rotation is an atomic compare-and-swap in MongoDB. If an old token is reused (a sign it was stolen), the session is revoked and the user must sign in again.
- **No user enumeration:** sign-in returns the same `401 Invalid credentials` for an unknown email and a wrong password, and runs argon2 against a dummy hash for unknown emails so response times match.
- **Hashes never leave the API:** they are `select: false` in the schema, and responses go through a `UserResponseDto` that only has `id`, `email` and `name`.
- **Input validation** on both sides: class-validator on the API (`whitelist` + `forbidNonWhitelisted`), zod in the UI. The rules live in one constants file per side, and both test suites use the same valid and invalid examples so they can't drift.
- **Emails** are trimmed, lowercased and covered by a unique index. The API waits for the index at startup so concurrent duplicate sign-ups can't slip through.
- **Rate limiting:** 5 sign-in/sign-up attempts per IP per minute, and 100 requests per minute for everything else. `trust proxy` is configurable so the limit sees real client IPs behind nginx.
- **helmet** security headers on the API, and `nosniff`, `X-Frame-Options` and `Referrer-Policy` in nginx.
- **Logs** use pino with request IDs. Cookies, auth headers and passwords are never logged (serializers plus redaction as a second layer).
- **Errors:** unexpected errors are logged server-side and returned as a generic 500, so internals never leak.
- **Config** fails fast on missing or weak secrets. The two JWT secrets must differ.

## Testing

| Layer                    | Tool                                     | Covers                                                                                         |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| API unit                 | Jest                                     | `AuthService` (hashing, duplicate email, generic 401, refresh rotation and reuse), sign-up DTO |
| API e2e                  | Jest + supertest + mongodb-memory-server | HTTP contract, cookie flags, validation 400s, 409, `/users/me`, refresh reuse, health          |
| Web unit and integration | Vitest + Testing Library + MSW           | zod rules, forms, error messages, route guards, the refresh interceptor (one shared refresh)   |
| Full-stack smoke         | Playwright (Chromium)                    | Real browser, built API and web app, real MongoDB: sign up, reload, log out, sign in, errors   |

The Playwright suite needs nothing running: it starts an in-memory MongoDB, builds and starts the API, and serves the built web app on its own ports.

```bash
npm run test:browser:install -w e2e   # first time only: downloads Chromium
npm run test:browser
```

**CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push and pull request: lint, typecheck, unit tests and build in one job and the API e2e tests in another, in parallel. The Playwright job runs once both pass, and uploads its report if it fails.

## Trade-offs and future work

- **React + Vite instead of Next.js.** The API is already NestJS; Next.js would add a second server, a second set of auth checks and cookie forwarding, with no benefit for pages that sit behind a login.
- **Cookies instead of a Bearer token** in localStorage: safer against XSS, and the same-origin proxy keeps CORS closed.
- **One session per user.** A new sign-in replaces the stored refresh token, so signing in on a second device signs out the first. A `sessions` collection would allow one session per device.
- **In-memory rate limiting** only works for a single API instance. Use Redis storage for the throttler when scaling out.
- **Not included:** email verification, password reset, account lockout after repeated failures, and 2FA.
- **Deployment:** `vercel.json` defines the API and web app as two services behind one domain, with `/api/*` routed to the API. MongoDB would come from a hosted provider (e.g. Atlas).
