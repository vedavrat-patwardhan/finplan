import Link from "next/link";
import { AuthCard, LoginForm } from "@/components/auth/auth-forms";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/brand/app-logo";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="mb-8">
        <AppLogo variant="hero" />
      </Link>
      <AuthCard
        title="welcome back."
        description="sign in to continue planning your goals."
        alternateHref="/register"
        alternateLabel="create an account"
      >
        <LoginForm />
      </AuthCard>
      <Link href="/" className="np-caps mt-6 text-muted-foreground hover:text-foreground">
        back to home
      </Link>
    </div>
  );
}
