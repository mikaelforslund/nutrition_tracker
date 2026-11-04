"use client";

import { useActionState, useEffect, useState } from "react";
import { saveWorkout, type ActionResult } from "@/app/actions";
import { WORKOUT_TYPES, type Workout } from "@/lib/nutrition/workouts";
import { formatDuration } from "@/lib/session-summary";
import { Section } from "./ios";

const INITIAL: ActionResult = { status: "idle" };
const ROW_INPUT = "min-w-0 flex-1 bg-transparent py-2.5 text-right text-ios-secondary outline-none placeholder:text-ios-tertiary";

function WorkoutSheet({ today, onClose }: { today: string; onClose: () => void }) {
  const [result, action, isPending] = useActionState(saveWorkout.bind(null, null, undefined), INITIAL);

  useEffect(() => {
    if (result.status === "saved") onClose();
  }, [result, onClose]);

  return (
    <div className="fixed inset-0 z-40 animate-ios-fade bg-black/40 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <form
        action={action}
        role="dialog"
        aria-label="New workout"
        className="flex h-full animate-ios-sheet flex-col overflow-hidden rounded-t-[12px] bg-ios-bg"
      >
        <header className="grid h-14 shrink-0 grid-cols-3 items-center border-b border-ios-separator bg-ios-bar px-4 backdrop-blur-xl">
          <button type="button" onClick={onClose} className="justify-self-start text-ios-blue">
            Cancel
          </button>
          <h2 className="text-center font-semibold">New Workout</h2>
          <button
            type="submit"
            disabled={isPending}
            className="justify-self-end font-semibold text-ios-blue disabled:text-ios-tertiary"
          >
            {isPending ? "Saving" : "Save"}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <div className="mx-4 mt-6 divide-y divide-ios-separator overflow-hidden rounded-[10px] bg-ios-card">
            <label className="flex min-h-11 items-center gap-3 px-4">
              <span className="shrink-0">Type</span>
              <input
                name="workoutType"
                aria-label="Type"
                required
                maxLength={60}
                list="mobile-workout-types"
                placeholder="Running"
                className={ROW_INPUT}
              />
              <datalist id="mobile-workout-types">
                {WORKOUT_TYPES.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </label>
            <label className="flex min-h-11 items-center gap-3 px-4">
              <span className="shrink-0">Duration</span>
              <input
                name="durationMinutes"
                aria-label="Duration"
                required
                inputMode="numeric"
                placeholder="Minutes"
                className={ROW_INPUT}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 px-4">
              <span className="shrink-0">Calories Burned</span>
              <input
                name="caloriesBurned"
                aria-label="Calories Burned"
                required
                inputMode="numeric"
                placeholder="kcal"
                className={ROW_INPUT}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 px-4">
              <span className="shrink-0">Date</span>
              <input
                name="workedOutOn"
                aria-label="Date"
                type="date"
                required
                max={today}
                defaultValue={today}
                className={ROW_INPUT}
              />
            </label>
          </div>
          <p className="mx-8 mt-2 text-[13px] text-ios-secondary">
            Use the calories your watch or fitness app reported.
          </p>
          {result.status === "error" ? (
            <p role="alert" className="mx-8 mt-2 text-[13px] text-ios-red">
              {result.message}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export function WorkoutsSection({ workouts, today }: { workouts: Workout[]; today: string }) {
  const [adding, setAdding] = useState(false);

  return (
    <>
      <Section header="Workouts">
        {workouts.map((workout) => (
          <div key={workout.id} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0">
              <span className="block truncate">{workout.workoutType}</span>
              <span className="block text-[13px] text-ios-secondary">
                {formatDuration(workout.durationMinutes * 60_000)}
              </span>
            </span>
            <span className="shrink-0 text-ios-secondary">
              {workout.caloriesBurned.toLocaleString("en-US")} kcal
            </span>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-11 w-full px-4 text-left text-ios-blue active:bg-ios-fill"
        >
          Add Workout
        </button>
      </Section>
      {adding ? <WorkoutSheet today={today} onClose={() => setAdding(false)} /> : null}
    </>
  );
}
