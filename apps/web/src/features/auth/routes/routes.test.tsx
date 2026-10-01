import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { testUser } from "@/test/handlers"
import { renderApp } from "@/test/render"
import { server } from "@/test/server"

const signedIn = () =>
  server.use(http.get("/api/users/me", () => HttpResponse.json(testUser)))

describe("route guards", () => {
  it("redirects a signed-out visitor from / to sign-in", async () => {
    const { router } = renderApp("/")

    expect(
      await screen.findByRole("heading", { name: "Sign in" })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/signin")
  })

  it("shows the welcome page to a signed-in user", async () => {
    signedIn()
    renderApp("/")

    expect(
      await screen.findByRole("heading", {
        name: "Welcome to the application.",
      })
    ).toBeInTheDocument()
    expect(screen.getByText(testUser.name)).toBeInTheDocument()
  })

  it("redirects a signed-in user away from sign-in", async () => {
    signedIn()
    const { router } = renderApp("/signin")

    await screen.findByRole("heading", { name: "Welcome to the application." })
    expect(router.state.location.pathname).toBe("/")
  })

  it("signs in and lands on the welcome page", async () => {
    const { user } = renderApp("/signin")

    await user.type(await screen.findByLabelText("Email"), testUser.email)
    await user.type(screen.getByLabelText("Password"), "Passw0rd!")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(
      await screen.findByRole("heading", {
        name: "Welcome to the application.",
      })
    ).toBeInTheDocument()
  })

  it("logs out and returns to sign-in", async () => {
    signedIn()
    const { user, router } = renderApp("/")

    await user.click(await screen.findByRole("button", { name: "Log out" }))

    expect(
      await screen.findByRole("heading", { name: "Sign in" })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/signin")
  })

  it("renders the 404 page for unknown routes", async () => {
    renderApp("/nope")

    expect(
      await screen.findByRole("heading", { name: "Page not found" })
    ).toBeInTheDocument()
  })
})
