"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pasteFoodLog } from "@/app/actions";
import { dayLabel } from "@/lib/nutrition/group-logs";

export function AddToDay({ mealId, today }: { mealId: string; today: string }) {
  const router = useRouter();
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const day = pickedDay ?? today;
  const [result, setResult] = useState<{ error?: string; addedTo?: string }>({});
  const [isAdding, startAdding] = useTransition();

  function add() {
    setResult({});
    startAdding(async () => {
      const saved = await pasteFoodLog(mealId, day).catch(() => null);
      if (saved?.status !== "saved") {
        setResult({ error: saved?.message ?? "The meal couldn't be added." });
      } else if (day === today) {
        router.push("/m");
      } else {
        // Stays here, so the meal can go on other missed days too.
        setResult({ addedTo: dayLabel(day, today) });
      }
    });
  }

  return (
    <>
      <label className="flex min-h-11 items-center justify-between gap-3 px-4">
        <span>Day</span>
        <input
          type="date"
          aria-label="Day"
          max={today}
          value={day}
          onChange={(event) => setPickedDay(event.target.value)}
          className="min-w-0 bg-transparent text-right text-ios-secondary outline-none"
        />
      </label>
      <button
        type="button"
        disabled={isAdding || !day}
        onClick={add}
        className="h-11 w-full text-ios-blue active:bg-ios-fill disabled:text-ios-tertiary"
      >
        {isAdding ? "Adding" : day ? `Add to ${dayLabel(day, today)}` : "Pick a day"}
      </button>
      {result.error ? (
        <p role="alert" className="px-4 py-2 text-[13px] text-ios-red">
          {result.error}
        </p>
      ) : null}
      {result.addedTo ? (
        <p role="status" className="px-4 py-2 text-[13px] text-ios-secondary">
          Added to {result.addedTo}
        </p>
      ) : null}
    </>
  );
}
