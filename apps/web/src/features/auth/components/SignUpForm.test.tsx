import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { testUser } from "@/test/handlers"
import { renderWithProviders } from "@/test/render"
import { server } from "@/test/server"
import { meQueryKey } from "../hooks"
import { SignUpForm } from "./SignUpForm"

async function fillForm(
  user: ReturnType<typeof renderWithProviders>["user"],
  values = {
    name: "Jane Doe",
    email: "Jane@Example.com",
    password: "Passw0rd!",
  }
) {
  await user.type(screen.getByLabelText("Name"), values.name)
  await user.type(screen.getByLabelText("Email"), values.email)
  await user.type(screen.getByLabelText("Password"), values.password)
}

describe("SignUpForm", () => {
  it("shows validation errors and does not submit when the form is invalid", async () => {
    let called = false
    server.use(
      http.post("/api/auth/signup", () => {
        called = true
        return HttpResponse.json(testUser, { status: 201 })
      })
    )
    const { user } = renderWithProviders(<SignUpForm />)

    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(
      await screen.findByText("Name must be at least 3 characters")
    ).toBeInTheDocument()
    expect(screen.getByText("Email is required")).toBeInTheDocument()
    expect(
      screen.getByText("Password must be at least 8 characters")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(called).toBe(false)
  })

  it("validates a field on blur", async () => {
    const { user } = renderWithProviders(<SignUpForm />)

    await user.type(screen.getByLabelText("Email"), "not-an-email")
    expect(
      screen.queryByText("Enter a valid email address")
    ).not.toBeInTheDocument()
    await user.tab()

    const email = screen.getByLabelText("Email")
    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeInTheDocument()
    expect(email).toHaveAccessibleDescription("Enter a valid email address")
  })

  it("updates the password checklist as the user types", async () => {
    const { user } = renderWithProviders(<SignUpForm />)
    const rule = (name: string) => screen.getByText(name).closest("li")

    expect(rule("At least one number")).toHaveAttribute("data-met", "false")
    await user.type(screen.getByLabelText("Password"), "abc1")
    expect(rule("At least one letter")).toHaveAttribute("data-met", "true")
    expect(rule("At least one number")).toHaveAttribute("data-met", "true")
    expect(rule("At least one special character")).toHaveAttribute(
      "data-met",
      "false"
    )
  })

  it("submits the normalized payload and caches the user", async () => {
    let body: unknown
    server.use(
      http.post("/api/auth/signup", async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(testUser, { status: 201 })
      })
    )
    const { user, queryClient } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() =>
      expect(queryClient.getQueryData(meQueryKey)).toEqual(testUser)
    )
    expect(body).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "Passw0rd!",
    })
  })

  it("disables the submit button while the request is pending", async () => {
    let release!: () => void
    server.use(
      http.post("/api/auth/signup", async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json(testUser, { status: 201 })
      })
    )
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /create account/i })
      ).toBeDisabled()
    )
    release()
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /create account/i })
      ).toBeEnabled()
    )
  })

  it("shows 'Email already registered' on 409", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: "Email already registered",
            error: "Conflict",
          },
          { status: 409 }
        )
      )
    )
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(
      await screen.findByText("Email already registered")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("shows a generic message on a server error", async () => {
    server.use(
      http.post("/api/auth/signup", () =>
        HttpResponse.json({ statusCode: 500, message: "boom" }, { status: 500 })
      )
    )
    const { user } = renderWithProviders(<SignUpForm />)

    await fillForm(user)
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(
      await screen.findByText(
        "Something went wrong on our side. Please try again."
      )
    ).toBeInTheDocument()
  })
})
