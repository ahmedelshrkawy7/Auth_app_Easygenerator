import type { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import request from "supertest"
import type TestAgent from "supertest/lib/agent"
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"

let mongo: MongoMemoryServer
let app: NestExpressApplication

const user = {
  email: "jane@example.com",
  name: "Jane Doe",
  password: "Passw0rd!",
}

function cookieNames(res: request.Response): string[] {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined
  return (header ?? []).map((c) => c.split("=")[0])
}

/** A cookie jar that also follows the path rules, like a browser. */
function newAgent(): TestAgent {
  return request.agent(app.getHttpServer())
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  Object.assign(process.env, {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    MONGO_URI: mongo.getUri("auth_e2e"),
    JWT_ACCESS_SECRET: "e2e-access-secret-that-is-long-enough!!",
    JWT_REFRESH_SECRET: "e2e-refresh-secret-that-is-long-enough!",
    CORS_ORIGIN: "http://localhost:5173",
    THROTTLE_AUTH_LIMIT: "1000",
  })

  // Config is validated when the module is compiled, so env must be set first.
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()
  app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  })
  configureApp(app)
  await app.init()
})

afterAll(async () => {
  await app?.close()
  await mongo?.stop()
})

describe("Auth (e2e)", () => {
  it("signup → me → refresh → logout → me is 401", async () => {
    const agent = newAgent()

    const signup = await agent.post("/api/auth/signup").send(user).expect(201)
    expect(signup.body).toEqual({
      id: expect.any(String),
      email: user.email,
      name: user.name,
    })
    expect(cookieNames(signup)).toEqual(["access_token", "refresh_token"])
    const cookies = signup.headers["set-cookie"] as unknown as string[]
    expect(
      cookies.every((c) => /HttpOnly/.test(c) && /SameSite=Lax/.test(c))
    ).toBe(true)
    expect(cookies[1]).toMatch(/Path=\/api\/auth/)

    const me = await agent.get("/api/users/me").expect(200)
    expect(me.body).toEqual(signup.body)

    const refresh = await agent.post("/api/auth/refresh").expect(204)
    expect(cookieNames(refresh)).toEqual(["access_token", "refresh_token"])
    await agent.get("/api/users/me").expect(200)

    await agent.post("/api/auth/logout").expect(204)
    await agent.get("/api/users/me").expect(401)
    await agent.post("/api/auth/refresh").expect(401)
  })

  it("signs in an existing user, case-insensitively by email", async () => {
    const agent = newAgent()
    const res = await agent
      .post("/api/auth/signin")
      .send({ email: "  JANE@example.com ", password: user.password })
      .expect(200)

    expect(res.body.email).toBe(user.email)
    await agent.get("/api/users/me").expect(200)
  })

  it("never returns password or refresh hashes", async () => {
    const agent = newAgent()
    const res = await agent
      .post("/api/auth/signin")
      .send({ email: user.email, password: user.password })
    const me = await agent.get("/api/users/me")

    for (const body of [res.body, me.body]) {
      expect(Object.keys(body).sort()).toEqual(["email", "id", "name"])
    }
  })

  it("returns 409 for a duplicate email", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({ ...user, email: "Jane@Example.com" })
      .expect(409)

    expect(res.body).toMatchObject({
      statusCode: 409,
      message: "Email already registered",
      path: "/api/auth/signup",
    })
    expect(res.body.timestamp).toEqual(expect.any(String))
  })

  it("returns 401 with the same message for wrong password and unknown email", async () => {
    const server = app.getHttpServer()
    const wrong = await request(server)
      .post("/api/auth/signin")
      .send({ email: user.email, password: "Wrong-pass1" })
      .expect(401)
    const unknown = await request(server)
      .post("/api/auth/signin")
      .send({ email: "nobody@example.com", password: user.password })
      .expect(401)

    expect(wrong.body.message).toBe("Invalid credentials")
    expect(unknown.body.message).toBe("Invalid credentials")
  })

  it.each([
    ["an invalid email", { ...user, email: "nope" }, "email"],
    ["a short name", { ...user, name: "Jo" }, "name"],
    ["a weak password", { ...user, password: "password" }, "password"],
    ["an unknown field", { ...user, isAdmin: true }, "isAdmin"],
  ])("rejects %s with 400", async (_label, body, field) => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({
        ...body,
        email: body.email === user.email ? "new@example.com" : body.email,
      })
      .expect(400)

    expect(res.body.statusCode).toBe(400)
    expect(JSON.stringify(res.body.message)).toContain(field)
  })

  it("revokes the session when an old refresh token is reused", async () => {
    const agent = newAgent()
    const signin = await agent
      .post("/api/auth/signin")
      .send({ email: user.email, password: user.password })
      .expect(200)
    const oldRefresh = (signin.headers["set-cookie"] as unknown as string[])
      .find((c) => c.startsWith("refresh_token="))!
      .split(";")[0]

    await agent.post("/api/auth/refresh").expect(204) // rotates

    // An attacker replays the old token: rejected, and the session is revoked.
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", oldRefresh)
      .expect(401)
    await agent.post("/api/auth/refresh").expect(401)
  })

  it("rejects /users/me without a cookie", async () => {
    await request(app.getHttpServer()).get("/api/users/me").expect(401)
  })

  it("reports health", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/health")
      .expect(200)
    expect(res.body.status).toBe("ok")
  })

  it("echoes a request id on responses", async () => {
    const res = await request(app.getHttpServer()).get("/api/users/me")
    expect(res.headers["x-request-id"]).toEqual(expect.any(String))
    expect(res.body.requestId).toBe(res.headers["x-request-id"])
  })
})
