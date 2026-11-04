import { SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "./env";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

const { getActingUser, verifySupabaseToken } = await import("./auth");

const supabaseUrl = "https://project.supabase.co";
const jwtSecret = "test-secret-that-is-long-enough-for-hs256";
const userId = "00000000-0000-4000-8000-000000000001";

function token(overrides: { secret?: string; issuer?: string; audience?: string; expires?: string; sub?: string } = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(overrides.sub ?? userId)
    .setIssuer(overrides.issuer ?? `${supabaseUrl}/auth/v1`)
    .setAudience(overrides.audience ?? "authenticated")
    .setExpirationTime(overrides.expires ?? "1h")
    .sign(new TextEncoder().encode(overrides.secret ?? jwtSecret));
}

const verify = (value: string) => verifySupabaseToken(value, { supabaseUrl, jwtSecret });

describe("verifySupabaseToken", () => {
  it("accepts a valid token", async () => {
    expect(await verify(await token())).toEqual({ id: userId });
  });

  it("rejects a token signed with another secret", async () => {
    expect(await verify(await token({ secret: "another-secret-that-is-long-enough-x" }))).toBeNull();
  });

  it("rejects the wrong issuer, audience, or subject", async () => {
    expect(await verify(await token({ issuer: "https://evil.example.com/auth/v1" }))).toBeNull();
    expect(await verify(await token({ audience: "anon" }))).toBeNull();
    expect(await verify(await token({ sub: "not-a-uuid" }))).toBeNull();
  });

  it("rejects an expired token", async () => {
    expect(await verify(await token({ expires: "1 hour ago" }))).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verify("not.a.token")).toBeNull();
  });
});

describe("getActingUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvForTests();
  });

  it("ignores the override outside mock auth, so nobody can act as someone else", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://unused");
    vi.stubEnv("AUTH_MODE", "supabase");
    vi.stubEnv("SUPABASE_URL", supabaseUrl);
    vi.stubEnv("SUPABASE_ANON_KEY", "anon");
    resetEnvForTests();
    vi.mocked(headers).mockResolvedValue(new Headers() as never);
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);

    expect(await getActingUser(userId)).toBeNull();
  });
});
