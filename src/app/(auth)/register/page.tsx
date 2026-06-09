import Link from "next/link";
import { AuthCard, RegisterForm } from "@/components/auth/auth-forms";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mb-8 text-center">
        <Link href="/" className="font-heading text-3xl font-semibold tracking-tight">
          FinPlan
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          Start planning marriage, home, and more
        </p>
      </div>
      <AuthCard
        title="Create your account"
        description="Open to everyone — simple email and password"
        alternateHref="/login"
        alternateLabel="Already have an account? Sign in"
      >
        <RegisterForm />
      </AuthCard>
    </div>
  );
}
