import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  needsRefresh,
  refreshSession,
  sessionCookies,
} from "@/lib/session";

/**
 * Renews expiring sessions. This has to happen here because server components
 * can't set cookies. It only keeps tokens fresh: authorization stays in
 * getCurrentUser and row level security.
 */
export async function proxy(request: NextRequest) {
  const { AUTH_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (AUTH_MODE !== "supabase" || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken || !needsRefresh(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const result = await refreshSession(refreshToken, {
    supabaseUrl: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  });

  if (result.status === "unavailable") return NextResponse.next();

  if (result.status === "rejected") {
    request.cookies.delete([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]);
    const response = forwardCookies(request);
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  const cookies = sessionCookies(result.tokens);
  for (const { name, value } of cookies) request.cookies.set(name, value);

  // The current request needs the new token too, not just the browser.
  const response = forwardCookies(request);
  for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
  return response;
}

function forwardCookies(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("cookie", request.cookies.toString());
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};
