import { Card, CardContent, CardDescription, CardHeader, CardTitle, buttonClasses } from "@trackerx/ui";
import Link from "next/link";
import type { Projection } from "@/lib/nutrition/projection";
import type { Profile } from "@/lib/nutrition/repository";

const FALLBACK_HEADLINE: Record<Exclude<Projection["status"], "on_track">, string> = {
  needs_profile: "Set your goal",
  needs_data: "Not enough data yet",
  reached: "Goal reached",
  off_track: "No date to project",
};

const NOT_SET = "Not set";

const amount = (value: number | null, unit: string) =>
  value === null ? NOT_SET : `${value.toLocaleString("en-US")} ${unit}`;

function goalRows(profile: Profile) {
  return [
    ["Calories", amount(profile.targetCalories, "kcal")],
    ["Protein", amount(profile.targetProteinG, "g")],
    ["Carbs", amount(profile.targetCarbsG, "g")],
    ["Fat", amount(profile.targetFatG, "g")],
    ["Current weight", amount(profile.currentWeightKg, "kg")],
    ["Goal weight", amount(profile.goalWeightKg, "kg")],
  ] as const;
}

export function ProjectionCard({
  projection,
  profile,
  goalsHref = "/settings",
}: {
  projection: Projection;
  profile: Profile;
  goalsHref?: string;
}) {
  const onTrack = projection.status === "on_track";

  return (
    <Card className="h-full">
      <div className="flex h-full flex-wrap">
        <div className="min-w-48 flex-1">
          <CardHeader className="p-3.5 pb-0">
            <CardTitle>Goal weight projection</CardTitle>
            <CardDescription className="text-xs">
              Target milestone date, based on your last 7 full days
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 p-3.5 pt-2">
            <p className="text-2xl font-semibold tracking-tight">
              {onTrack ? projection.targetDate : FALLBACK_HEADLINE[projection.status]}
            </p>
            <p className="max-w-2xl text-xs text-zinc-600">{projection.message}</p>
            {onTrack ? (
              <p className="text-xs text-zinc-500">
                An estimate that assumes you burn about 30 kcal per kg of body weight, 7,700 kcal per kg lost, and steady intake.
              </p>
            ) : null}
            {projection.status === "needs_profile" ? (
              <Link
                href={goalsHref}
                className={buttonClasses("secondary", "mt-1 h-7 self-start px-2.5 text-xs")}
              >
                Set goals
              </Link>
            ) : null}
          </CardContent>
        </div>

        <section aria-label="Current goals" className="w-52 shrink-0 grow p-3.5 sm:grow-0">
          <h3 className="text-xs font-semibold">Current goals</h3>
          <dl className="mt-1 flex flex-col text-xs leading-[1.1rem]">
            {goalRows(profile).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-zinc-500">{label}</dt>
                <dd
                  className={
                    value === NOT_SET
                      ? "text-zinc-500"
                      : "font-medium whitespace-nowrap text-zinc-950 tabular-nums"
                  }
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Card>
  );
}
