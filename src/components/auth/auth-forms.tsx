"use client";

import { useActionState, startTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction, registerAction, type ActionResult } from "@/actions/auth";

const initialState: ActionResult = { success: false };

type AuthField = {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
};

function getFieldValue(form: HTMLFormElement, name: string) {
  const field = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
  return field?.value ?? "";
}

function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (prev: ActionResult, payload: Record<string, string>) => Promise<ActionResult>;
  fields: AuthField[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(
      fields.map((field) => [field.name, getFieldValue(form, field.name)])
    );
    startTransition(() => {
      formAction(payload);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {fields.map((field) => {
        const error = fieldErrors[field.name];
        const inputProps = {
          id: field.name,
          name: field.name,
          autoComplete: field.autoComplete,
          placeholder: field.placeholder,
          "aria-invalid": error ? true : undefined,
        };

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.type === "password" ? (
              <PasswordInput {...inputProps} />
            ) : (
              <Input type={field.type} {...inputProps} />
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        );
      })}
      {state.error && !Object.keys(fieldErrors).length ? (
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
