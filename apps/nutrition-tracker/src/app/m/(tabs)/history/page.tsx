import { Trophy } from "lucide-react";
import { LargeTitle, Section } from "@/components/mobile/ios";
import { MealCell } from "@/components/mobile/meal-cell";
import { requireMobileUser } from "@/lib/mobile-session";
import { groupLogsByDay } from "@/lib/nutrition/group-logs";
import { getDashboardData } from "@/lib/nutrition/repository";
import { burnedByDay } from "@/lib/nutrition/workouts";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireMobileUser();
  const { profile, today, recentLogs, workouts } = await getDashboardData(user.id);
  const groups = groupLogsByDay(
    recentLogs,
    today,
    profile.timezone,
    profile.targetCalories,
    burnedByDay(workouts),
  );

  return (
    <>
      <LargeTitle title="History" />
      {groups.length === 0 ? (
        <p className="px-8 pt-12 text-center text-ios-secondary">Meals you log will appear here.</p>
      ) : null}
      {groups.map((group) => (
        <Section
          key={group.day}
          header={group.label}
          trailing={
            <span className="flex items-center gap-1 normal-case">
              <Trophy
                aria-hidden
                className="size-3.5"
                fill={group.goalScore >= 90 ? "currentColor" : "none"}
              />
              {group.goalScore}% of goal
            </span>
          }
          footer={
            group.burned > 0
              ? `${group.calories.toLocaleString("en-US")} kcal eaten, ${group.burned.toLocaleString("en-US")} burned`
              : `${group.calories.toLocaleString("en-US")} kcal`
          }
        >
          {group.meals.map((meal) => (
            <MealCell key={meal.id} meal={meal} />
          ))}
        </Section>
      ))}
    </>
  );
}
