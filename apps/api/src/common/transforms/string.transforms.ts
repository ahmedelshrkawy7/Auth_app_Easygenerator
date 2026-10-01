// For class-transformer's @Transform; non-strings pass through so validators reject them.
type TransformInput = { value: unknown }

export const trim = ({ value }: TransformInput) =>
  typeof value === "string" ? value.trim() : value

export const normalizeEmail = ({ value }: TransformInput) =>
  typeof value === "string" ? value.trim().toLowerCase() : value
