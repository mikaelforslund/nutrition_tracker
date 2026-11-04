import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getEnv } from "./env";
import { ACCESS_TOKEN_COOKIE } from "./session";
import { SESSION_COOKIE, personExists, resolveSession } from "./sessions";

export type AuthUser = { id: string };

const jwksByUrl = new Map<string, JWTVerifyGetKey>();

function getJwks(supabaseUrl: string): JWTVerifyGetKey {
  let jwks = jwksByUrl.get(supabaseUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    jwksByUrl.set(supabaseUrl, jwks);
  }
  return jwks;
}

export async function verifySupabaseToken(
  token: string,
  config: { supabaseUrl: string; jwtSecret?: string },
): Promise<AuthUser | null> {
  const options = { issuer: `${config.supabaseUrl}/auth/v1`, audience: "authenticated" };

  try {
    const { payload } = config.jwtSecret
      ? await jwtVerify(token, new TextEncoder().encode(config.jwtSecret), {
          ...options,
          algorithms: ["HS256"],
        })
      : await jwtVerify(token, getJwks(config.supabaseUrl), options);

    const subject = z.uuid().safeParse(payload.sub);
    return subject.success ? { id: subject.data } : null;
  } catch {
    return null;
  }
}

/** Resolves the caller from the request context, or null if unauthenticated. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const env = getEnv();

  if (env.AUTH_MODE === "mock") {
    const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!sessionId) return { id: env.MOCK_USER_ID };

    // A removed session must not fall through to the default user, or a signed-out
    // phone would keep saving meals under someone else.
    const userId = await resolveSession(sessionId);
    return userId ? { id: userId } : null;
  }

  const authorization = (await headers()).get("authorization");
  const bearer = authorization?.match(/^Bearer (.+)$/i)?.[1];
  const token = bearer ?? (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  return verifySupabaseToken(token, {
    // Guaranteed by env validation when AUTH_MODE=supabase.
    supabaseUrl: env.SUPABASE_URL!,
    jwtSecret: env.SUPABASE_JWT_SECRET,
  });
}

/**
 * Who an action applies to. The session dashboard works on the person being viewed,
 * which is only possible with mock auth. Elsewhere asUserId is ignored, so a caller
 * can never act as someone else once real accounts exist.
 */
export async function getActingUser(asUserId: unknown): Promise<AuthUser | null> {
  if (typeof asUserId === "string" && getEnv().AUTH_MODE === "mock") {
    return (await personExists(asUserId)) ? { id: asUserId } : null;
  }
  return getCurrentUser();
}
