# How I used AI

I used AI coding assistants (Claude Code, in VS Code) throughout this task: for planning, scaffolding, boilerplate, tests and docs. I made the design decisions, reviewed every change, and ran the tests and the app myself before committing.

> **TODO(Ahmed):** replace every `TODO` below with your own real examples, then delete this note. Reviewers value honest, specific entries over polished ones.

## What AI did

| Area             | AI's part                                                                                                                                                   | My part                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Planning         | Drafted the implementation plan: architecture, auth design, test layers, execution order (committed as `plan.md` in `7f1d70e`)                              | Chose the stack and the auth model, and cut scope to fit the time box   |
| Scaffolding      | NestJS app, Vite app, shadcn/ui components, Turborepo and workspace config, ESLint and Prettier                                                             | Picked the template and the folder structure (feature-based)            |
| Backend          | First drafts of DTOs, the user schema, JWT strategies and guards, the cookie helpers, the exception filter, the pino config, Swagger decorators             | Reviewed the security-sensitive parts line by line (see below)          |
| Frontend         | First drafts of the axios refresh interceptor, the TanStack Query hooks, the forms and route guards                                                         | UX decisions: live password checklist, error wording, redirect behavior |
| Tests            | Test boilerplate: MSW handlers, supertest setup with mongodb-memory-server, Playwright config                                                               | Chose what to test, and checked each test fails when the code is broken |
| Docker, CI, docs | Dockerfiles, docker-compose, nginx config, the GitHub Actions workflow, the README                                                                          | Ran them, fixed what broke                                              |
| Final review     | Audited the repo against the assessment requirements and found gaps: no `AI.md`, a template README, real secrets in `.env.example`, no CI, no browser tests | Decided which gaps to fix and reviewed the fixes                        |

## Prompts that worked

Specific prompts with constraints worked much better than open-ended ones.

1. **Asking for a recommendation, not a survey.** Asking whether Next.js was a good fit, with the constraints spelled out (NestJS is required, the pages are behind login, a few hours to deliver), got a clear "no, use Vite" with reasons I could check, instead of a pros-and-cons list.
2. **Naming the security model up front.** Something like: _"Access JWT 15m + rotating refresh JWT 7d, both httpOnly SameSite=Lax cookies, refresh cookie scoped to /api/auth, store only a hash of the current refresh token, revoke on reuse."_ Without this, the first drafts defaulted to a Bearer token in localStorage.
3. **Asking for tests that prove a specific behavior.** _"Write a test showing that two concurrent 401s trigger exactly one refresh call"_ produced a useful test; _"add tests for the interceptor"_ produced shallow ones.
4. **Requirements audit at the end.** _"Check if I followed and covered all requirements in my project"_ found real gaps I had missed.

TODO: add one or two more of your own prompts, quoted as you actually wrote them.

## What I corrected

Things the AI got wrong or I changed after review:

- **Secrets in a committed file.** The root `.env.example` contained real generated JWT secrets that matched the local `.env`. Replaced them with placeholders and generated new local secrets.
- **Race condition on the unique email index.** Mongoose builds indexes in the background, so right after startup two sign-ups with the same email could both succeed. Fixed by awaiting `Model.init()` in `UsersService.onModuleInit`.
- TODO: e.g. tokens stored in localStorage in the first draft of the client
- TODO: e.g. `passwordHash` missing `select: false`, or a response leaking hashes
- TODO: e.g. frontend and backend password rules not matching
- TODO: e.g. the refresh interceptor firing one refresh per failed request
- TODO: e.g. sign-in returning different errors for unknown email vs wrong password

## Where I disagreed with the AI

- **Next.js vs Vite:** went with Vite. A second server with its own auth checks and cookie forwarding adds code and bugs and nothing the task scores.
- **Cookies vs Bearer tokens:** chose httpOnly cookies over a token in localStorage so XSS can't steal the session.
- **Plan vs result:** the plan said "two independent apps, no Turborepo or workspaces". I switched to a Turborepo + npm workspaces monorepo so the shadcn/ui components live in a shared `packages/ui`, and one command runs lint, typecheck, tests and build everywhere.
- TODO: add any suggestion you rejected and why.

## How I checked AI output

- Read every diff before committing. I was strictest on auth, cookies, hashing and anything touching the database.
- Ran `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` and `npm run test:browser` before pushing; CI runs the same.
- Tested the flows by hand in the browser, and checked in DevTools that cookies are httpOnly and nothing is in localStorage.
