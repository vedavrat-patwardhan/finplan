import Link from "next/link";
import { AuthCard, RegisterForm } from "@/components/auth/auth-forms";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppLogo } from "@/components/brand/app-logo";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="mb-8">
        <AppLogo variant="hero" />
      </Link>
      <AuthCard
        title="create your plan."
        description="open to everyone — simple email and password."
        alternateHref="/login"
        alternateLabel="already have an account? sign in"
      >
        <RegisterForm />
      </AuthCard>
    </div>
  );
}
