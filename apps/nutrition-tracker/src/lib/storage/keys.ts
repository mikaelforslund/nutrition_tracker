import { randomUUID } from "node:crypto";

const UPLOAD_PREFIX = "/api/uploads/";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const KEY_PATTERN = new RegExp(`^(${UUID})/${UUID}\\.(jpg|png|webp)$`);

const CONTENT_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export function createUploadKey(userId: string, extension: keyof typeof CONTENT_TYPES): string {
  return `${userId}/${randomUUID()}.${extension}`;
}

/** Parses a storage key. The strict shape also rules out path traversal. */
export function parseUploadKey(key: string) {
  const match = KEY_PATTERN.exec(key);
  if (!match) return null;

  const [, ownerId, extension] = match as unknown as [string, string, keyof typeof CONTENT_TYPES];
  return { ownerId, contentType: CONTENT_TYPES[extension] };
}

export function uploadUrl(key: string): string {
  return `${UPLOAD_PREFIX}${key}`;
}

/** Returns the storage key behind an upload URL, if it belongs to this user. */
export function ownUploadKey(url: string, userId: string): string | null {
  if (!url.startsWith(UPLOAD_PREFIX)) return null;

  const key = url.slice(UPLOAD_PREFIX.length);
  return parseUploadKey(key)?.ownerId === userId ? key : null;
}

/** Returns the storage key behind any upload URL, whoever owns it. */
export function uploadKey(url: string): string | null {
  if (!url.startsWith(UPLOAD_PREFIX)) return null;

  const key = url.slice(UPLOAD_PREFIX.length);
  return parseUploadKey(key) ? key : null;
}

export function isOwnUploadUrl(url: string, userId: string): boolean {
  return ownUploadKey(url, userId) !== null;
}
