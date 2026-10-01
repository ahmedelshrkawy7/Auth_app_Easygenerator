import { plainToInstance } from "class-transformer"
import { validateSync } from "class-validator"
import { SignUpDto } from "./signup.dto"

// Same examples as apps/web/src/features/auth/schemas.test.ts, so the rules can't drift.
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

function errorsFor(input: Record<string, unknown>) {
  const dto = plainToInstance(SignUpDto, input)
  return validateSync(dto).map((e) => e.property)
}

describe("SignUpDto", () => {
  it("accepts a valid payload", () => {
    expect(errorsFor(valid)).toEqual([])
  })

  it.each(VALID_PASSWORDS)("accepts password %j", (password) => {
    expect(errorsFor({ ...valid, password })).toEqual([])
  })

  it.each(INVALID_PASSWORDS)("rejects password %j", (password) => {
    expect(errorsFor({ ...valid, password })).toEqual(["password"])
  })

  it.each(["", "jane@", "not-an-email", 42])("rejects email %j", (email) => {
    expect(errorsFor({ ...valid, email })).toEqual(["email"])
  })

  it.each(["", "Jo", "   Jo   ", "x".repeat(51), 123])(
    "rejects name %j",
    (name) => {
      expect(errorsFor({ ...valid, name })).toEqual(["name"])
    }
  )

  it("trims the name and normalizes the email", () => {
    const dto = plainToInstance(SignUpDto, {
      ...valid,
      name: "  Jane  ",
      email: "  Jane@Example.COM ",
    })
    expect(dto.name).toBe("Jane")
    expect(dto.email).toBe("jane@example.com")
  })
})
