import { createHash } from "node:crypto";
import { Card, CardContent, KpiCard, buttonClasses, type KpiCardProps } from "@trackerx/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DbViewer } from "@/components/db-viewer";
import { FoodCapture } from "@/components/food-capture";
import { FoodLogTree } from "@/components/food-log-tree";
import { LiveRefresh } from "@/components/live-refresh";
import { ProgressChart } from "@/components/progress-chart";
import { ProjectionCard } from "@/components/projection-card";
import { SessionsPanel } from "@/components/sessions-panel";
import { WorkoutsPanel } from "@/components/workouts-panel";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { groupLogsByDay, type DayGroup } from "@/lib/nutrition/group-logs";
import { projectGoalWeight } from "@/lib/nutrition/projection";
import { burnedByDay } from "@/lib/nutrition/workouts";
import { MEAL_WINDOW_DAYS, getDashboardData } from "@/lib/nutrition/repository";
import { sortSessions, type SessionSort } from "@/lib/session-summary";
import { listSessions } from "@/lib/sessions";

export const dynamic = "force-dynamic";

/** Async so the clock is read per request rather than during render. */
async function currentTime() {
  return Date.now();
}

const whole = (value: number) => Math.round(value).toLocaleString("en-US");

function calorieCard(eaten: number, burned: number, target: number): KpiCardProps {
  const net = eaten - burned;
  const remaining = target - net;
  const over = remaining < 0;

  return {
    label: "Calorie balance",
    value: whole(Math.abs(remaining)),
    unit: over ? "kcal over" : "kcal left",
    caption:
      burned > 0
        ? `${whole(eaten)} eaten, ${whole(burned)} burned, of ${whole(target)} kcal`
        : `${whole(eaten)} of ${whole(target)} kcal eaten`,
    status: over ? { tone: "warning", label: "Over target" } : undefined,
    progress: { value: net, max: target, tone: over ? "warning" : "default" },
  };
}

function macroCard(label: string, eaten: number, target: number, floor = false): KpiCardProps {
  const over = eaten > target;

  return {
    label,
    value: whole(eaten),
    unit: "g",
    caption: `of ${whole(target)} g target`,
    // Protein is a minimum to reach. The other macros are limits to stay under.
    status:
      floor && eaten >= target
        ? { tone: "good", label: "Target met" }
        : !floor && over
          ? { tone: "warning", label: "Over target" }
          : undefined,
    progress: { value: eaten, max: target, tone: !floor && over ? "warning" : "default" },
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string | string[]; sort?: string | string[] }>;
}) {
  // With mock auth this page tracks sessions, so what it shows comes from the
  // selection. Otherwise it's the signed-in user's own dashboard.
  const sessionsEnabled = getEnv().AUTH_MODE === "mock";
  const sessions = sessionsEnabled ? await listSessions() : [];
  const { session: requestedSession, sort: requestedSort } = await searchParams;
  const sort: SessionSort = requestedSort === "oldest" ? "oldest" : "newest";

  // Sessions arrive most recently used first, so this opens on the latest live one.
  const viewing =
    sessions.find((session) => session.id === requestedSession) ??
    sessions.find((session) => !session.endedAt) ??
    sessions[0] ??
    null;
  const now = await currentTime();

  const panel = sessionsEnabled ? (
    <SessionsPanel
      sessions={sortSessions(sessions, sort)}
      selectedId={viewing?.id ?? null}
      protectedUserId={getEnv().MOCK_USER_ID}
      sort={sort}
      now={now}
    />
  ) : null;

  if (sessionsEnabled && !viewing) {
    return (
      <div className="grid items-start gap-3 xl:grid-cols-[28rem_minmax(0,1fr)]">
        <LiveRefresh />
        {panel}
        <Card>
          <CardContent className="py-16 text-center">
            <h1 className="text-base font-semibold">No sessions yet</h1>
            <p className="mt-1 text-sm text-zinc-500">
              When someone opens the app on their phone and enters their name, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const user = viewing ? { id: viewing.userId } : await getCurrentUser();
  if (!user) redirect("/login");

  const asUserId = viewing?.userId;
  const { profile, today, todayTotals, recentDays, recentLogs, weights, workouts } = await getDashboardData(
    user.id,
  );

  const burned = burnedByDay(workouts);

  const projection = projectGoalWeight({
    currentWeightKg: profile.currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
    dailyCalories: recentDays.map(({ day, calories }) => calories - (burned.get(day) ?? 0)),
    today,
  });

  const heading = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  // Changes when the data does, which tells an open database viewer to reload.
  const revision = createHash("sha256")
    .update(JSON.stringify([profile, recentLogs, weights, workouts]))
    .digest("hex");

  const groups = groupLogsByDay(recentLogs, today, profile.timezone, profile.targetCalories, burned);

  // Groups are newest first, and the chart reads oldest first.
  const dailySeries = (value: (group: DayGroup) => number) =>
    groups.map((group) => ({ day: group.day, value: value(group) })).reverse();

  const goalsHref = viewing ? `/settings?session=${viewing.id}` : "/settings";

  const dashboard = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{viewing?.displayName ?? "Today"}</h1>
          <p className="text-sm text-zinc-500">
            {viewing ? `Today, ${heading} on ${viewing.deviceLabel}` : heading}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getEnv().ENABLE_DB_VIEWER === "true" ? (
            <DbViewer key={user.id} revision={revision} asUserId={asUserId} />
          ) : null}
          {/* Until goals exist, the projection card offers "Set goals" instead. */}
          {projection.status === "needs_profile" ? null : (
            <Link href={goalsHref} className={buttonClasses("secondary")}>
              Edit goals
            </Link>
          )}
        </div>
      </div>

      <section aria-label="Today's totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          {...calorieCard(todayTotals.calories, burned.get(today) ?? 0, profile.targetCalories)}
        />
        <KpiCard {...macroCard("Protein", todayTotals.proteinG, profile.targetProteinG, true)} />
        <KpiCard {...macroCard("Carbs", todayTotals.carbsG, profile.targetCarbsG)} />
        <KpiCard {...macroCard("Fat", todayTotals.fatG, profile.targetFatG)} />
      </section>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="min-w-0 md:col-span-2">
          <FoodCapture key={user.id} asUserId={asUserId} today={today} />
        </div>
        <div className="min-w-0 md:col-span-3">
          <ProjectionCard projection={projection} profile={profile} goalsHref={goalsHref} />
        </div>
      </div>

      <FoodLogTree
        key={user.id}
        groups={groups}
        windowDays={MEAL_WINDOW_DAYS}
        asUserId={asUserId}
        today={today}
        workouts={<WorkoutsPanel workouts={workouts} today={today} asUserId={asUserId} />}
        aboveList={
          <ProgressChart
            key={user.id}
            weights={weights}
            calories={dailySeries((group) => group.calories)}
            protein={dailySeries((group) => group.proteinG)}
            carbs={dailySeries((group) => group.carbsG)}
            fat={dailySeries((group) => group.fatG)}
            goalWeightKg={profile.goalWeightKg}
            targetCalories={profile.targetCalories}
            asUserId={asUserId}
          />
        }
      />

    </div>
  );

  if (!panel) {
    return (
      <>
        <LiveRefresh />
        {dashboard}
      </>
    );
  }

  return (
    <div className="grid items-start gap-3 xl:grid-cols-[28rem_minmax(0,1fr)]">
      <LiveRefresh />
      {panel}
      {dashboard}
    </div>
  );
}
