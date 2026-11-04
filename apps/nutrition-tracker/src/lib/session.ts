import { decodeJwt } from "jose";
import { z } from "zod";

export const ACCESS_TOKEN_COOKIE = "sb-access-token";
export const REFRESH_TOKEN_COOKIE = "sb-refresh-token";

/** Refresh this long before expiry so a token can't lapse mid-request. */
const REFRESH_MARGIN_MS = 60_000;
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const sessionTokensSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().positive(),
});
export type SessionTokens = z.infer<typeof sessionTokensSchema>;

export function sessionCookies(tokens: SessionTokens) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  } as const;

  return [
    {
      name: ACCESS_TOKEN_COOKIE,
      value: tokens.access_token,
      options: { ...options, maxAge: tokens.expires_in },
    },
    {
      name: REFRESH_TOKEN_COOKIE,
      value: tokens.refresh_token,
      options: { ...options, maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS },
    },
  ];
}

export function needsRefresh(accessToken: string | undefined, now = Date.now()): boolean {
  if (!accessToken) return true;

  try {
    const { exp } = decodeJwt(accessToken);
    return exp === undefined || exp * 1000 - now < REFRESH_MARGIN_MS;
  } catch {
    return true;
  }
}

export type RefreshResult =
  | { status: "refreshed"; tokens: SessionTokens }
  /** The refresh token is no longer valid, so the session is over. */
  | { status: "rejected" }
  /** Auth couldn't be reached. The session may still be fine. */
  | { status: "unavailable" };

export async function refreshSession(
  refreshToken: string,
  config: { supabaseUrl: string; anonKey: string },
): Promise<RefreshResult> {
  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: config.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.status === 400 || response.status === 401) return { status: "rejected" };
    if (!response.ok) return { status: "unavailable" };

    return { status: "refreshed", tokens: sessionTokensSchema.parse(await response.json()) };
  } catch {
    return { status: "unavailable" };
  }
}
