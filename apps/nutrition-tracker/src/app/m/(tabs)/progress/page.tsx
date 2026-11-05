import { LargeTitle } from "@/components/mobile/ios";
import { MobileCharts } from "@/components/mobile/mobile-charts";
import { requireMobileUser } from "@/lib/mobile-session";
import { groupLogsByDay, type DayGroup } from "@/lib/nutrition/group-logs";
import { getDashboardData } from "@/lib/nutrition/repository";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await requireMobileUser();
  const { profile, today, recentLogs, weights } = await getDashboardData(user.id);

  const groups = groupLogsByDay(recentLogs, today, profile.timezone, profile.targetCalories);

  // Groups are newest first, and the charts read oldest first.
  const daily = (value: (group: DayGroup) => number) =>
    groups.map((group) => ({ day: group.day, value: value(group) })).reverse();

  return (
    <>
      <LargeTitle title="Progress" />
      <MobileCharts
        weights={weights}
        calories={daily((group) => group.calories)}
        protein={daily((group) => group.proteinG)}
        carbs={daily((group) => group.carbsG)}
        fat={daily((group) => group.fatG)}
        goalWeightKg={profile.goalWeightKg}
        targetCalories={profile.targetCalories}
      />
    </>
  );
}
