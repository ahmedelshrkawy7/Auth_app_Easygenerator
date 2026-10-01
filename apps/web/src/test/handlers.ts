import { http, HttpResponse } from "msw"
import type { User } from "@/features/auth/api"

export const testUser: User = {
  id: "665f1c2e8b3a4d0012345678",
  email: "jane@example.com",
  name: "Jane Doe",
}

export const unauthorized = () =>
  HttpResponse.json(
    { statusCode: 401, message: "Unauthorized", error: "Unauthorized" },
    { status: 401 }
  )

/** Happy-path API for a signed-out visitor. Override per test with server.use(). */
export const handlers = [
  http.get("/api/users/me", unauthorized),
  http.post("/api/auth/refresh", unauthorized),
  http.post("/api/auth/signin", () => HttpResponse.json(testUser)),
  http.post("/api/auth/signup", () =>
    HttpResponse.json(testUser, { status: 201 })
  ),
  http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),
]
