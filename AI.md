# How I used AI

I used an AI coding assistant (Claude Code, in VS Code) throughout this task: for planning, scaffolding, boilerplate, tests, Docker, CI and docs. I made the decisions, reviewed the changes, and ran the tests and the app myself before pushing.

## What AI did

| Area             | AI's part                                                                                                                                      | My part                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Planning         | Drafted the implementation plan: architecture, auth design, test layers, execution order (committed as `plan.md` in `7f1d70e`)                 | Set the constraints, chose the stack and the auth model                         |
| Scaffolding      | NestJS app, Vite app, shadcn/ui components, Turborepo and workspace config, ESLint and Prettier                                                | Chose a monorepo instead of the two separate apps in the plan (see below)       |
| Backend          | DTOs, user schema, JWT strategies and guards, cookie helpers, exception filter, logging config, Swagger decorators                             | Reviewed the security-sensitive parts: hashing, cookies, token rotation, errors |
| Frontend         | API client with silent token refresh, TanStack Query hooks, forms, route guards, password visibility toggle                                    | Reviewed the flows and tested them by hand in the browser                       |
| Tests            | Unit, integration and e2e tests, MSW handlers, supertest + in-memory MongoDB setup, Playwright smoke tests                                     | Decided what had to be covered and ran the suites                               |
| Docker, CI, docs | Dockerfiles, docker-compose, nginx config, GitHub Actions workflow, README                                                                     | Ran them and checked the CI run on GitHub                                       |
| Final review     | Audited the repo against the assessment and found gaps: no `AI.md`, a template README, real secrets in `.env.example`, no CI, no browser tests | Asked for the audit, decided which gaps to fix, reviewed the fixes              |

## Prompts that worked

Specific prompts with clear constraints worked much better than open-ended ones.

1. **Stating the security model up front.** The plan pinned it down before any code was written: a 15-minute access JWT and a rotating 7-day refresh JWT, both in httpOnly `SameSite=Lax` cookies, the refresh cookie limited to `/api/auth`, only a hash of the current refresh token stored, and the session revoked if an old token is reused. Every later prompt built on that, so the auth code stayed consistent.
2. **Asking for a requirements audit at the end.** I asked it to check whether I had followed and covered all the requirements. It compared the repo with the task and found real gaps I had missed (listed in the table above), which I then fixed.

## What I corrected

Problems found during review and fixed:

- **Secrets in a committed file.** The root `.env.example` contained real generated JWT secrets that matched my local `.env`. I replaced them with placeholders and generated new local secrets.
- **Race condition on the unique email index.** Mongoose builds indexes in the background, so right after startup two sign-ups with the same email could both succeed. I fixed it by waiting for `Model.init()` in `UsersService.onModuleInit`.
- **Template README.** The README was still the shadcn/ui template. I replaced it with real setup, API, security and testing docs.
- **SPA deep links on Vercel.** Reloading `/signin` on the deployed app would return a 404. A top-level rewrite to `/index.html` doesn't work with Vercel Services, because routing into a service is final, so the fallback had to go inside the `web` service.
- **Tests broken by a new feature.** Adding the "Show password" button made Playwright's `getByLabel("Password")` match two elements, because it matches substrings. I made those lookups exact.

## Decisions I made

- **React + Vite, not Next.js.** The API is already NestJS. Next.js would add a second server with its own auth checks and cookie forwarding, and none of that helps pages that sit behind a login.
- **httpOnly cookies, not a Bearer token in localStorage**, so page scripts (and any XSS) can't read the session.
- **Changing the plan's repo layout.** The AI's plan said "two independent apps, no Turborepo or workspaces". I switched to a Turborepo + npm workspaces monorepo instead, so the shadcn/ui components live in a shared `packages/ui` and one command runs lint, typecheck, tests and build everywhere.

## How I checked AI output

- Reviewed the changes before committing, most carefully the auth, cookie, hashing and database code.
- Ran `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` and `npm run test:browser` locally. CI runs the same checks on every push.
- Tested sign-up, sign-in, reload and log-out by hand in the browser.
