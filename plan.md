# Plan: Full-Stack Auth Module (NestJS + MongoDB + React/TS)

## Context

Take-home task: sign-up / sign-in / protected "Welcome to the application." page. It is scored on functionality, production-readiness (security and maintainability), code quality, delivery speed (a few hours), and bonus items (logging, error handling, tests, CI/CD, API docs). `AI.md` is required. This is a new project in `D:\course\auth-app` (one git repo, pushed to a public GitHub repo). Node 22 and Docker are installed.

### On Next.js (your question)

**My recommendation: no. Use React + Vite (an SPA).**

- The task already requires NestJS as the API. Next.js would add a second server (SSR or a BFF) with a second set of auth checks and cookie forwarding between Next and Nest. That means more code and more places for bugs, and none of it is scored.
- Auth pages sit behind login, so SSR/SEO adds nothing here.
- Vite gives the fastest setup and dev loop, and builds to static files that nginx serves. That fits "delivery speed" and keeps the architecture easy to explain.
- Next.js makes sense when you need SEO, server components, or Next to own the backend. None of these apply here.

## Decisions

- **Frontend:** React 19 + Vite + TypeScript, react-router, react-hook-form + zod, TanStack Query, axios, Tailwind CSS (shadcn/ui-style components).
- **Backend:** NestJS 11 + Mongoose, Passport JWT, argon2, class-validator, @nestjs/config with env validation, helmet, @nestjs/throttler, nestjs-pino, @nestjs/swagger, @nestjs/terminus.
- **Auth:** a short-lived **access JWT (15m)** and a **rotating refresh JWT (7d)**, both in `httpOnly`, `SameSite=Lax` cookies (`Secure` in prod). The refresh cookie is scoped to `path=/api/auth`. Only the argon2 **hash** of the current refresh token is stored on the user. If an old token is reused, the stored hash is cleared, which forces a fresh login.
- **Same-origin setup:** the Vite dev proxy and the nginx prod proxy both serve `/api` from the frontend origin. Cookies just work, CORS stays strict, and SameSite=Lax combined with JSON-only bodies covers CSRF.

## Repo layout

Structure is **feature-based**: code is grouped by what it does (auth, users), not by file type. There are two independent apps, each with its own `package.json`, and no Nx, Turborepo or workspaces.

### Root

```
auth-app/
├─ backend/                      NestJS API
├─ frontend/                     React + Vite SPA
├─ e2e/                          Playwright smoke tests (full stack)
│  ├─ playwright.config.ts
│  ├─ tests/auth.spec.ts
│  └─ package.json
├─ .github/workflows/ci.yml
├─ docker-compose.yml            mongo + backend + frontend(nginx)
├─ .gitignore
├─ README.md
├─ AI.md
└─ PLAN.md
```

### Backend: one folder per Nest module

```
backend/
├─ src/
│  ├─ main.ts                    # bootstrap: helmet, pipes, cookies, swagger
│  ├─ app.module.ts
│  ├─ config/
│  │  ├─ configuration.ts        # typed config object
│  │  └─ env.validation.ts       # fail fast on bad/missing env
│  ├─ common/                    # cross-cutting, no business logic
│  │  ├─ filters/all-exceptions.filter.ts
│  │  ├─ decorators/current-user.decorator.ts
│  │  └─ constants/validation.constants.ts   # PASSWORD_REGEX, NAME_MIN…
│  ├─ auth/
│  │  ├─ auth.module.ts
│  │  ├─ auth.controller.ts
│  │  ├─ auth.service.ts
│  │  ├─ auth.service.spec.ts    # unit test next to the code it tests
│  │  ├─ dto/{signup.dto.ts, signin.dto.ts}
│  │  ├─ strategies/{jwt.strategy.ts, jwt-refresh.strategy.ts}
│  │  ├─ guards/{jwt-auth.guard.ts, jwt-refresh.guard.ts}
│  │  └─ utils/auth-cookies.ts
│  ├─ users/
│  │  ├─ users.module.ts
│  │  ├─ users.controller.ts     # GET /users/me (protected)
│  │  ├─ users.service.ts
│  │  ├─ schemas/user.schema.ts
│  │  └─ dto/user-response.dto.ts
│  └─ health/{health.module.ts, health.controller.ts}
├─ test/
│  ├─ auth.e2e-spec.ts
│  └─ jest-e2e.json
├─ .env.example
└─ Dockerfile
```

