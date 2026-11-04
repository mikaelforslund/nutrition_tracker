"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  StatusLabel,
} from "@trackerx/ui";
import { useActionState } from "react";
import { submitLogin, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = { step: "email", email: "" };

export function LoginForm() {
  const [state, action, isPending] = useActionState(submitLogin, INITIAL);
  const awaitingCode = state.step === "code";

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {awaitingCode ? `Enter the code we sent to ${state.email}.` : "We'll email you a sign-in code."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          {awaitingCode ? (
            <Field label="Code">
              <Input
                key="code"
                name="code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </Field>
          ) : (
            <Field label="Email">
              <Input
                key="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                defaultValue={state.email}
              />
            </Field>
          )}
          <Button type="submit" disabled={isPending}>
            {awaitingCode ? "Sign in" : "Email me a code"}
          </Button>
          {state.message ? (
            <p role="alert">
              <StatusLabel tone="critical">{state.message}</StatusLabel>
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
