import { z } from "zod"

// Keep in sync with the API's common/constants/validation.constants.ts.
// Both sides test the same valid/invalid examples so they can't drift.
export const NAME_MIN = 3
export const NAME_MAX = 50
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72 // argon2 is fine with more, but cap input size
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

/** Drives the live checklist; together these are equivalent to PASSWORD_REGEX + min length. */
export const passwordRules = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN} characters`,
    test: (v: string) => v.length >= PASSWORD_MIN,
  },
  {
    id: "letter",
    label: "At least one letter",
    test: (v: string) => /[A-Za-z]/.test(v),
  },
  {
    id: "number",
    label: "At least one number",
    test: (v: string) => /\d/.test(v),
  },
  {
    id: "special",
    label: "At least one special character",
    test: (v: string) => /[^A-Za-z\d]/.test(v),
  },
] as const

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .pipe(z.email("Enter a valid email address"))

export const signUpSchema = z.object({
  email,
  name: z
    .string()
    .trim()
    .min(NAME_MIN, `Name must be at least ${NAME_MIN} characters`)
    .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters`),
  password: z
    .string()
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`)
    .regex(
      PASSWORD_REGEX,
      "Password must include a letter, a number and a special character"
    ),
})

// Sign-in only checks presence: strength rules may change after sign-up.
export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
})

export type SignUpInput = z.output<typeof signUpSchema>
export type SignInInput = z.output<typeof signInSchema>
