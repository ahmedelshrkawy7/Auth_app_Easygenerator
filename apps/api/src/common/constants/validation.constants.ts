// Keep in sync with apps/web/src/features/auth/schemas.ts.
// Both sides test the same valid/invalid examples so they can't drift.
export const NAME_MIN = 3
export const NAME_MAX = 50
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72 // bounds hashing cost per request
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/
export const PASSWORD_REGEX_MESSAGE =
  "password must include a letter, a number and a special character"
