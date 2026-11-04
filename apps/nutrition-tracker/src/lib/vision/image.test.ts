import { describe, expect, it } from "vitest";
import { isAllowedImageUrl, sniffImageFormat } from "./image";

describe("sniffImageFormat", () => {
  it("recognises supported formats from their leading bytes", () => {
    expect(sniffImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.extension).toBe("jpg");
    expect(
      sniffImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.extension,
    ).toBe("png");
    expect(sniffImageFormat(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))?.extension).toBe("webp");
  });

  it("rejects other content", () => {
    expect(sniffImageFormat(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageFormat(new Uint8Array())).toBeNull();
  });
});

describe("isAllowedImageUrl", () => {
  const hosts = ["images.example.com"];

  it("accepts https URLs on an allowed host", () => {
    expect(isAllowedImageUrl("https://images.example.com/a.jpg", hosts)).toBe(true);
    expect(isAllowedImageUrl("https://IMAGES.example.com:443/a.jpg", hosts)).toBe(true);
  });

  it.each([
    ["plain http", "http://images.example.com/a.jpg"],
    ["unlisted host", "https://evil.example.com/a.jpg"],
    ["suffix trick", "https://images.example.com.evil.net/a.jpg"],
    ["userinfo trick", "https://images.example.com@evil.net/a.jpg"],
    ["embedded credentials", "https://user:pass@images.example.com/a.jpg"],
    ["non-standard port", "https://images.example.com:8443/a.jpg"],
    ["cloud metadata", "http://169.254.169.254/computeMetadata/v1/"],
    ["file scheme", "file:///etc/passwd"],
    ["not a URL", "nonsense"],
  ])("rejects %s", (_name, url) => {
    expect(isAllowedImageUrl(url, hosts)).toBe(false);
  });

  it("rejects everything when no hosts are configured", () => {
    expect(isAllowedImageUrl("https://images.example.com/a.jpg", [])).toBe(false);
  });
});
