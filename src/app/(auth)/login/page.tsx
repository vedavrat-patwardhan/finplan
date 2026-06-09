import Link from "next/link";
import { AuthCard, LoginForm } from "@/components/auth/auth-forms";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 text-center">
        <Link href="/" className="font-heading text-3xl font-semibold tracking-tight">
          FinPlan
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          Your personal finance planning companion
        </p>
      </div>
      <AuthCard
        title="Welcome back"
        description="Sign in to continue planning your goals"
        alternateHref="/register"
        alternateLabel="Create an account"
      >
        <LoginForm />
      </AuthCard>
      <Link href="/" className="mt-4 text-sm text-primary underline-offset-4 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
