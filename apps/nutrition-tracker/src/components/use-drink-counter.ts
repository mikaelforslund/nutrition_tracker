"use client";

import { useOptimistic, useState, useTransition } from "react";
import { changeDrink } from "@/app/actions";
import { MAX_GLASSES, type DrinkType } from "@/lib/nutrition/drinks";

/** Counts up and down at once, so quick taps never wait on the server. */
export function useDrinkCounter({
  drinkType,
  day,
  glasses,
  asUserId,
}: {
  drinkType: DrinkType;
  day: string;
  glasses: number;
  asUserId?: string;
}) {
  const [shown, addChange] = useOptimistic(glasses, (current, change: 1 | -1) =>
    Math.min(Math.max(current + change, 0), MAX_GLASSES),
  );
  const [failed, setFailed] = useState(false);
  const [, startChanging] = useTransition();

  function change(by: 1 | -1) {
    setFailed(false);
    startChanging(async () => {
      addChange(by);
      const result = await changeDrink({ drinkType, day, change: by }, asUserId).catch(() => null);
      if (result?.status !== "saved") setFailed(true);
    });
  }

  return { shown, failed, change, canAdd: shown < MAX_GLASSES, canRemove: shown > 0 };
}
