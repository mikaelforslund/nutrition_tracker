import { cn } from "@trackerx/ui";
import { ChevronRight, Utensils } from "lucide-react";
import Link from "next/link";
import type { DayGroup } from "@/lib/nutrition/group-logs";

export function MealCell({
  meal,
  compact = false,
}: {
  meal: DayGroup["meals"][number];
  compact?: boolean;
}) {
  const image = compact ? "size-9" : "size-12";

  return (
    <Link
      href={`/m/meals/${meal.id}`}
      prefetch={false}
      className={cn(
        "flex items-center gap-3 px-4 active:bg-ios-fill",
        compact ? "py-1.5 text-[15px]" : "py-2.5",
      )}
    >
      {meal.imageUrl ? (
        <img src={meal.imageUrl} alt="" loading="lazy" className={cn(image, "shrink-0 rounded-lg object-cover")} />
      ) : (
        <span className={cn(image, "flex shrink-0 items-center justify-center rounded-lg bg-ios-fill")}>
          <Utensils aria-hidden className="size-5 text-ios-secondary" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{meal.foodName}</span>
        <span className="block text-[13px] text-ios-secondary">{meal.time}</span>
      </span>
      <span className="text-ios-secondary">{meal.calories.toLocaleString("en-US")}</span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ios-tertiary" />
    </Link>
  );
}
