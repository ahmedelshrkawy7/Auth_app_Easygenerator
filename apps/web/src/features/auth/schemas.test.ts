import { describe, expect, it } from "vitest"
import { passwordRules, signInSchema, signUpSchema } from "./schemas"

// Same examples as the API's DTO tests, so the two rule sets can't drift.
const VALID_PASSWORDS = [
  "Passw0rd!",
  "abc123!@",
  "Zz9_____",
  "a1!".padEnd(72, "x"),
]
const INVALID_PASSWORDS = [
  "",
  "Pa1!", // too short
  "password", // no number or special
  "12345678!", // no letter
  "Password1", // no special
  "Password!", // no number
  "a1!".padEnd(73, "x"), // too long
]

const valid = { email: "jane@example.com", name: "Jane", password: "Passw0rd!" }

describe("signUpSchema", () => {
  it.each(VALID_PASSWORDS)("accepts password %j", (password) => {
    expect(signUpSchema.safeParse({ ...valid, password }).success).toBe(true)
  })

  it.each(INVALID_PASSWORDS)("rejects password %j", (password) => {
    expect(signUpSchema.safeParse({ ...valid, password }).success).toBe(false)
  })

  it("rejects an invalid email", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "jane@" }).success).toBe(
      false
    )
  })

  it("trims and lowercases the email", () => {
    const result = signUpSchema.parse({
      ...valid,
      email: "  Jane@Example.COM ",
    })
    expect(result.email).toBe("jane@example.com")
  })

  it.each(["", "Jo", "   Jo   ", "x".repeat(51)])("rejects name %j", (name) => {
    expect(signUpSchema.safeParse({ ...valid, name }).success).toBe(false)
  })

  it("trims the name", () => {
    expect(signUpSchema.parse({ ...valid, name: "  Jane  " }).name).toBe("Jane")
  })
})

describe("signInSchema", () => {
  it("does not apply strength rules", () => {
    expect(
      signInSchema.safeParse({ email: "jane@example.com", password: "x" })
        .success
    ).toBe(true)
  })

  it("requires a password", () => {
    expect(
      signInSchema.safeParse({ email: "jane@example.com", password: "" })
        .success
    ).toBe(false)
  })
})

describe("passwordRules", () => {
  // The checklist must agree with the schema, or users see all-green but get an error.
  it.each([...VALID_PASSWORDS, ...INVALID_PASSWORDS.slice(0, -1)])(
    "agrees with the schema for %j",
    (password) => {
      const allMet = passwordRules.every((rule) => rule.test(password))
      expect(allMet).toBe(
        signUpSchema.shape.password.safeParse(password).success
      )
    }
  )
})
