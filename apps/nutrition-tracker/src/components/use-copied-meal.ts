"use client";

import { useSyncExternalStore } from "react";

export type CopiedMeal = { id: string; foodName: string };

const STORAGE_KEY = "trackerx.copied-meal";
const CHANGE_EVENT = "trackerx:copied-meal";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function write(value: string | null) {
  if (value === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Kept in the browser, so it survives reloads and switching between people. */
export function useCopiedMeal() {
  const stored = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => null,
  );

  return {
    copied: stored ? (JSON.parse(stored) as CopiedMeal) : null,
    copy: (meal: CopiedMeal) => write(JSON.stringify(meal)),
    clear: () => write(null),
  };
}
