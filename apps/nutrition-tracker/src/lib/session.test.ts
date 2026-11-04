import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { needsRefresh, refreshSession } from "./session";

const config = { supabaseUrl: "https://project.supabase.co", anonKey: "anon" };

function tokenExpiringIn(seconds: number) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(new TextEncoder().encode("secret"));
}

describe("needsRefresh", () => {
  it("leaves a fresh token alone", async () => {
    expect(needsRefresh(await tokenExpiringIn(3600))).toBe(false);
  });

  it("refreshes a token close to expiry, a missing token, or garbage", async () => {
    expect(needsRefresh(await tokenExpiringIn(30))).toBe(true);
    expect(needsRefresh(undefined)).toBe(true);
    expect(needsRefresh("garbage")).toBe(true);
  });
});

describe("refreshSession", () => {
  afterEach(() => vi.unstubAllGlobals());

  const respondWith = (response: Response | Error) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (response instanceof Error) throw response;
        return response;
      }),
    );

  it("returns new tokens", async () => {
    const tokens = { access_token: "a", refresh_token: "r", expires_in: 3600 };
    respondWith(Response.json(tokens));
    expect(await refreshSession("old", config)).toEqual({ status: "refreshed", tokens });
  });

  it("ends the session when the token is refused", async () => {
    respondWith(new Response(null, { status: 400 }));
    expect(await refreshSession("old", config)).toEqual({ status: "rejected" });
  });

  it("keeps the session through an outage", async () => {
    respondWith(new Response(null, { status: 503 }));
    expect(await refreshSession("old", config)).toEqual({ status: "unavailable" });

    respondWith(new Error("network down"));
    expect(await refreshSession("old", config)).toEqual({ status: "unavailable" });
  });
});
