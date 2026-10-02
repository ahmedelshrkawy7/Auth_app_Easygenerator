import { expect, test, type Page } from "@playwright/test"

const PASSWORD = "Passw0rd!"

function uniqueEmail() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/signup")
  await page.getByLabel("Name").fill("Jane Doe")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
}

test("sign up, stay signed in after reload, log out, sign back in", async ({
  page,
}) => {
  const email = uniqueEmail()
  await signUp(page, email)

  const welcome = page.getByRole("heading", {
    name: "Welcome to the application.",
  })
  await expect(welcome).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()

  // Session lives in httpOnly cookies, so it survives a full reload.
  await page.reload()
  await expect(welcome).toBeVisible()

  await page.getByRole("button", { name: "Log out" }).click()
  await expect(page).toHaveURL(/\/signin$/)

  // The protected page is no longer reachable.
  await page.goto("/")
  await expect(page).toHaveURL(/\/signin$/)

  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(welcome).toBeVisible()
})

test("shows a generic error for a wrong password", async ({ page }) => {
  const email = uniqueEmail()
  await signUp(page, email)
  await page.getByRole("button", { name: "Log out" }).click()
  await expect(page).toHaveURL(/\/signin$/)

  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill("Wrong-pass1")
  await page.getByRole("button", { name: "Sign in" }).click()

  await expect(page.getByText("Invalid credentials")).toBeVisible()
  await expect(page).toHaveURL(/\/signin$/)
})

test("rejects a duplicate email on sign-up", async ({ page, context }) => {
  const email = uniqueEmail()
  await signUp(page, email)
  await page.getByRole("button", { name: "Log out" }).click()
  await context.clearCookies()

  await signUp(page, email)
  await expect(page.getByText("Email already registered")).toBeVisible()
})

test("blocks a weak password in the browser without calling the API", async ({
  page,
}) => {
  let signupCalls = 0
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/signup")) signupCalls++
  })

  await signUp(page, uniqueEmail(), "password")

  await expect(
    page.getByText(
      "Password must include a letter, a number and a special character"
    )
  ).toBeVisible()
  await expect(page).toHaveURL(/\/signup$/)
  expect(signupCalls).toBe(0)
})
