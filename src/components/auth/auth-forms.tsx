"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction, registerAction, type ActionResult } from "@/actions/auth";

const initialState: ActionResult = { success: false };

const TRIMMED_FIELDS = new Set(["identifier", "username", "email", "name"]);

type AuthField = {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
};

function getFieldValue(form: HTMLFormElement, name: string) {
  const field = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
  const value = field?.value ?? "";
  return TRIMMED_FIELDS.has(name) ? value.trim() : value;
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
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());
  const [dismissedGeneralError, setDismissedGeneralError] = useState(false);

  useEffect(() => {
    setDismissedErrors(new Set());
    setDismissedGeneralError(false);
  }, [state.fieldErrors, state.error]);

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

  function dismissFieldError(fieldName: string) {
    setDismissedErrors((prev) => new Set(prev).add(fieldName));
    setDismissedGeneralError(true);
  }

  const showGeneralError =
    state.error && !Object.keys(fieldErrors).length && !dismissedGeneralError;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {fields.map((field) => {
        const error = dismissedErrors.has(field.name) ? undefined : fieldErrors[field.name];
        const inputProps = {
          id: field.name,
          name: field.name,
          autoComplete: field.autoComplete,
          placeholder: field.placeholder,
          "aria-invalid": error ? true : undefined,
          onChange: () => dismissFieldError(field.name),
        };

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.type === "password" ? (
              <PasswordInput {...inputProps} />
            ) : (
              <Input type={field.type} {...inputProps} />
            )}
            {error ? <p className="mt-1 text-xs font-semibold text-destructive">{error}</p> : null}
          </div>
        );
      })}
      {showGeneralError ? (
        <p className="text-xs font-semibold text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" variant="default" size="lg" className="w-full" disabled={pending}>
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
    <Card elevated className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-[22px] font-extrabold tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
        <p className="mt-6 text-sm text-muted-foreground">
          <Button variant="link" render={<Link href={alternateHref} />}>
            {alternateLabel}
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
