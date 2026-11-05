"use client";

import { Button, Dialog, Field, Input, StatusLabel, cn } from "@trackerx/ui";
import { Pencil, Trash2 } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { deleteWorkout, saveWorkout, type ActionResult } from "@/app/actions";
import { WORKOUT_TYPES, type Workout } from "@/lib/nutrition/workouts";
import { formatDuration } from "@/lib/session-summary";

const INITIAL: ActionResult = { status: "idle" };
const MINUTE_MS = 60_000;
const ICON_BUTTON =
  "rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-accent";

const longDate = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function WorkoutDialog({
  workout,
  today,
  asUserId,
  onClose,
}: {
  workout: Workout | null;
  today: string;
  asUserId?: string;
  onClose: () => void;
}) {
  const [result, action, isPending] = useActionState(
    saveWorkout.bind(null, workout?.id ?? null, asUserId),
    INITIAL,
  );

  useEffect(() => {
    if (result.status === "saved") onClose();
  }, [result, onClose]);

  return (
    <Dialog open onClose={onClose} title={workout ? "Edit workout" : "Add workout"}>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Workout type">
          <Input
            name="workoutType"
            required
            maxLength={60}
            list="workout-types"
            defaultValue={workout?.workoutType ?? ""}
            placeholder="Running"
          />
          <datalist id="workout-types">
            {WORKOUT_TYPES.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (minutes)">
            <Input
              name="durationMinutes"
              type="number"
              required
              min="1"
              max="1440"
              defaultValue={workout?.durationMinutes ?? ""}
            />
          </Field>
          <Field label="Calories burned">
            <Input
              name="caloriesBurned"
              type="number"
              required
              min="0"
              max="10000"
              defaultValue={workout?.caloriesBurned ?? ""}
            />
          </Field>
        </div>
        <Field label="Date">
          <Input name="workedOutOn" type="date" required max={today} defaultValue={workout?.day ?? today} />
        </Field>
        {result.status === "error" ? (
          <p role="alert">
            <StatusLabel tone="critical">{result.message}</StatusLabel>
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving" : "Save workout"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteWorkout({ workout, asUserId }: { workout: Workout; asUserId?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete() {
    setFailed(false);
    startDeleting(async () => {
      const result = await deleteWorkout(workout.id, asUserId).catch(() => null);
      if (result?.status !== "saved") {
        setFailed(true);
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        aria-label={failed ? `Couldn't delete ${workout.workoutType}. Try again` : `Delete ${workout.workoutType}`}
        title={failed ? "Couldn't delete. Try again" : "Delete"}
        onClick={() => setConfirming(true)}
        className={cn(ICON_BUTTON, "hover:text-status-critical-ink", failed && "text-status-critical-ink")}
      >
        <Trash2 aria-hidden className="size-4" />
      </button>
    );
  }

  return (
    <span className="flex items-center justify-end gap-2 text-xs font-medium whitespace-nowrap">
      <button
        type="button"
        autoFocus
        disabled={isDeleting}
        onClick={handleDelete}
        className="text-status-critical-ink hover:underline disabled:opacity-50"
      >
        {isDeleting ? "Deleting" : "Delete"}
      </button>
      <button
        type="button"
        disabled={isDeleting}
        onClick={() => setConfirming(false)}
        className="text-zinc-500 hover:underline disabled:opacity-50"
      >
        Keep
      </button>
    </span>
  );
}

export function WorkoutsPanel({
  workouts,
  today,
  asUserId,
}: {
  workouts: Workout[];
  today: string;
  asUserId?: string;
}) {
  const [dialog, setDialog] = useState<{ workout: Workout | null } | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setDialog({ workout: null })} className="h-8 px-2.5 text-xs">
          Add workout
        </Button>
      </div>

      {workouts.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No workouts yet.</p>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Workouts list"
          className="max-h-[28rem] overflow-y-auto focus-visible:outline-2 focus-visible:outline-accent"
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-white text-xs text-zinc-500">
              <tr>
                <th scope="col" className="border-b border-zinc-200 py-2 pr-2 text-left font-medium">Date</th>
                <th scope="col" className="border-b border-zinc-200 px-2 py-2 text-left font-medium">Workout</th>
                <th scope="col" className="border-b border-zinc-200 px-2 py-2 text-right font-medium">Duration</th>
                <th scope="col" className="border-b border-zinc-200 px-2 py-2 text-right font-medium">Calories burned</th>
                <th scope="col" className="w-20 border-b border-zinc-200 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((workout) => (
                <tr key={workout.id}>
                  <td className="border-b border-zinc-100 py-2 pr-2 whitespace-nowrap text-zinc-600">
                    {workout.day === today ? "Today" : longDate(workout.day)}
                  </td>
                  <td className="border-b border-zinc-100 px-2 py-2 font-medium text-zinc-900">{workout.workoutType}</td>
                  <td className="border-b border-zinc-100 px-2 py-2 text-right whitespace-nowrap tabular-nums">
                    {formatDuration(workout.durationMinutes * MINUTE_MS)}
                  </td>
                  <td className="border-b border-zinc-100 px-2 py-2 text-right whitespace-nowrap tabular-nums">
                    {workout.caloriesBurned.toLocaleString("en-US")} kcal
                  </td>
                  <td className="border-b border-zinc-100 py-1 pl-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        aria-label={`Edit ${workout.workoutType}`}
                        title="Edit"
                        onClick={() => setDialog({ workout })}
                        className={cn(ICON_BUTTON, "hover:text-zinc-900")}
                      >
                        <Pencil aria-hidden className="size-4" />
                      </button>
                      <DeleteWorkout workout={workout} asUserId={asUserId} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog ? (
        <WorkoutDialog
          key={dialog.workout?.id ?? "new"}
          workout={dialog.workout}
          today={today}
          asUserId={asUserId}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  );
}
