import { Link } from "react-router"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { SignInForm } from "@/features/auth/components/SignInForm"

export function SignInPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Enter your details to continue."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <SignInForm />
    </AuthCard>
  )
}
