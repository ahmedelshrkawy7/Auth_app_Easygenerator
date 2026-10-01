import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { FieldGroup } from "@workspace/ui/components/field"
import { FormField } from "@/components/form-field"
import { getErrorMessage } from "@/lib/errors"
import { useSignIn } from "../hooks"
import { signInSchema } from "../schemas"
import { ServerError } from "./ServerError"
import { SubmitButton } from "./SubmitButton"

export function SignInForm() {
  const signIn = useSignIn()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = handleSubmit((values) =>
    signIn.mutate(values, {
      onError: (error) =>
        setError("root.server", {
          // Same message for an unknown email and a wrong password.
          message: getErrorMessage(error, { 401: "Invalid credentials" }),
        }),
    })
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <ServerError message={errors.root?.server?.message} />
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <SubmitButton pending={signIn.isPending}>Sign in</SubmitButton>
      </FieldGroup>
    </form>
  )
}
