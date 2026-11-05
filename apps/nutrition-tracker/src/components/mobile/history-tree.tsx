"use client";

import { cn } from "@trackerx/ui";
import { ChevronRight, Dumbbell, Trophy } from "lucide-react";
import { useState, useTransition } from "react";
import { loadHistoryDay, loadHistoryMonth } from "@/app/m/actions";
import {
  monthLabel,
  monthSummary,
  shortDayLabel,
  type HistoryDay,
  type HistoryDayDetail,
  type HistoryMonth,
} from "@/lib/nutrition/history";
import { formatDuration } from "@/lib/session-summary";
import { MealCell } from "./meal-cell";

const kcal = (value: number) => value.toLocaleString("en-US");

function DayDetail({ day, detail }: { day: HistoryDay; detail: HistoryDayDetail | undefined }) {
  return (
    <div className="bg-ios-bg/50">
      <p className="px-4 pt-1 pb-1.5 text-[13px] text-ios-secondary">
        {day.proteinG} g protein, {day.carbsG} g carbs, {day.fatG} g fat
        {day.burned > 0 ? `, ${kcal(day.burned)} kcal burned` : ""}
      </p>
      {detail ? (
        <div className="divide-y divide-ios-separator">
          {detail.meals.map((meal) => (
            <MealCell key={meal.id} meal={meal} compact />
          ))}
          {detail.workouts.map((workout) => (
            <div key={workout.id} className="flex items-center gap-3 px-4 py-1.5 text-[15px]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ios-fill">
                <Dumbbell aria-hidden className="size-4 text-ios-secondary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{workout.workoutType}</span>
                <span className="block text-[12px] text-ios-secondary">
                  {formatDuration(workout.durationMinutes * 60_000)}
                </span>
              </span>
              <span className="pr-7 text-ios-secondary">−{kcal(workout.caloriesBurned)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p role="status" className="px-4 pb-2 text-[13px] text-ios-secondary">
          Loading…
        </p>
      )}
    </div>
  );
}

function DayRow({
  day,
  expanded,
  detail,
  onToggle,
}: {
  day: HistoryDay;
  expanded: boolean;
  detail: HistoryDayDetail | undefined;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-2 px-4 py-1.5 text-left active:bg-ios-fill"
      >
        <ChevronRight
          aria-hidden
          className={cn("size-4 shrink-0 text-ios-tertiary transition-transform", expanded && "rotate-90")}
        />
        <span className="w-16 shrink-0 font-medium">{shortDayLabel(day.day)}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ios-secondary">
          {day.meals} {day.meals === 1 ? "meal" : "meals"}
        </span>
        <span className="tabular-nums">{kcal(day.calories)}</span>
        <span className="flex w-14 shrink-0 items-center justify-end gap-1 text-[13px] text-ios-secondary tabular-nums">
          {day.goalScore === null ? null : (
            <>
              <Trophy
                aria-hidden
                className="size-3.5"
                fill={day.goalScore >= 90 ? "currentColor" : "none"}
              />
              {day.goalScore}%
            </>
          )}
        </span>
      </button>
      {expanded ? <DayDetail day={day} detail={detail} /> : null}
    </div>
  );
}

export function HistoryTree({ initial }: { initial: HistoryMonth }) {
  const [months, setMonths] = useState<HistoryMonth[]>([initial]);
  const [closedMonths, setClosedMonths] = useState<ReadonlySet<string>>(() => new Set());
  const [openDays, setOpenDays] = useState<ReadonlySet<string>>(() => new Set());
  const [details, setDetails] = useState<Record<string, HistoryDayDetail>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();

  const earlier = months[months.length - 1]?.earlierMonth ?? null;

  function toggleMonth(month: string) {
    setClosedMonths((current) => {
      const next = new Set(current);
      if (!next.delete(month)) next.add(month);
      return next;
    });
  }

  function toggleDay(day: string) {
    setOpenDays((current) => {
      const next = new Set(current);
      if (!next.delete(day)) next.add(day);
      return next;
    });

    if (details[day]) return;

    setError(null);
    void loadHistoryDay(day).then(
      (detail) => {
        if (detail) setDetails((current) => ({ ...current, [day]: detail }));
        else setError("That day couldn't be loaded.");
      },
      () => setError("That day couldn't be loaded."),
    );
  }

  function loadEarlier() {
    if (!earlier) return;

    setError(null);
    startLoading(async () => {
      const month = await loadHistoryMonth(earlier).catch(() => null);
      if (month) setMonths((current) => [...current, month]);
      else setError("That month couldn't be loaded.");
    });
  }

  return (
    <div className="pb-4">
      {months.map(({ month, days }) => {
        const { logged, averageCalories } = monthSummary(days);
        const open = !closedMonths.has(month);

        return (
          <section key={month} className="mx-4 mt-4">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggleMonth(month)}
              className="flex w-full items-center gap-1.5 px-1 pb-1.5 text-left"
            >
              <ChevronRight
                aria-hidden
                className={cn("size-4 shrink-0 text-ios-secondary transition-transform", open && "rotate-90")}
              />
              <span className="flex-1 font-semibold">{monthLabel(month)}</span>
              <span className="text-[13px] text-ios-secondary">
                {averageCalories === null
                  ? "No meals"
                  : `${logged} ${logged === 1 ? "day" : "days"}, avg ${kcal(averageCalories)} kcal`}
              </span>
            </button>
            {open ? (
              <div className="divide-y divide-ios-separator overflow-hidden rounded-[10px] bg-ios-card">
                {days.map((day) => (
                  <DayRow
                    key={day.day}
                    day={day}
                    expanded={openDays.has(day.day)}
                    detail={details[day.day]}
                    onToggle={() => toggleDay(day.day)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}

      {error ? (
        <p role="alert" className="px-8 pt-3 text-center text-[13px] text-ios-red">
          {error}
        </p>
      ) : null}

      {earlier ? (
        <div className="mx-4 mt-4 overflow-hidden rounded-[10px] bg-ios-card">
          <button
            type="button"
            disabled={isLoading}
            onClick={loadEarlier}
            className="h-11 w-full text-ios-blue active:bg-ios-fill disabled:text-ios-tertiary"
          >
            {isLoading ? "Loading…" : `Load ${monthLabel(earlier)}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
