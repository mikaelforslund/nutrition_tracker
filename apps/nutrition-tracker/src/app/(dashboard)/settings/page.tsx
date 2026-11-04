import { Button, buttonClasses } from "@trackerx/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { SettingsForm } from "@/components/settings-form";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getProfile } from "@/lib/nutrition/repository";
import { listSessions } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const mockAuth = getEnv().AUTH_MODE === "mock";
  const { session: requestedSession } = await searchParams;
  const sessions = mockAuth ? await listSessions() : [];
  const viewing = sessions.find((session) => session.id === requestedSession) ?? null;

  if (mockAuth && !viewing) redirect("/");

  const user = viewing ? { id: viewing.userId } : await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  const timezones = [...new Set([profile.timezone, "UTC", ...Intl.supportedValuesOf("timeZone")])];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {viewing ? `Goals for ${viewing.displayName}` : "Goals"}
          </h1>
          <p className="text-sm text-zinc-500">
            Daily targets drive the dashboard. Current and goal weight drive the projection.
          </p>
        </div>
        <Link
          href={viewing ? `/?session=${viewing.id}` : "/"}
          className={buttonClasses("secondary", "shrink-0")}
        >
          Done
        </Link>
      </div>
      <SettingsForm profile={profile} timezones={timezones} asUserId={viewing?.userId} />
      {mockAuth ? null : (
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      )}
    </div>
  );
}
