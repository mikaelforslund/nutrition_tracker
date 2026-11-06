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

export type SessionGroup = { id: string; name: string };

/** Sessions whose person isn't in any group have this key instead of a group's id. */
export const UNGROUPED = "ungrouped";

export type GroupedSessions<T> = {
  /** Null for the people in no group. */
  group: SessionGroup | null;
  key: string;
  sessions: T[];
};

/**
 * Sessions under their groups, keeping the order they arrive in, with the ungrouped
 * last. Empty parents stay, since they're where people get dragged to.
 */
export function groupSessions<T extends { groupId: string | null }>(
  sessions: readonly T[],
  groups: readonly SessionGroup[],
): GroupedSessions<T>[] {
  const known = new Set(groups.map(({ id }) => id));
  const ungrouped = sessions.filter(({ groupId }) => groupId === null || !known.has(groupId));

  const parents: GroupedSessions<T>[] = groups.map((group) => ({
    group,
    key: group.id,
    sessions: sessions.filter(({ groupId }) => groupId === group.id),
  }));

  return [...parents, { group: null, key: UNGROUPED, sessions: ungrouped }];
}

/** People, not rows: someone on two devices has two sessions but is one user. */
export function countUsers(sessions: readonly { userId: string }[]): number {
  return new Set(sessions.map(({ userId }) => userId)).size;
}

/** Such as "3 users, 1 active". */
export function groupSummary(sessions: readonly (SessionTimes & { userId: string })[], now: number): string {
  const active = countUsers(sessions.filter((session) => sessionStatus(session, now) === "active"));
  const users = countUsers(sessions);
  const count = `${users} ${users === 1 ? "user" : "users"}`;
  return active > 0 ? `${count}, ${active} active` : count;
}
