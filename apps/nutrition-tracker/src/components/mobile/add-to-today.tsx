"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pasteFoodLog } from "@/app/actions";

export function AddToToday({ mealId, today }: { mealId: string; today: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();

  function add() {
    setError(null);
    startAdding(async () => {
      const result = await pasteFoodLog(mealId, today).catch(() => null);
      if (result?.status === "saved") {
        router.push("/m");
      } else {
        setError(result?.message ?? "The meal couldn't be added.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isAdding}
        onClick={add}
        className="h-11 w-full text-ios-blue active:bg-ios-fill disabled:text-ios-tertiary"
      >
        {isAdding ? "Adding" : "Add to Today"}
      </button>
      {error ? (
        <p role="alert" className="px-4 py-2 text-[13px] text-ios-red">
          {error}
        </p>
      ) : null}
    </>
  );
}
