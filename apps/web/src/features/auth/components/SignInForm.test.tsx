import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { testUser } from "@/test/handlers"
import { renderWithProviders } from "@/test/render"
import { server } from "@/test/server"
import { meQueryKey } from "../hooks"
import { SignInForm } from "./SignInForm"

describe("SignInForm", () => {
  it("requires email and password", async () => {
    const { user } = renderWithProviders(<SignInForm />)

    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByText("Email is required")).toBeInTheDocument()
    expect(screen.getByText("Password is required")).toBeInTheDocument()
  })

  it("submits credentials and caches the user", async () => {
    let body: unknown
    server.use(
      http.post("/api/auth/signin", async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(testUser)
      })
    )
    const { user, queryClient } = renderWithProviders(<SignInForm />)

    await user.type(screen.getByLabelText("Email"), "jane@example.com")
    await user.type(screen.getByLabelText("Password"), "Passw0rd!")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() =>
      expect(queryClient.getQueryData(meQueryKey)).toEqual(testUser)
    )
    expect(body).toEqual({ email: "jane@example.com", password: "Passw0rd!" })
  })

  it("shows 'Invalid credentials' on 401 without trying a refresh", async () => {
    let refreshCalls = 0
    server.use(
      http.post("/api/auth/signin", () =>
        HttpResponse.json(
          { statusCode: 401, message: "Unauthorized" },
          { status: 401 }
        )
      ),
      http.post("/api/auth/refresh", () => {
        refreshCalls++
        return new HttpResponse(null, { status: 401 })
      })
    )
    const { user } = renderWithProviders(<SignInForm />)

    await user.type(screen.getByLabelText("Email"), "jane@example.com")
    await user.type(screen.getByLabelText("Password"), "wrong-password")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument()
    expect(refreshCalls).toBe(0)
  })

  it("shows a rate-limit message on 429", async () => {
    server.use(
      http.post("/api/auth/signin", () =>
        HttpResponse.json(
          { statusCode: 429, message: "ThrottlerException" },
          { status: 429 }
        )
      )
    )
    const { user } = renderWithProviders(<SignInForm />)

    await user.type(screen.getByLabelText("Email"), "jane@example.com")
    await user.type(screen.getByLabelText("Password"), "Passw0rd!")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(
      await screen.findByText(
        "Too many attempts. Please wait a minute and try again."
      )
    ).toBeInTheDocument()
  })
})