### Frontend: features plus shared building blocks

```
frontend/
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ router.tsx              # routes + lazy pages
│  │  └─ providers.tsx           # QueryClientProvider, etc.
│  ├─ features/
│  │  └─ auth/
│  │     ├─ api.ts               # signIn, signUp, logout, getMe
│  │     ├─ hooks.ts             # useMe, useSignIn, useSignUp, useLogout
│  │     ├─ schemas.ts           # zod
│  │     ├─ schemas.test.ts
│  │     ├─ components/
│  │     │  ├─ SignInForm.tsx
│  │     │  ├─ SignUpForm.tsx
│  │     │  ├─ SignUpForm.test.tsx
│  │     │  └─ PasswordChecklist.tsx
│  │     └─ routes/{ProtectedRoute.tsx, PublicOnlyRoute.tsx}
│  ├─ pages/                     # thin: layout + compose feature components
│  │  ├─ SignInPage.tsx
│  │  ├─ SignUpPage.tsx
│  │  ├─ AppPage.tsx
│  │  └─ NotFoundPage.tsx
│  ├─ components/ui/             # dumb, reusable: Button, Input, FormField, Card
│  ├─ lib/
│  │  ├─ http.ts                 # axios instance + refresh interceptor
│  │  └─ errors.ts               # map API errors → user messages
│  ├─ test/
│  │  ├─ setup.ts                # jest-dom + MSW server lifecycle
│  │  ├─ server.ts               # MSW setupServer
│  │  ├─ handlers.ts             # default API handlers (happy path)
│  │  └─ render.tsx              # render with QueryClient + Router
│  ├─ lib/http.test.ts           # refresh interceptor (MSW)
│  └─ index.css                  # Tailwind
├─ nginx.conf
├─ .env.example
└─ Dockerfile
```

### Structure rules

- **Pages** stay thin. They compose feature components and hold no logic.
- **`features/auth`** holds all the auth logic in one place.
- **`components/ui`** has no knowledge of auth or the API.
- **`lib`** holds infrastructure, such as the HTTP client and error mapping.
- Backend modules own their controller, service, DTOs and schema. `common/` holds only shared plumbing.
- Unit tests sit next to the code they test. Backend e2e tests go in `backend/test/`.

### Deliberately avoided

- **Clean or hexagonal layers** (repositories, use-cases, domain entities): too much ceremony for two endpoints.
- **A shared `packages/shared` for validation rules:** sharing code between Nest (CommonJS) and Vite (ESM) needs build tooling. Instead, each side keeps the password regex in one constants file, and tests on both sides check the same valid and invalid examples so the two can't drift apart.
- **Folders by type** (`controllers/`, `services/`, `hooks/` at the top level): this scatters a single feature across many folders.

## Backend (`backend/src`)

