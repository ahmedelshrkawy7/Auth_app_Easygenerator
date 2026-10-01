import { Link } from "react-router"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { SignUpForm } from "@/features/auth/components/SignUpForm"

export function SignUpPage() {
  return (
    <AuthCard
      title="Create an account"
      description="Enter your details to get started."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            to="/signin"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthCard>
  )
}
