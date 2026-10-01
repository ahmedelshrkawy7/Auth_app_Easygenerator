import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { FieldGroup } from "@workspace/ui/components/field"
import { FormField } from "@/components/form-field"
import { getErrorMessage, getErrorStatus } from "@/lib/errors"
import { useSignUp } from "../hooks"
import { signUpSchema } from "../schemas"
import { PasswordChecklist } from "./PasswordChecklist"
import { ServerError } from "./ServerError"
import { SubmitButton } from "./SubmitButton"

export function SignUpForm() {
  const signUp = useSignUp()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched", // validate on blur, then on every change
    defaultValues: { email: "", name: "", password: "" },
  })
  const password = useWatch({ control, name: "password" })

  const onSubmit = handleSubmit((values) =>
    signUp.mutate(values, {
      onError: (error) => {
        if (getErrorStatus(error) === 409) {
          setError(
            "email",
            { message: "Email already registered" },
            { shouldFocus: true }
          )
          return
        }
        setError("root.server", { message: getErrorMessage(error) })
      },
    })
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <ServerError message={errors.root?.server?.message} />
        <FormField
          id="name"
          label="Name"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          hintId="password-rules"
          hint={<PasswordChecklist id="password-rules" password={password} />}
          {...register("password")}
        />
        <SubmitButton pending={signUp.isPending}>Create account</SubmitButton>
      </FieldGroup>
    </form>
  )
}