- `config/`: typed config plus env schema validation, so the app fails fast on a missing `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, and so on.
- `users/`:
  - `user.schema.ts`: `email` (unique index, lowercased, trimmed), `name`, `passwordHash` (`select: false`), `refreshTokenHash` (`select: false`), timestamps.
  - `users.service.ts`: `create`, `findByEmail(withSecret)`, `findById`, `setRefreshTokenHash`. Reads use `.lean()`.
- `auth/`:
  - `dto/signup.dto.ts`: `@IsEmail`, name `@MinLength(3)` and `@MaxLength(50)`, password `@MinLength(8)`, `@MaxLength(72)` and `@Matches(PASSWORD_REGEX)`. `PASSWORD_REGEX` is `/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/` and lives in `common/constants/validation.constants.ts`.
  - `dto/signin.dto.ts`: email and password.
  - `auth.service.ts`: signup hashes with argon2id and maps a duplicate key to **409**. Signin returns a generic "Invalid credentials" with **401** (no user enumeration). It also handles token issue, rotate and revoke.
  - `auth.controller.ts`: `POST /api/auth/signup`, `POST /api/auth/signin`, `POST /api/auth/refresh`, `POST /api/auth/logout`. Each sets or clears cookies through a single `utils/auth-cookies.ts`.
  - `strategies/jwt.strategy.ts` reads the access cookie. `jwt-refresh.strategy.ts` reads the refresh cookie.
  - `guards/jwt-auth.guard.ts` and a `@CurrentUser()` decorator.
- **Protected endpoint:** `GET /api/users/me` returns `{ id, email, name }` through a response DTO, so hashes never leak.
- `health/`: `GET /api/health` checks Mongo.
- `common/filters/all-exceptions.filter.ts` returns one error shape: `{ statusCode, message, error, path, timestamp, requestId }`.
- `main.ts`:
  - Global prefix `/api`.
  - `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`.
  - helmet, cookie-parser, and CORS limited to `CORS_ORIGIN` with credentials.
  - pino logger with request IDs, redacting `password`, `cookie` and `set-cookie`.
  - Swagger at `/api/docs` (prod: disabled or behind a flag).
  - `enableShutdownHooks`.
- Throttler: a strict limit on `signin`/`signup` (for example 5 per minute per IP) and a looser global default.

## Frontend (`frontend/src`)

- `lib/http.ts`: axios with `baseURL: '/api'` and `withCredentials`. A response interceptor catches a 401, makes **one shared** `POST /auth/refresh` call (concurrent requests wait on it), then retries. If the refresh fails, it clears the query cache and sends the user to `/signin`.
- `lib/errors.ts`: maps API error responses to user-facing messages.
- `features/auth/api.ts`: typed calls for `signIn`, `signUp`, `logout` and `getMe`.
- `features/auth/schemas.ts`: zod schemas that mirror the backend rules, including the same password regex.
- `features/auth/hooks.ts`: `useMe` (TanStack Query `['me']`), plus `useSignIn`, `useSignUp` and `useLogout` mutations.
- `features/auth/components/SignUpForm.tsx` and `SignInForm.tsx`:
  - react-hook-form with zodResolver, validating on blur, then on change.
  - A live password-rule checklist (`PasswordChecklist.tsx`).
  - Accessible field errors (`aria-invalid`, `aria-describedby`).
  - Submit disabled while a request is pending.
  - Server errors shown, such as "Email already registered" or "Invalid credentials".
- `pages/SignUpPage.tsx` and `pages/SignInPage.tsx`: thin wrappers that render the forms.
- `pages/AppPage.tsx`: shows **"Welcome to the application."** with the user's name and a Logout button.
- `pages/NotFoundPage.tsx`: the 404 page.
- `features/auth/routes/ProtectedRoute.tsx` and `PublicOnlyRoute.tsx` use `useMe` to guard routes, with a loading state.
- `app/router.tsx` lazy-loads the pages. `app/providers.tsx` sets up the QueryClient.
- `components/ui/`: Button, Input, FormField, Card, built with Tailwind.
- `vite.config.ts`: dev proxy `/api → http://localhost:3000`.

## Quality, tests, CI, ops

- **Lint and format:** ESLint and Prettier in both apps, TypeScript `strict`.
- **Backend tests (Jest):**
  - Unit tests for `AuthService`: duplicate email, wrong password, token rotation and reuse.
  - e2e tests with supertest and `mongodb-memory-server`: signup → signin → `/me` returns 200 → logout → `/me` returns 401, plus the validation 400 cases.
- **Frontend tests (Vitest + React Testing Library + MSW):** MSW mocks the API at the network level, so the real axios client, interceptor and TanStack Query hooks all run in the tests.
  - zod schema tests for the password rules, using the same valid and invalid examples as the backend tests.
  - SignUp and SignIn form tests: validation errors render, the submit payload is correct, a 409 shows "Email already registered" and a 401 shows "Invalid credentials".
  - `lib/http.test.ts`: a 401 triggers a single refresh and the request is retried. Concurrent 401s share one refresh call. A failed refresh redirects to `/signin`.
- **Full-stack smoke tests (Playwright, `e2e/`):** 2–3 tests, Chromium only, against the real backend and Mongo (no MSW). Validation edge cases stay in the fast tests.
  1. Sign up → see "Welcome to the application." → reload → still logged in → log out → land on sign-in.
  2. Sign in with the wrong password → see the error message.
  3. (Optional) A weak password shows the validation messages and nothing is submitted.
