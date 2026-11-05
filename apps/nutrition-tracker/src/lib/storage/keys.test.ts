import { describe, expect, it } from "vitest";
import { createUploadKey, isOwnUploadUrl, parseUploadKey, uploadKey, uploadUrl } from "./keys";

const owner = "00000000-0000-4000-8000-000000000001";
const stranger = "00000000-0000-4000-8000-000000000002";

describe("upload keys", () => {
  it("round-trips a generated key", () => {
    const key = createUploadKey(owner, "png");
    expect(parseUploadKey(key)).toEqual({ ownerId: owner, contentType: "image/png" });
  });

  it("recognises only the owner's upload URLs", () => {
    const url = uploadUrl(createUploadKey(owner, "jpg"));
    expect(isOwnUploadUrl(url, owner)).toBe(true);
    expect(isOwnUploadUrl(url, stranger)).toBe(false);
    expect(isOwnUploadUrl("https://evil.example.com/a.jpg", owner)).toBe(false);
  });

  it("reads the key from an upload URL, and nothing else", () => {
    const key = createUploadKey(owner, "webp");
    expect(uploadKey(uploadUrl(key))).toBe(key);
    expect(uploadKey("https://images.example.com/a.jpg")).toBeNull();
    expect(uploadKey("/api/uploads/../../etc/passwd")).toBeNull();
  });

  it.each([
    `${owner}/../${stranger}/a.jpg`,
    `../../etc/passwd`,
    `${owner}/${stranger}.svg`,
    `${owner}/${stranger}.jpg/../x`,
  ])("rejects %s", (key) => {
    expect(parseUploadKey(key)).toBeNull();
  });
});
