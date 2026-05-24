"use client";

import { useActionState, startTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction, registerAction, type ActionResult } from "@/actions/auth";

const initialState: ActionResult = { success: false };

function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  fields: {
    name: string;
    label: string;
    type: string;
    autoComplete?: string;
    placeholder?: string;
  }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            placeholder={field.placeholder}
            required
          />
        </div>
      ))}
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait..." : submitLabel}
      </Button>
    </form>
  );
}

export function LoginForm() {
  return (
    <AuthForm
      action={loginAction}
      submitLabel="Sign in"
      fields={[
        { name: "identifier", label: "Email or username", type: "text", autoComplete: "username", placeholder: "you@example.com" },
        { name: "password", label: "Password", type: "password", autoComplete: "current-password", placeholder: "Your password" },
      ]}
    />
  );
}

export function RegisterForm() {
  return (
    <AuthForm
      action={registerAction}
      submitLabel="Create account"
      fields={[
        { name: "name", label: "Full name", type: "text", autoComplete: "name", placeholder: "Your full name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
        { name: "username", label: "Username", type: "text", autoComplete: "username", placeholder: "Choose a username" },
        { name: "password", label: "Password", type: "password", autoComplete: "new-password", placeholder: "At least 8 characters" },
      ]}
    />
  );
}

export function AuthCard({
  title,
  description,
  children,
  alternateHref,
  alternateLabel,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  alternateHref: string;
  alternateLabel: string;
}) {
  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href={alternateHref} className="text-primary underline-offset-4 hover:underline">
            {alternateLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
