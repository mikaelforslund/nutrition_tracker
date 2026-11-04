"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { describeDevice } from "@/lib/device-label";
import { getEnv } from "@/lib/env";
import {
  DEVICE_COOKIE,
  LAST_PERSON_COOKIE,
  SESSION_COOKIE,
  endSession,
  resolveSession,
  sessionCookieOptions,
  startSessionFor,
  startSessionForName,
  type Device,
} from "@/lib/sessions";

export type SignInState = { message?: string };

const nameSchema = z.string().trim().min(1).max(40);

const deviceIdSchema = z.uuid();

/** This device's identity, created the first time it signs in. */
async function currentDevice(): Promise<Device> {
  const store = await cookies();
  const saved = deviceIdSchema.safeParse(store.get(DEVICE_COOKIE)?.value);
  const id = saved.success ? saved.data : randomUUID();

  store.set(DEVICE_COOKIE, id, sessionCookieOptions);

  return { id, label: describeDevice((await headers()).get("user-agent") ?? "") };
}

async function enter(sessionId: string, userId: string): Promise<never> {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, sessionCookieOptions);
  store.set(LAST_PERSON_COOKIE, userId, sessionCookieOptions);
  redirect("/m");
}

/** AUTH PLACEHOLDER: picking a profile needs no proof of identity. */
export async function choosePerson(userId: string): Promise<void> {
  if (getEnv().AUTH_MODE !== "mock") redirect("/login");

  const sessionId = await startSessionFor(userId, await currentDevice());
  if (!sessionId) redirect("/m/sign-in");

  await enter(sessionId, userId);
}

/** AUTH PLACEHOLDER: real sign-up replaces this. */
export async function addPerson(_previous: SignInState, form: FormData): Promise<SignInState> {
  if (getEnv().AUTH_MODE !== "mock") redirect("/login");

  const name = nameSchema.safeParse(form.get("name"));
  if (!name.success) return { message: "Enter a name of up to 40 characters." };

  const timezone = String(form.get("timezone") ?? "UTC");
  const session = await startSessionForName(name.data, timezone, await currentDevice());
  return enter(session.sessionId, session.userId);
}

export async function switchPerson(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;

  if (sessionId && getEnv().AUTH_MODE === "mock") {
    const userId = await resolveSession(sessionId);
    if (userId) store.set(LAST_PERSON_COOKIE, userId, sessionCookieOptions);
    await endSession(sessionId);
  }

  store.delete(SESSION_COOKIE);
  redirect("/m/sign-in");
}
