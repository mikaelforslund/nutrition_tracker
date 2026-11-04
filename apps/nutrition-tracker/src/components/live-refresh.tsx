"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const CHECK_INTERVAL_MS = 3000;
/** Keeps time-based text like "Active now" honest when no data is changing. */
const FULL_REFRESH_INTERVAL_MS = 60_000;

/** Reloads server data when it changes. Open forms and other client state are kept. */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastVersion: string | null = null;

    async function check() {
      if (document.hidden) return;

      const response = await fetch("/api/dashboard/version", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;

      const { version } = (await response.json()) as { version: string };
      if (lastVersion !== null && version !== lastVersion) router.refresh();
      lastVersion = version;
    }

    void check();
    const checkTimer = setInterval(check, CHECK_INTERVAL_MS);
    const refreshTimer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, FULL_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(checkTimer);
      clearInterval(refreshTimer);
    };
  }, [router]);

  return null;
}
