import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, type AuthUser } from "./auth";
import { getEnv } from "./env";
import { SESSION_COOKIE, resolveSession } from "./sessions";

/** AUTH PLACEHOLDER: in mock mode this only asks which profile a device picked. */
export async function requireMobileUser(): Promise<AuthUser> {
  if (getEnv().AUTH_MODE === "supabase") {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    return user;
  }

  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = sessionId ? await resolveSession(sessionId) : null;
  if (!userId) redirect("/m/sign-in");

  return { id: userId };
}
