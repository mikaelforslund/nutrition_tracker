import "server-only";
import { z } from "zod";
import { getSql } from "./db";

/**
 * A local stand-in for accounts, used only with AUTH_MODE=mock. People pick a
 * profile with no password, so nothing here proves who anyone is.
 *
 * These queries run as the server's own database role rather than through
 * withUser, because they span every user. Don't call them from cloud code paths.
 */
export const SESSION_COOKIE = "m-session";
/** Identifies this device across sign-ins, so a session can be reopened. */
export const DEVICE_COOKIE = "m-device";
/** Who last used this device, so the switch screen can offer only them. */
export const LAST_PERSON_COOKIE = "m-last-person";

const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_TIMEZONE = "UTC";
const SESSION_LIST_LIMIT = 500;

export const sessionCookieOptions = {
  httpOnly: true,
  // Phone mode runs over plain http on the local network.
  secure: false,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
} as const;

export type Person = { userId: string; displayName: string };

export type SessionSummary = {
  id: string;
  userId: string;
  displayName: string;
  deviceLabel: string;
  timezone: string;
  createdAt: Date;
  lastSeenAt: Date;
  endedAt: Date | null;
};

export async function personExists(userId: string): Promise<boolean> {
  if (!z.uuid().safeParse(userId).success) return false;

  const [person] = await getSql()`
    select 1 from app_nutrition.user_profiles where user_id = ${userId}
  `;
  return person !== undefined;
}

export async function findPerson(userId: string): Promise<Person | null> {
  if (!z.uuid().safeParse(userId).success) return null;

  const [person] = await getSql()<Person[]>`
    select user_id as "userId", display_name as "displayName"
    from app_nutrition.user_profiles
    where user_id = ${userId} and display_name is not null
  `;
  return person ?? null;
}

export type Device = { id: string; label: string };

/**
 * A session is one person on one device, so this reopens theirs if it exists.
 * Sessions from before device ids have none, and are adopted by matching the label.
 */
async function openSession(userId: string, device: Device): Promise<string> {
  const label = device.label.slice(0, 100);

  const sessionId = await getSql().begin(async (tx) => {
    const [existing] = await tx<{ id: string }[]>`
      select id from app_nutrition.device_sessions
      where user_id = ${userId}
        and (device_id = ${device.id} or (device_id is null and device_label = ${label}))
      order by device_id is null, last_seen_at desc
      limit 1
      for update
    `;

    if (existing) {
      await tx`
        update app_nutrition.device_sessions
        set device_id = ${device.id}, device_label = ${label}, ended_at = null, last_seen_at = now()
        where id = ${existing.id}
      `;
      return existing.id;
    }

    // The conflict clause covers a double tap racing past the check above.
    const [created] = await tx<{ id: string }[]>`
      insert into app_nutrition.device_sessions (user_id, device_id, device_label)
      values (${userId}, ${device.id}, ${label})
      on conflict (user_id, device_id) do update
      set ended_at = null, last_seen_at = now()
      returning id
    `;
    if (!created) throw new Error("Session insert returned no row");
    return created.id;
  });

  return sessionId as string;
}

/** Returns null if the person doesn't exist. */
export async function startSessionFor(userId: string, device: Device): Promise<string | null> {
  const [person] = await getSql()`
    select 1 from app_nutrition.user_profiles
    where user_id = ${userId} and display_name is not null
  `;
  return person ? openSession(userId, device) : null;
}

/** Reuses an existing person with the same name, ignoring case. */
export async function startSessionForName(
  displayName: string,
  timezone: string,
  device: Device,
): Promise<{ sessionId: string; userId: string }> {
  const userId = await getSql().begin(async (tx) => {
    const [existing] = await tx<{ userId: string }[]>`
      select user_id as "userId" from app_nutrition.user_profiles
      where lower(display_name) = lower(${displayName})
    `;
    if (existing) return existing.userId;

    const [zone] = await tx`select 1 from pg_timezone_names where name = ${timezone}`;
    const [user] = await tx<{ id: string }[]>`insert into auth.users default values returning id`;
    if (!user) throw new Error("User insert returned no row");

    await tx`
      insert into app_nutrition.user_profiles (user_id, display_name, timezone)
      values (${user.id}, ${displayName}, ${zone ? timezone : DEFAULT_TIMEZONE})
    `;
    return user.id;
  });

  return {
    sessionId: await openSession(userId as string, device),
    userId: userId as string,
  };
}

/** Finds a session's owner and records that it's still in use. */
export async function resolveSession(id: string): Promise<string | null> {
  if (!z.uuid().safeParse(id).success) return null;

  const [session] = await getSql()<{ userId: string; stale: boolean }[]>`
    select user_id as "userId", last_seen_at < now() - interval '30 seconds' as stale
    from app_nutrition.device_sessions
    where id = ${id} and ended_at is null
  `;
  if (!session) return null;

  if (session.stale) {
    await getSql()`update app_nutrition.device_sessions set last_seen_at = now() where id = ${id}`;
  }
  return session.userId;
}

/** Signs a device out. The record stays, so it still shows as an ended session. */
export async function endSession(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  await getSql()`
    update app_nutrition.device_sessions
    set ended_at = now()
    where id = ${id} and ended_at is null
  `;
}

/** Erases a session's record completely. */
export async function eraseSession(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  await getSql()`delete from app_nutrition.device_sessions where id = ${id}`;
}

/** Deletes a person, which cascades to their sessions and meals. Returns their photos. */
export async function removePerson(userId: string): Promise<string[]> {
  const urls = await getSql().begin(async (tx) => {
    const images = await tx<{ imageUrl: string }[]>`
      select image_url as "imageUrl" from app_nutrition.food_logs
      where user_id = ${userId} and image_url is not null
    `;
    await tx`delete from auth.users where id = ${userId}`;
    return images.map(({ imageUrl }) => imageUrl);
  });

  return urls as string[];
}

/** Changes whenever a session starts, ends, or is used. */
export async function sessionsVersion(): Promise<string> {
  const [row] = await getSql()<{ version: string }[]>`
    select concat_ws(':', count(*), count(ended_at), max(last_seen_at)) as version
    from app_nutrition.device_sessions
  `;
  return row?.version ?? "";
}

/** Every session, most recently used first. */
export async function listSessions(): Promise<SessionSummary[]> {
  const sessions = await getSql()<SessionSummary[]>`
    select
      s.id,
      s.user_id as "userId",
      coalesce(p.display_name, 'Unknown') as "displayName",
      s.device_label as "deviceLabel",
      coalesce(p.timezone, 'UTC') as timezone,
      s.created_at as "createdAt",
      s.last_seen_at as "lastSeenAt",
      s.ended_at as "endedAt"
    from app_nutrition.device_sessions s
    left join app_nutrition.user_profiles p on p.user_id = s.user_id
    order by s.last_seen_at desc
    limit ${SESSION_LIST_LIMIT}
  `;
  return [...sessions];
}
