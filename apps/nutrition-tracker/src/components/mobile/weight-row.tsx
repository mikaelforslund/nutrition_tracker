"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveWeight } from "@/app/actions";
import { parseDecimal } from "@/lib/nutrition/manual-meal";

export function WeightRow({ latest }: { latest: number | null }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    startSaving(async () => {
      const result = await saveWeight(parseDecimal(value)).catch(() => null);
      if (result?.status === "saved") {
        setValue("");
        setMessage("Saved");
      } else {
        setMessage(result?.message ?? "That weight couldn't be saved.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-11 items-center gap-3 px-4">
      <label htmlFor="weight" className="flex-1">
        Today&apos;s Weight
      </label>
      <input
        id="weight"
        inputMode="decimal"
        required
        value={value}
        placeholder={latest === null ? "kg" : `${latest} kg`}
        onChange={(event) => setValue(event.target.value)}
        className="w-24 bg-transparent py-2.5 text-right text-ios-secondary outline-none placeholder:text-ios-tertiary"
      />
      <button type="submit" disabled={isSaving || !value} className="font-semibold text-ios-blue disabled:text-ios-tertiary">
        {isSaving ? "Saving" : "Save"}
      </button>
      {message ? <span role="status" className="sr-only">{message}</span> : null}
    </form>
  );
}