- **Test layers:**

  | Layer                     | Tool                                     | What it covers                                                        |
  | ------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
  | Backend unit              | Jest                                     | AuthService logic: hashing, duplicate email, token rotation and reuse |
  | Backend e2e               | Jest + supertest + mongodb-memory-server | HTTP contract, validation 400s, cookies, protected `/me`              |
  | Frontend unit/integration | Vitest + RTL + MSW                       | Zod rules, forms, error mapping, refresh interceptor                  |
  | Full-stack smoke          | Playwright                               | The real user journey in a real browser                               |

- **Docker:** multi-stage Dockerfiles. The backend runs on node:22-alpine as a non-root user. The frontend builds with Vite, then nginx serves it and proxies `/api` to the backend. `docker compose up` starts all three services. `.env.example` files are committed and real `.env` files are git-ignored.
- **CI (`.github/workflows/ci.yml`):** on push and PR, with npm caching:
  - `backend` and `frontend` jobs (in parallel): each runs `npm ci`, lint, typecheck, test and build.
  - An `e2e` job that runs only after both pass (`needs: [backend, frontend]`):
    - Starts a Mongo service container.
    - Builds and starts the backend, and serves the frontend with `vite preview`, which proxies to the backend.
    - Installs Chromium (`npx playwright install --with-deps chromium`) and runs Playwright.
    - Uploads the Playwright report as an artifact if a test fails.
  - Keeping e2e in its own job means a slow browser test never blocks the fast feedback.
- **Performance basics:**
  - Unique index on email and `.lean()` reads.
  - `/me` is cached by TanStack Query (`staleTime`), so there are no redundant calls.
  - Lazy-loaded routes and compression in nginx.
  - Stateless access-token check, with no DB hit in the guard.

## Docs

- `README.md` covers:
  - Stack and architecture overview.
  - Quick start with Docker and local dev.
  - Env vars.
  - Scripts.
  - API endpoint table and Swagger link.
  - Security decisions.
  - Trade-offs and future work: email verification, password reset, sessions per device, Redis rate limiting.
- `AI.md`: kept as a running log **during** the build, not written at the end. Sections:
  - Which parts were AI-generated: scaffolding, DTOs, Dockerfiles, CI, test boilerplate.
  - Prompts that worked, with real examples.
  - What I corrected, with examples. Typical ones: AI defaulting to localStorage tokens, a missing `select:false` on the hash, mismatched FE/BE password regex, a refresh race in the interceptor, and leaking whether an email exists.
  - Decisions where I disagreed with the AI, for example Next.js vs Vite and cookie auth vs Bearer.

## Execution order (time-boxed, ~6h, small conventional commits)

1. (15m) `git init`, scaffold Nest (`nest new`) and Vite (`npm create vite -- --template react-ts`), add tooling, `.gitignore`, and Mongo via compose.
2. (75m) Backend: config → users → auth (signup/signin) → cookies and JWT strategies → refresh/logout → `/me` → filter, logging, helmet, throttler → Swagger and health.
3. (30m) Backend tests: unit and e2e.
4. (75m) Frontend: api client and interceptor → schemas → hooks → pages → route guards → styling.
5. (35m) Frontend tests: MSW setup and handlers → schema tests → form tests → interceptor tests.
6. (30m) Dockerfiles and compose.
7. (40m) Playwright: set up `e2e/`, write the smoke tests, add the CI workflow including the e2e job.
8. (20m) README and final pass on AI.md. Then create the public GitHub repo (`gh repo create`) and push.

## Verification

- `cd backend && npm run lint && npm test && npm run test:e2e && npm run build`
- `cd frontend && npm run lint && npm run test && npm run build`
- With the stack running: `cd e2e && npx playwright test`
- `docker compose up --build`, then open the frontend:
  - Sign-up rejects a bad email, a name under 3 characters, and weak passwords.
  - Valid sign-up goes to the welcome page, and a reload keeps you logged in.
  - Logout returns to sign-in, and `/api/users/me` returns 401.
  - Signing up with a duplicate email shows the 409 message.
  - After 15m, or after deleting the access cookie, the page silently refreshes.
- Check Swagger at `/api/docs`. In DevTools, confirm the cookies are httpOnly and nothing is in localStorage.
- Push and confirm the GitHub Actions CI run is green.
