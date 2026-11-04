const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export type SessionTimes = {
  createdAt: Date;
  lastSeenAt: Date;
  endedAt: Date | null;
};

export type SessionStatus = "active" | "inactive" | "ended";
export type SessionSort = "newest" | "oldest";

export function sessionStatus(session: SessionTimes, now: number): SessionStatus {
  if (session.endedAt) return "ended";
  return now - session.lastSeenAt.getTime() < ACTIVE_WINDOW_MS ? "active" : "inactive";
}

/** From the start until it ended, or until it was last used if it hasn't. */
export function sessionDurationMs(session: SessionTimes): number {
  const end = session.endedAt ?? session.lastSeenAt;
  return Math.max(end.getTime() - session.createdAt.getTime(), 0);
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "Under 1 min";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;

  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days} d ${hours % 24} h` : `${days} d`;
}

export function sortSessions<T extends SessionTimes>(sessions: readonly T[], sort: SessionSort): T[] {
  const direction = sort === "newest" ? -1 : 1;
  return [...sessions].sort(
    (a, b) => direction * (a.createdAt.getTime() - b.createdAt.getTime()),
  );
}
