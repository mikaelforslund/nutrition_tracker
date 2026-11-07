"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveWeight } from "@/app/actions";
import type { ChartPoint } from "@/lib/nutrition/chart";
import { parseDecimal } from "@/lib/nutrition/manual-meal";

export function WeightRow({ today, weights }: { today: string; weights: ChartPoint[] }) {
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const day = pickedDay ?? today;
  const recorded = weights.find((entry) => entry.day === day);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFailed(false);

    startSaving(async () => {
      const result = await saveWeight(parseDecimal(value), day).catch(() => null);
      if (result?.status === "saved") {
        setValue("");
        setMessage("Saved");
      } else {
        setFailed(true);
        setMessage(result?.message ?? "That weight couldn't be saved.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-ios-separator">
      <div className="flex min-h-11 items-center gap-3 px-4">
        <label htmlFor="weight" className="flex-1">
          Weight
        </label>
        <input
          id="weight"
          inputMode="decimal"
          required
          value={value}
          placeholder={recorded ? `${recorded.value} kg` : "kg"}
          onChange={(event) => setValue(event.target.value)}
          className="w-24 bg-transparent py-2.5 text-right text-ios-secondary outline-none placeholder:text-ios-tertiary"
        />
        <button
          type="submit"
          disabled={isSaving || !value || !day}
          className="font-semibold text-ios-blue disabled:text-ios-tertiary"
        >
          {isSaving ? "Saving" : "Save"}
        </button>
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3 px-4">
        <span>Date</span>
        <input
          type="date"
          aria-label="Weight date"
          max={today}
          value={day}
          onChange={(event) => {
            setPickedDay(event.target.value);
            setMessage(null);
            setFailed(false);
          }}
          className="min-w-0 bg-transparent text-right text-ios-secondary outline-none"
        />
      </label>
      {message ? (
        <p
          role={failed ? "alert" : "status"}
          className={failed ? "px-4 py-2 text-[13px] text-ios-red" : "sr-only"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
