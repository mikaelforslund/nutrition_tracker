"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  sessionCookies,
  sessionTokensSchema,
} from "@/lib/session";

export type LoginState = { step: "email" | "code"; email: string; message?: string };

const emailSchema = z.email().max(320);
const codeSchema = z.string().trim().regex(/^\d{6,10}$/);

function authClient() {
  const env = getEnv();
  return {
    // Guaranteed by env validation when AUTH_MODE=supabase.
    url: `${env.SUPABASE_URL!}/auth/v1`,
    headers: { apikey: env.SUPABASE_ANON_KEY!, "Content-Type": "application/json" },
  };
}

async function requestCode(email: string): Promise<LoginState> {
  const auth = authClient();
  const response = await fetch(`${auth.url}/otp`, {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({ email, create_user: true }),
  });

  if (response.status === 429) {
    return { step: "email", email, message: "Too many attempts. Wait a minute and try again." };
  }
  if (!response.ok) {
    console.error(`sign-in code request failed with status ${response.status}`);
    return { step: "email", email, message: "We couldn't send a code. Try again." };
  }

  return { step: "code", email };
}

async function verifyCode(email: string, code: string): Promise<LoginState> {
  const auth = authClient();
  const response = await fetch(`${auth.url}/verify`, {
    method: "POST",
    headers: auth.headers,
    body: JSON.stringify({ type: "email", email, token: code }),
  });

  if (!response.ok) {
    return { step: "code", email, message: "That code is wrong or has expired." };
  }

  const tokens = sessionTokensSchema.parse(await response.json());
  const store = await cookies();
  for (const { name, value, options } of sessionCookies(tokens)) {
    store.set(name, value, options);
  }

  redirect("/");
}

export async function submitLogin(previous: LoginState, form: FormData): Promise<LoginState> {
  if (getEnv().AUTH_MODE !== "supabase") redirect("/");

  if (previous.step === "email") {
    const email = emailSchema.safeParse(form.get("email"));
    if (!email.success) {
      return { step: "email", email: "", message: "Enter a valid email address." };
    }
    return requestCode(email.data);
  }

  const code = codeSchema.safeParse(form.get("code"));
  if (!code.success) {
    return { ...previous, message: "Enter the code from your email." };
  }
  return verifyCode(previous.email, code.data);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;

  if (accessToken && getEnv().AUTH_MODE === "supabase") {
    const auth = authClient();
    // Best effort: the local cookies are cleared whether or not this succeeds.
    await fetch(`${auth.url}/logout`, {
      method: "POST",
      headers: { ...auth.headers, Authorization: `Bearer ${accessToken}` },
    }).catch((error) => console.error("sign-out request failed", error));
  }

  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
  redirect("/login");
}
