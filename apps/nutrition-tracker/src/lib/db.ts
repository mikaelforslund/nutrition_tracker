import "server-only";
import postgres, { type Sql, type TransactionSql } from "postgres";
import { getEnv } from "./env";

// Kept on globalThis so dev hot reloads don't leak connection pools.
const globalForDb = globalThis as typeof globalThis & { __trackerxSql?: Sql };

export function getSql(): Sql {
  if (!globalForDb.__trackerxSql) {
    const env = getEnv();
    globalForDb.__trackerxSql = postgres(env.DATABASE_URL, {
      max: env.DATABASE_POOL_MAX,
      idle_timeout: 20,
      connect_timeout: 10,
      // Supabase's transaction pooler doesn't support prepared statements.
      prepare: false,
    });
  }
  return globalForDb.__trackerxSql;
}

/**
 * Runs `work` in a transaction as the `authenticated` role with the caller's
 * JWT claims set, so row level security applies here exactly as it would for a
 * Supabase client. All user data access must go through this function.
 */
export async function withUser<T>(
  userId: string,
  work: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });

  const result = await getSql().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`set local role authenticated`;
    return work(tx);
  });

  return result as T;
}
