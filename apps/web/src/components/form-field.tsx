import type { ComponentProps, ReactNode } from "react"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

type FormFieldProps = ComponentProps<"input"> & {
  id: string
  label: string
  error?: string
  /** Extra help rendered under the input, e.g. a password checklist. */
  hint?: ReactNode
  hintId?: string
}

/** Label + input + error, with the aria wiring screen readers need. */
export function FormField({
  id,
  label,
  error,
  hint,
  hintId,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${id}-error`
  const describedBy =
    [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint}
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  )
}
