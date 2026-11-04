import { ChevronRight, Utensils } from "lucide-react";
import Link from "next/link";
import type { DayGroup } from "@/lib/nutrition/group-logs";

export function MealCell({ meal }: { meal: DayGroup["meals"][number] }) {
  return (
    <Link
      href={`/m/meals/${meal.id}`}
      prefetch={false}
      className="flex items-center gap-3 px-4 py-2.5 active:bg-ios-fill"
    >
      {meal.imageUrl ? (
        <img src={meal.imageUrl} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-ios-fill">
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
